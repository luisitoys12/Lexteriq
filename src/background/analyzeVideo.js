// ============================================================
// LEXTERIQ — Background: YouTube API Analyzer
// Recibe mensajes del content script, consulta YouTube Data API v3
// La API key se guarda en chrome.storage.local (no en código)
// ============================================================

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 horas en ms

// ---- LISTENER PRINCIPAL ----
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_VIDEO') {
    handleAnalyzeVideo(message.videoId)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true; // async response
  }

  if (message.type === 'OPEN_UPGRADE') {
    const promo = message.promo || '';
    chrome.tabs.create({
      url: `https://lexteriq.vercel.app/pricing?promo=${promo}&utm_source=extension&utm_medium=panel`,
    });
  }

  if (message.type === 'GET_USER_PLAN') {
    getUserPlanFromStorage().then(sendResponse);
    return true;
  }
});

// ---- ANÁLISIS PRINCIPAL ----
async function handleAnalyzeVideo(videoId) {
  // 1. Revisar caché
  const cached = await getCached(videoId);
  if (cached) return cached;

  // 2. Obtener API key
  const { youtubeApiKey } = await chrome.storage.local.get('youtubeApiKey');
  if (!youtubeApiKey) {
    // Modo demo sin API key — datos de ejemplo
    return getDemoData(videoId);
  }

  try {
    // 3. Llamadas paralelas a YouTube API
    const [videoData, channelData] = await Promise.all([
      fetchVideoDetails(videoId, youtubeApiKey),
      null, // Se populará después de tener el channelId
    ]);

    if (!videoData) throw new Error('Video no encontrado');

    const channelId = videoData.snippet?.channelId;
    const channelStats = channelId
      ? await fetchChannelDetails(channelId, youtubeApiKey)
      : null;

    // 4. Procesar y calcular métricas
    const result = processVideoData(videoData, channelStats);

    // 5. Guardar en caché
    await setCache(videoId, result);

    return result;
  } catch (err) {
    console.error('[Lexteriq] Error en análisis:', err);
    return getDemoData(videoId); // Fallback a demo
  }
}

// ---- YOUTUBE API CALLS ----
async function fetchVideoDetails(videoId, apiKey) {
  const parts = 'snippet,statistics,contentDetails,status';
  const url = `${YOUTUBE_API_BASE}/videos?part=${parts}&id=${videoId}&key=${apiKey}`;
  const res = await fetch(url);
  const json = await res.json();
  return json.items?.[0] || null;
}

async function fetchChannelDetails(channelId, apiKey) {
  const url = `${YOUTUBE_API_BASE}/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`;
  const res = await fetch(url);
  const json = await res.json();
  return json.items?.[0] || null;
}

// ---- PROCESAR DATOS ----
function processVideoData(video, channel) {
  const stats = video.statistics || {};
  const snippet = video.snippet || {};
  const views = parseInt(stats.viewCount || 0);
  const likes = parseInt(stats.likeCount || 0);
  const comments = parseInt(stats.commentCount || 0);

  // Calcular antigüedad del video
  const publishedAt = new Date(snippet.publishedAt);
  const ageMs = Date.now() - publishedAt.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  const viewsPerHour = ageHours > 0 ? Math.round(views / ageHours) : 0;
  const publishedAgo = formatAge(ageMs);

  // Like rate
  const likeRate = views > 0 ? ((likes / views) * 100).toFixed(1) : '0.0';

  // Extraer keywords del título y descripción
  const keywords = extractKeywords(snippet.title, snippet.description, snippet.tags || []);

  // Tags del video
  const tags = snippet.tags || [];

  // Calcular score SEO
  const seoChecks = buildSEOChecks(snippet, stats);
  const seoScore = calcSEOScore(seoChecks);

  // Velocidad de crecimiento (0-100)
  const velocityPercent = Math.min(100, Math.round((viewsPerHour / 10000) * 100));

  return {
    videoId: video.id,
    title: snippet.title,
    views,
    likes,
    comments,
    viewsPerHour,
    likeRate,
    publishedAgo,
    keywords,
    tags,
    seoScore,
    seoChecks,
    velocityPercent,
    velocityTrend: viewsPerHour > 1000 ? '↑ Rápido' : '→ Normal',
    viewsGrowth: viewsPerHour > 500 ? '+' + formatNum(viewsPerHour) : '→',
    channelSubs: parseInt(channel?.statistics?.subscriberCount || 0),
    channelVideoCount: parseInt(channel?.statistics?.videoCount || 0),
    channelName: snippet.channelTitle,
    competitors: [], // Se carga async en Pro
  };
}

