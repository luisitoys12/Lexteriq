/**
 * Lexteriq — Background Service Worker (MV3)
 * Maneja: YouTube API calls, Firebase Auth tokens, mensajes desde content scripts
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// ─── Configuración Firebase ───────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  // REEMPLAZA con tu config de Firebase Console
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROJECT.firebaseapp.com",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_PROJECT.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const LEXTERIQ_API_BASE = 'https://lexteriq-api.web.app/api';

// ─── Estado global ─────────────────────────────────────────────────────────
let currentUser = null;
let authToken = null;

// ─── Listener de mensajes desde content scripts ───────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_VIDEO_DATA':
      handleGetVideoData(message.videoId, sendResponse);
      return true; // async

    case 'GET_CHANNEL_DATA':
      handleGetChannelData(message.channelId, sendResponse);
      return true;

    case 'GET_AUTH_STATUS':
      sendResponse({ isLoggedIn: !!currentUser, user: currentUser });
      break;

    case 'SIGN_IN_GOOGLE':
      handleGoogleSignIn(sendResponse);
      return true;

    case 'SIGN_OUT':
      handleSignOut(sendResponse);
      return true;

    case 'GET_KEYWORD_IDEAS':
      handleGetKeywordIdeas(message.query, sendResponse);
      return true;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

// ─── YouTube API: Datos del video ─────────────────────────────────────────
async function handleGetVideoData(videoId, sendResponse) {
  try {
    const token = await getYouTubeToken();
    if (!token) {
      sendResponse({ error: 'No auth token', needsLogin: true });
      return;
    }

    const [videoData, statsData] = await Promise.all([
      fetchYouTubeAPI('videos', {
        part: 'snippet,statistics,contentDetails,status,topicDetails',
        id: videoId
      }, token),
      fetchYouTubeAPI('videos', {
        part: 'statistics',
        id: videoId
      }, token)
    ]);

    if (!videoData.items || videoData.items.length === 0) {
      sendResponse({ error: 'Video not found' });
      return;
    }

    const video = videoData.items[0];
    const processed = processVideoData(video);
    
    // Cache en storage local
    await chrome.storage.local.set({
      [`video_${videoId}`]: { data: processed, timestamp: Date.now() }
    });

    sendResponse({ success: true, data: processed });
  } catch (err) {
    console.error('[Lexteriq] Error fetching video data:', err);
    sendResponse({ error: err.message });
  }
}

// ─── YouTube API: Datos del canal ─────────────────────────────────────────
async function handleGetChannelData(channelId, sendResponse) {
  try {
    const token = await getYouTubeToken();
    if (!token) {
      sendResponse({ error: 'No auth token', needsLogin: true });
      return;
    }

    const channelData = await fetchYouTubeAPI('channels', {
      part: 'snippet,statistics,brandingSettings',
      id: channelId
    }, token);

    if (!channelData.items || channelData.items.length === 0) {
      sendResponse({ error: 'Channel not found' });
      return;
    }

    const channel = channelData.items[0];
    const processed = processChannelData(channel);

    sendResponse({ success: true, data: processed });
  } catch (err) {
    console.error('[Lexteriq] Error fetching channel data:', err);
    sendResponse({ error: err.message });
  }
}

// ─── Keyword Ideas via Lexteriq API (Firebase Function) ──────────────────
async function handleGetKeywordIdeas(query, sendResponse) {
  try {
    const cached = await chrome.storage.local.get(`kw_${query}`);
    if (cached[`kw_${query}`]) {
      const { data, timestamp } = cached[`kw_${query}`];
      if (Date.now() - timestamp < 3600000) { // 1hr cache
        sendResponse({ success: true, data, cached: true });
        return;
      }
    }

    const res = await fetch(`${LEXTERIQ_API_BASE}/keywords?q=${encodeURIComponent(query)}`, {
      headers: { 'Authorization': `Bearer ${authToken || ''}` }
    });
    const data = await res.json();

    await chrome.storage.local.set({
      [`kw_${query}`]: { data, timestamp: Date.now() }
    });

    sendResponse({ success: true, data });
  } catch (err) {
    sendResponse({ error: err.message });
  }
}

// ─── Google OAuth Sign In ─────────────────────────────────────────────────
async function handleGoogleSignIn(sendResponse) {
  try {
    const token = await chrome.identity.getAuthToken({ interactive: true });
    authToken = token.token;
    
    const userInfoRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    currentUser = await userInfoRes.json();
    
    await chrome.storage.sync.set({ user: currentUser, authToken });
    sendResponse({ success: true, user: currentUser });
  } catch (err) {
    sendResponse({ error: err.message });
  }
}

async function handleSignOut(sendResponse) {
  if (authToken) {
    await chrome.identity.removeCachedAuthToken({ token: authToken });
  }
  currentUser = null;
  authToken = null;
  await chrome.storage.sync.clear();
  sendResponse({ success: true });
}

// ─── Helpers ──────────────────────────────────────────────────────────────
async function getYouTubeToken() {
  if (authToken) return authToken;
  const stored = await chrome.storage.sync.get('authToken');
  if (stored.authToken) {
    authToken = stored.authToken;
    return authToken;
  }
  return null;
}

async function fetchYouTubeAPI(endpoint, params, token) {
  const url = new URL(`${YOUTUBE_API_BASE}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
  return res.json();
}

function processVideoData(video) {
  const { snippet, statistics, contentDetails } = video;
  const tags = snippet.tags || [];
  const title = snippet.title || '';
  const description = snippet.description || '';

  // SEO Score calculation
  let seoScore = 0;
  if (title.length >= 30 && title.length <= 60) seoScore += 20;
  else if (title.length > 0) seoScore += 10;
  if (description.length >= 200) seoScore += 20;
  else if (description.length >= 100) seoScore += 10;
  if (tags.length >= 10) seoScore += 20;
  else if (tags.length >= 5) seoScore += 10;
  if (tags.length > 0) seoScore += 10; // has any tags
  if (snippet.thumbnails?.maxres) seoScore += 15;
  if (description.includes('http')) seoScore += 15; // has links

  // Keywords from title + description
  const titleWords = extractKeywords(title);
  const descWords = extractKeywords(description.substring(0, 500));

  return {
    id: video.id,
    title,
    description: description.substring(0, 300),
    publishedAt: snippet.publishedAt,
    channelId: snippet.channelId,
    channelTitle: snippet.channelTitle,
    thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
    tags,
    seoScore: Math.min(100, seoScore),
    stats: {
      views: parseInt(statistics.viewCount || 0),
      likes: parseInt(statistics.likeCount || 0),
      comments: parseInt(statistics.commentCount || 0),
      engagementRate: calculateEngagement(statistics)
    },
    duration: parseDuration(contentDetails?.duration),
    keywords: [...new Set([...titleWords, ...descWords])].slice(0, 15),
    titleLength: title.length,
    descriptionLength: description.length,
    tagCount: tags.length
  };
}

function processChannelData(channel) {
  const { snippet, statistics } = channel;
  return {
    id: channel.id,
    title: snippet.title,
    description: snippet.description?.substring(0, 200),
    thumbnail: snippet.thumbnails?.high?.url,
    country: snippet.country,
    stats: {
      subscribers: parseInt(statistics.subscriberCount || 0),
      videos: parseInt(statistics.videoCount || 0),
      totalViews: parseInt(statistics.viewCount || 0)
    }
  };
}

function extractKeywords(text) {
  const stopWords = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','is','are','was','were','be','been','have','has','had','do','does','did','will','would','could','should','may','might','que','de','el','la','los','las','en','con','por','para','una','un']);
  return text.toLowerCase()
    .replace(/[^a-z0-9áéíóúñü ]/g, ' ')
    .split(' ')
    .filter(w => w.length > 3 && !stopWords.has(w))
    .slice(0, 20);
}

function calculateEngagement(stats) {
  const views = parseInt(stats.viewCount || 1);
  const likes = parseInt(stats.likeCount || 0);
  const comments = parseInt(stats.commentCount || 0);
  return (((likes + comments) / views) * 100).toFixed(2);
}

function parseDuration(iso) {
  if (!iso) return '0:00';
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  const h = parseInt(match?.[1] || 0);
  const m = parseInt(match?.[2] || 0);
  const s = parseInt(match?.[3] || 0);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

// Inicializar: restaurar sesión guardada
chrome.storage.sync.get(['user', 'authToken'], (result) => {
  if (result.user) currentUser = result.user;
  if (result.authToken) authToken = result.authToken;
  console.log('[Lexteriq] Background worker iniciado. Usuario:', currentUser?.name || 'No autenticado');
});
