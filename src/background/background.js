// ============================================
// LEXTERIQ - Background Service Worker
// Manifest V3 | Supabase + YouTube Data API
// ============================================

import { SUPABASE_URL, SUPABASE_ANON_KEY, PLANS, BETA_CONFIG } from '../config/supabase.js';

const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

// ---- SUPABASE HELPERS ----
async function supabaseRequest(endpoint, method = 'GET', body = null, googleId = null) {
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
  if (googleId) headers['x-app-google-id'] = googleId;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });
  return res.json();
}

// ---- AUTH: Google OAuth via chrome.identity ----
async function getGoogleToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
      resolve(token);
    });
  });
}

async function getGoogleUserInfo(token) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.json();
}

async function loginOrCreateUser(token) {
  const userInfo = await getGoogleUserInfo(token);
  // Upsert user in Supabase
  const users = await supabaseRequest(
    `users?google_id=eq.${userInfo.id}&select=*`,
    'GET'
  );
  if (users.length === 0) {
    // New user — create with free plan
    const newUser = await supabaseRequest('users', 'POST', {
      google_id: userInfo.id,
      email: userInfo.email,
      display_name: userInfo.name,
      avatar_url: userInfo.picture,
      plan_id: 'free',
      is_beta_user: false
    });
    return newUser[0];
  }
  return users[0];
}

// ---- INVITE CODE VALIDATION ----
async function validateInviteCode(code) {
  const invites = await supabaseRequest(
    `invitations?code=eq.${encodeURIComponent(code)}&is_active=eq.true&select=*`
  );
  if (!invites.length) return { valid: false, error: 'Código inválido o expirado' };
  const invite = invites[0];
  if (invite.used_count >= invite.max_uses) return { valid: false, error: 'Código agotado' };
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) return { valid: false, error: 'Código expirado' };
  return { valid: true, invite };
}

async function activateBetaUser(userId, inviteCode) {
  // Start 14-day trial
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);
  await supabaseRequest('trials', 'POST', {
    user_id: userId,
    plan_id: 'pro',
    ends_at: trialEnd.toISOString(),
    is_active: true
  });
  // Update user
  await supabaseRequest(`users?id=eq.${userId}`, 'PATCH', {
    is_beta_user: true,
    invite_code_used: inviteCode,
    plan_id: 'pro',
    trial_started_at: new Date().toISOString(),
    trial_ends_at: trialEnd.toISOString()
  });
  // Increment invite usage
  const invite = await supabaseRequest(`invitations?code=eq.${encodeURIComponent(inviteCode)}&select=used_count`);
  if (invite.length) {
    await supabaseRequest(`invitations?code=eq.${encodeURIComponent(inviteCode)}`, 'PATCH', {
      used_count: invite[0].used_count + 1
    });
  }
}