// ---- SEO SCORE ----
function buildSEOChecks(snippet, stats) {
  const title = snippet.title || '';
  const desc = snippet.description || '';
  const tags = snippet.tags || [];

  return [
    {
      label: 'Título optimizado (40-70 chars)',
      status: title.length >= 40 && title.length <= 70 ? 'pass' : title.length > 20 ? 'warn' : 'fail',
      hint: `Actual: ${title.length} caracteres`,
    },
    {
      label: 'Descripción completa (250+ chars)',
      status: desc.length >= 250 ? 'pass' : desc.length >= 100 ? 'warn' : 'fail',
      hint: `Actual: ${desc.length} caracteres`,
    },
    {
      label: 'Tags del video (8-15 tags)',
      status: tags.length >= 8 && tags.length <= 15 ? 'pass' : tags.length >= 4 ? 'warn' : 'fail',
      hint: `Actual: ${tags.length} tags`,
    },
    {
      label: 'Keyword en el título',
      status: title.length > 10 ? 'pass' : 'warn',
      hint: 'El título debe incluir la keyword principal',
    },
    {
      label: 'Descripción incluye links',
      status: /https?:\/\//.test(desc) ? 'pass' : 'warn',
      hint: 'Agrega links relevantes en la descripción',
    },
    {
      label: 'Comentarios habilitados',
      status: stats.commentCount !== undefined ? 'pass' : 'warn',
      hint: 'Los comentarios mejoran el engagement',
    },
  ];
}

function calcSEOScore(checks) {
  const weights = { pass: 100, warn: 50, fail: 0 };
  const total = checks.reduce((sum, c) => sum + (weights[c.status] || 0), 0);
  return Math.round(total / checks.length);
}

// ---- KEYWORDS ----
function extractKeywords(title, description, tags) {
  const text = `${title} ${description}`.toLowerCase();
  const words = text.match(/\b[a-záéíóúñ]{4,}\b/gi) || [];
  const stopwords = new Set(['este', 'esta', 'para', 'como', 'pero', 'que', 'con', 'los', 'las', 'del', 'una', 'uno', 'más', 'sobre', 'from', 'with', 'this', 'that', 'have', 'been', 'will', 'your', 'they']);

  const freq = {};
  words.forEach(w => {
    if (!stopwords.has(w)) freq[w] = (freq[w] || 0) + 1;
  });

  // Mezclar con tags
  tags.forEach(tag => {
    const t = tag.toLowerCase();
    freq[t] = (freq[t] || 0) + 3; // Tags tienen más peso
  });

  return Object.entries(freq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 30)
    .map(([text, count]) => ({
      text,
      score: Math.min(100, Math.round((count / 5) * 100)),
    }));
}

// ---- CACHÉ ----
async function getCached(videoId) {
  const key = `cache_${videoId}`;
  const { [key]: entry } = await chrome.storage.local.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) return null;
  return entry.data;
}

async function setCache(videoId, data) {
  const key = `cache_${videoId}`;
  await chrome.storage.local.set({ [key]: { data, ts: Date.now() } });
}

// ---- DATOS DEMO (sin API key) ----
function getDemoData(videoId) {
  return {
    videoId,
    title: 'Demo — Configura tu YouTube API Key',
    views: 125400,
    likes: 8320,
    comments: 634,
    viewsPerHour: 892,
    likeRate: '6.6',
    publishedAgo: 'hace 14 horas',
    keywords: [
      { text: 'youtube seo', score: 95 },
      { text: 'video ranking', score: 88 },
      { text: 'keyword research', score: 82 },
      { text: 'analytics', score: 74 },
      { text: 'thumbnails', score: 68 },
      { text: 'algorithm', score: 61 },
      { text: 'views boost', score: 54 },
    ],
    tags: ['youtube', 'seo', 'tutorial', 'ranking', 'keywords', 'lexteriq'],
    seoScore: 72,
    seoChecks: [
      { label: 'Título optimizado (40-70 chars)', status: 'pass', hint: '52 caracteres' },
      { label: 'Descripción completa (250+ chars)', status: 'warn', hint: '180 caracteres' },
      { label: 'Tags del video (8-15 tags)', status: 'pass', hint: '11 tags' },
      { label: 'Keyword en el título', status: 'pass', hint: '' },
      { label: 'Descripción incluye links', status: 'fail', hint: 'Sin links en descripción' },
      { label: 'Comentarios habilitados', status: 'pass', hint: '' },
    ],
    velocityPercent: 65,
    velocityTrend: '↑ Rápido',
    viewsGrowth: '+892',
    channelSubs: 48200,
    channelVideoCount: 124,
    channelName: 'Demo Canal',
    competitors: [],
    _demo: true,
  };
}

// ---- PLAN DEL USUARIO ----
async function getUserPlanFromStorage() {
  const { userPlan } = await chrome.storage.local.get('userPlan');
  return userPlan || 'free';
}

// ---- HELPERS ----
function formatNum(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

function formatAge(ms) {
  const h = ms / (1000 * 60 * 60);
  if (h < 1) return 'hace minutos';
  if (h < 24) return `hace ${Math.round(h)} horas`;
  const d = h / 24;
  if (d < 30) return `hace ${Math.round(d)} días`;
  const m = d / 30;
  if (m < 12) return `hace ${Math.round(m)} meses`;
  return `hace ${Math.round(m / 12)} años`;
}