// ---- YOUTUBE DATA API ----
async function fetchVideoData(videoId, token) {
  // Check cache first
  const cache = await supabaseRequest(
    `youtube_cache?video_id=eq.${videoId}&select=data,expires_at`
  );
  if (cache.length && new Date(cache[0].expires_at) > new Date()) {
    return cache[0].data;
  }

  // Fetch from YouTube API
  const [videoRes, channelRes] = await Promise.all([
    fetch(`${YT_API_BASE}/videos?part=snippet,statistics,contentDetails&id=${videoId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
    fetch(`${YT_API_BASE}/videos?part=snippet&id=${videoId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
  ]);
  const videoData = await videoRes.json();
  if (!videoData.items?.length) return null;

  const video = videoData.items[0];
  const snippet = video.snippet;
  const stats = video.statistics;

  // Calculate SEO score
  const seoScore = calculateSEOScore(snippet, stats);

  const result = {
    videoId,
    title: snippet.title,
    description: snippet.description,
    tags: snippet.tags || [],
    channelId: snippet.channelId,
    channelTitle: snippet.channelTitle,
    publishedAt: snippet.publishedAt,
    viewCount: parseInt(stats.viewCount || 0),
    likeCount: parseInt(stats.likeCount || 0),
    commentCount: parseInt(stats.commentCount || 0),
    seoScore,
    keywords: extractKeywords(snippet.title, snippet.description, snippet.tags)
  };

  // Cache result for 2 hours
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 2);
  await supabaseRequest(
    `youtube_cache?video_id=eq.${videoId}`,
    'DELETE'
  );
  await supabaseRequest('youtube_cache', 'POST', {
    video_id: videoId,
    data: result,
    expires_at: expiresAt.toISOString()
  });

  return result;
}

function calculateSEOScore(snippet, stats) {
  let score = 0;
  // Title length (ideal 40-70 chars)
  const titleLen = snippet.title?.length || 0;
  if (titleLen >= 40 && titleLen <= 70) score += 25;
  else if (titleLen >= 20) score += 15;
  // Has tags
  if (snippet.tags?.length >= 5) score += 20;
  else if (snippet.tags?.length > 0) score += 10;
  // Description length
  const descLen = snippet.description?.length || 0;
  if (descLen >= 200) score += 25;
  else if (descLen >= 100) score += 15;
  // Engagement (views/likes ratio)
  const views = parseInt(stats.viewCount || 0);
  const likes = parseInt(stats.likeCount || 0);
  if (views > 0 && (likes / views) > 0.04) score += 30;
  else if (views > 0) score += 15;
  return Math.min(score, 100);
}

function extractKeywords(title, description, tags) {
  const text = `${title} ${description} ${tags?.join(' ')}`.toLowerCase();
  const words = text.match(/\b[a-záéíóúñ]{4,}\b/gi) || [];
  const freq = {};
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }));
}

// ---- MESSAGE HANDLER ----
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg.action === 'LOGIN') {
        const token = await getGoogleToken();
        const user = await loginOrCreateUser(token);
        chrome.storage.local.set({ lexteriq_user: user, lexteriq_token: token });
        sendResponse({ success: true, user });
      }
      else if (msg.action === 'VALIDATE_INVITE') {
        const result = await validateInviteCode(msg.code);
        sendResponse(result);
      }
      else if (msg.action === 'ACTIVATE_BETA') {
        const { user } = await chrome.storage.local.get('lexteriq_user');
        await activateBetaUser(user.id, msg.code);
        sendResponse({ success: true });
      }
      else if (msg.action === 'ANALYZE_VIDEO') {
        const { lexteriq_token, lexteriq_user } = await chrome.storage.local.get(['lexteriq_token', 'lexteriq_user']);
        if (!lexteriq_token) return sendResponse({ error: 'No autenticado' });
        // Check plan limits
        const plan = PLANS[lexteriq_user?.plan_id || 'free'];
        const used = lexteriq_user?.analyses_used_this_month || 0;
        if (plan.analyses_per_month !== -1 && used >= plan.analyses_per_month) {
          return sendResponse({ error: 'Límite mensual alcanzado', upgrade: true });
        }
        const data = await fetchVideoData(msg.videoId, lexteriq_token);
        // Save analysis
        if (data && lexteriq_user) {
          await supabaseRequest('analyses', 'POST', {
            user_id: lexteriq_user.id,
            video_id: msg.videoId,
            video_title: data.title,
            channel_id: data.channelId,
            channel_name: data.channelTitle,
            seo_score: data.seoScore,
            tags: data.tags,
            keywords: data.keywords,
            metrics: { views: data.viewCount, likes: data.likeCount, comments: data.commentCount }
          });
        }
        sendResponse({ success: true, data });
      }
      else if (msg.action === 'GET_USER') {
        const { lexteriq_user } = await chrome.storage.local.get('lexteriq_user');
        sendResponse({ user: lexteriq_user });
      }
    } catch (err) {
      sendResponse({ error: err.message });
    }
  })();
  return true;
});

console.log('[Lexteriq] Background service worker activo v1.0');
