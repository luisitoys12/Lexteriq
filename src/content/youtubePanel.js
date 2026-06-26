// ============================================================
// LEXTERIQ — YouTube Content Script
// Inyecta el panel lateral de análisis SEO en youtube.com/watch
// ============================================================

import { STRIPE_CONFIG } from '../config/stripe.js';

// ---- CONSTANTES ----
const PANEL_ID = 'lexteriq-root';
const YT_SECONDARY = '#secondary';
const YT_SECONDARY_ALT = '#secondary-inner';
const API_BASE = 'https://lexteriq.vercel.app/api'; // Web app API proxy

// ---- ESTADO GLOBAL DEL PANEL ----
let state = {
  videoId: null,
  data: null,
  loading: false,
  activeTab: 'overview',
  collapsed: false,
  userPlan: 'free',
};

// ---- ENTRY POINT ----
init();

function init() {
  // Observar navegación SPA de YouTube (no recarga la página)
  observeYouTubeNavigation();
  // Intentar montar si ya estamos en /watch
  if (location.pathname === '/watch') {
    mountPanel();
  }
}

// YouTube es SPA — detectar cambios de URL
function observeYouTubeNavigation() {
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      if (location.pathname === '/watch') {
        setTimeout(mountPanel, 800); // Esperar a que cargue el DOM
      } else {
        unmountPanel();
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function unmountPanel() {
  const root = document.getElementById(PANEL_ID);
  if (root) root.remove();
  state.videoId = null;
  state.data = null;
}

async function mountPanel() {
  const videoId = getVideoId();
  if (!videoId || videoId === state.videoId) return;
  state.videoId = videoId;

  // Crear contenedor root
  let root = document.getElementById(PANEL_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = PANEL_ID;
    injectStyles();
  }

  // Encontrar dónde inyectar
  const target = await waitForElement(YT_SECONDARY, 5000) ||
                 await waitForElement(YT_SECONDARY_ALT, 2000);
  if (!target) return;
  target.prepend(root);

  // Renderizar estado loading
  root.innerHTML = buildPanelHTML({ loading: true, plan: state.userPlan });
  attachEvents(root);

  // Cargar datos
  await loadVideoData(videoId, root);
}

function getVideoId() {
  const params = new URLSearchParams(location.search);
  return params.get('v');
}

function waitForElement(selector, timeout = 3000) {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);
    const observer = new MutationObserver(() => {
      const found = document.querySelector(selector);
      if (found) { observer.disconnect(); resolve(found); }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
  });
}

function injectStyles() {
  if (document.getElementById('lexteriq-styles')) return;
  const link = document.createElement('link');
  link.id = 'lexteriq-styles';
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('lexteriq-panel.css');
  document.head.appendChild(link);
}

// ---- CARGAR DATOS REALES ----
async function loadVideoData(videoId, root) {
  state.loading = true;
  try {
    // Pedir al background script (tiene la API key segura)
    const data = await chrome.runtime.sendMessage({
      type: 'ANALYZE_VIDEO',
      videoId,
    });
    state.data = data;
    state.loading = false;
    root.innerHTML = buildPanelHTML({ data, plan: state.userPlan, loading: false });
    attachEvents(root);
    animateScore(root, data.seoScore);
    animateVelocity(root, data.velocityPercent);
  } catch (err) {
    state.loading = false;
    root.innerHTML = buildErrorHTML(err.message);
  }
}

// ---- CONSTRUIR HTML DEL PANEL ----
function buildPanelHTML({ data, plan, loading }) {
  return `
    <div id="lexteriq-panel" class="${state.collapsed ? 'collapsed' : ''}">
      ${buildHeader(plan)}
      ${loading ? buildSkeleton() : buildTabs(data, plan)}
    </div>
  `;
}

function buildHeader(plan) {
  const planBadge = plan === 'pro'
    ? '<span class="lex-badge pro">PRO</span>'
    : plan === 'business'
      ? '<span class="lex-badge pro">BIZ</span>'
      : '<span class="lex-badge free">FREE</span>';
  return `
    <div class="lex-header" id="lex-header-toggle">
      <div class="lex-logo">
        <div class="lex-logo-icon">LX</div>
        <span>Lexteriq</span>
        ${planBadge}
      </div>
      <div class="lex-header-actions">
        <button class="lex-btn-icon" id="lex-refresh" data-lex-tooltip="Refrescar análisis">↻</button>
        <button class="lex-btn-icon" id="lex-collapse" data-lex-tooltip="${state.collapsed ? 'Expandir' : 'Colapsar'}">${state.collapsed ? '▼' : '▲'}</button>
      </div>
    </div>
  `;
}

function buildSkeleton() {
  return `
    <div style="padding:14px">
      <div style="display:flex;gap:12px;margin-bottom:16px">
        <div class="lex-skeleton lex-skel-circle"></div>
        <div style="flex:1">
          <div class="lex-skeleton lex-skel-line w80"></div>
          <div class="lex-skeleton lex-skel-line w60"></div>
          <div class="lex-skeleton lex-skel-line w40"></div>
        </div>
      </div>
      <div class="lex-skeleton lex-skel-line"></div>
      <div class="lex-skeleton lex-skel-line w80"></div>
      <div class="lex-skeleton lex-skel-line w60"></div>
      <div style="height:16px"></div>
      <div class="lex-skeleton lex-skel-line"></div>
      <div class="lex-skeleton lex-skel-line w80"></div>
    </div>
  `;
}

function buildTabs(data, plan) {
  if (!data) return buildErrorHTML('No se pudo cargar el análisis.');
  return `
    <div class="lex-tabs">
      <button class="lex-tab ${state.activeTab === 'overview' ? 'active' : ''}" data-tab="overview">
        <span class="lex-tab-icon">📊</span>Overview
      </button>
      <button class="lex-tab ${state.activeTab === 'keywords' ? 'active' : ''}" data-tab="keywords">
        <span class="lex-tab-icon">🔑</span>Keywords
      </button>
      <button class="lex-tab ${state.activeTab === 'seo' ? 'active' : ''}" data-tab="seo">
        <span class="lex-tab-icon">✅</span>SEO
      </button>
      <button class="lex-tab ${state.activeTab === 'comp' ? 'active' : ''}" data-tab="comp">
        <span class="lex-tab-icon">🏆</span>Comp
      </button>
    </div>
    <div class="lex-content ${state.activeTab === 'overview' ? 'active' : ''}" data-content="overview">
      ${buildOverviewTab(data, plan)}
    </div>
    <div class="lex-content ${state.activeTab === 'keywords' ? 'active' : ''}" data-content="keywords">
      ${buildKeywordsTab(data, plan)}
    </div>
    <div class="lex-content ${state.activeTab === 'seo' ? 'active' : ''}" data-content="seo">
      ${buildSEOTab(data, plan)}
    </div>
    <div class="lex-content ${state.activeTab === 'comp' ? 'active' : ''}" data-content="comp">
      ${buildCompetitorTab(data, plan)}
    </div>
  `;
}

function buildOverviewTab(data, plan) {
  const score = data.seoScore || 0;
  const scoreClass = score >= 80 ? 'excellent' : score >= 65 ? 'good' : score >= 50 ? 'ok' : score >= 35 ? 'poor' : 'bad';
  const scoreLabel = score >= 80 ? 'Excelente' : score >= 65 ? 'Bueno' : score >= 50 ? 'Regular' : score >= 35 ? 'Pobre' : 'Crítico';
  const circumference = 2 * Math.PI * 28; // r=28
  const offset = circumference - (score / 100) * circumference;

  return `
    <div class="lex-score-ring score-${scoreClass}">
      <div class="lex-score-svg-wrapper">
        <svg class="lex-ring-svg" viewBox="0 0 72 72">
          <circle class="lex-ring-track" cx="36" cy="36" r="28"/>
          <circle class="lex-ring-fill" cx="36" cy="36" r="28"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${circumference}"
            id="lex-score-ring"
            data-target-offset="${offset}"
          />
        </svg>
        <div class="lex-ring-number" id="lex-score-number">0</div>
      </div>
      <div class="lex-score-info">
        <h3>Score SEO</h3>
        <span class="lex-score-label label-${scoreClass}">${scoreLabel}</span>
        <p class="lex-score-desc">${getScoreDescription(score)}</p>
      </div>
    </div>

    <div class="lex-metrics-grid">
      ${buildMetricCard('👁️', 'Vistas', formatNumber(data.views), data.viewsGrowth, '24h')}
      ${buildMetricCard('❤️', 'Likes', formatNumber(data.likes), data.likeRate + '%', 'ratio')}
      ${buildMetricCard('💬', 'Comentarios', formatNumber(data.comments), '', '')}
      ${buildMetricCard('⚡', 'Vel/hora', formatNumber(data.viewsPerHour), data.velocityTrend, '/hr')}
    </div>

    <div class="lex-velocity-bar">
      <div class="lex-velocity-label">
        <span>Velocidad de crecimiento</span>
        <span style="color:var(--lex-primary);font-weight:700">${data.velocityPercent || 0}%</span>
      </div>
      <div class="lex-velocity-track">
        <div class="lex-velocity-fill" id="lex-vel-fill" style="width:0%"
             data-target="${data.velocityPercent || 0}"></div>
      </div>
      <div class="lex-velocity-stats">
        <span>Publicado: ${data.publishedAgo}</span>
        <span>${formatNumber(data.viewsPerHour)} views/hora</span>
      </div>
    </div>

    ${plan === 'free' ? buildUpgradeCTA('overview') : ''}
  `;
}

function buildKeywordsTab(data, plan) {
  const visibleKeywords = plan === 'free' ? data.keywords.slice(0, 5) : data.keywords;
  const lockedCount = plan === 'free' ? Math.max(0, data.keywords.length - 5) : 0;

  return `
    <div class="lex-section-title">
      <span>Keywords detectadas</span>
      <span style="color:var(--lex-faint)">${data.keywords.length} total</span>
    </div>
    <div class="lex-keywords-list">
      ${visibleKeywords.map(kw => `
        <div class="lex-keyword-chip">
          ${kw.text}
          <span class="kw-score ${kw.score >= 70 ? 'kw-high' : kw.score >= 40 ? 'kw-med' : 'kw-low'}">${kw.score}</span>
        </div>
      `).join('')}
      ${lockedCount > 0 ? `
        <div class="lex-keyword-locked" id="lex-unlock-kw">
          🔒 +${lockedCount} keywords más → Activa Pro
        </div>
      ` : ''}
    </div>

    <div class="lex-section-title" style="margin-top:14px">
      <span>Tags del video</span>
      <span style="color:var(--lex-faint)">${data.tags?.length || 0} tags</span>
    </div>
    <div class="lex-keywords-list">
      ${(data.tags || []).slice(0, plan === 'free' ? 8 : 50).map(tag => `
        <div class="lex-keyword-chip" style="background:rgba(108,99,255,0.08);border-color:rgba(108,99,255,0.2)">
          ${tag}
        </div>
      `).join('')}
    </div>

    ${plan === 'free' ? buildUpgradeCTA('keywords') : ''}
  `;
}

function buildSEOTab(data, plan) {
  return `
    <div class="lex-section-title">Checklist SEO</div>
    <div class="lex-checklist">
      ${data.seoChecks?.map(check => `
        <div class="lex-check-item">
          <div class="lex-check-icon check-${check.status}">
            ${check.status === 'pass' ? '✓' : check.status === 'warn' ? '!' : '✗'}
          </div>
          <div>
            <div class="lex-check-text">${check.label}</div>
            ${check.hint ? `<div class="lex-check-hint">${check.hint}</div>` : ''}
          </div>
        </div>
      `).join('') || ''}
    </div>

    <div class="lex-section-title" style="margin-top:14px">Info del canal</div>
    <div class="lex-metrics-grid">
      ${buildMetricCard('👥', 'Suscriptores', formatNumber(data.channelSubs), '', '')}
      ${buildMetricCard('📹', 'Videos', formatNumber(data.channelVideoCount), '', '')}
    </div>

    ${plan === 'free' ? buildUpgradeCTA('seo') : ''}
  `;
}

function buildCompetitorTab(data, plan) {
  if (plan === 'free') {
    return `
      <div style="text-align:center;padding:32px 16px">
        <div style="font-size:32px;margin-bottom:12px">🏆</div>
        <h4 style="font-size:14px;font-weight:700;margin-bottom:8px">Análisis de Competencia</h4>
        <p style="font-size:12px;color:var(--lex-muted);margin-bottom:16px;max-width:220px;margin-inline:auto">
          Compara con videos similares, descubre por qué rankean mejor.
        </p>
        ${buildUpgradeCTA('comp')}
      </div>
    `;
  }
  return `
    <div class="lex-section-title">Videos similares que rankean mejor</div>
    ${(data.competitors || []).map(c => `
      <div class="lex-check-item" style="cursor:pointer" onclick="window.open('https://youtube.com/watch?v=${c.videoId}','_blank')">
        <div>
          <div class="lex-check-text">${c.title}</div>
          <div class="lex-check-hint">${formatNumber(c.views)} vistas · Score ${c.seoScore}</div>
        </div>
      </div>
    `).join('') || '<p style="color:var(--lex-faint);font-size:12px">Cargando competidores...</p>'}
  `;
}

function buildUpgradeCTA(context) {
  const messages = {
    overview: { title: '📈 Velocidad detallada', desc: 'Ve métricas horarias y proyecciones a 7 días' },
    keywords: { title: '🔑 Todas las keywords', desc: 'Accede a análisis completo de 100+ keywords' },
    seo:      { title: '🎯 SEO Avanzado', desc: 'Sugerencias personalizadas para mejorar ranking' },
    comp:     { title: '🏆 Análisis competencia', desc: 'Compara con los 10 videos que te ganan el ranking' },
  };
  const msg = messages[context] || messages.overview;
  return `
    <div class="lex-upgrade-card">
      <h4>${msg.title}</h4>
      <p>${msg.desc}</p>
      <button class="lex-btn-upgrade" id="lex-upgrade-btn" data-context="${context}">
        ✨ Prueba Pro 14 días gratis
      </button>
    </div>
  `;
}

function buildMetricCard(icon, label, value, sub, subLabel) {
  const isPositive = typeof sub === 'string' && (sub.startsWith('+') || sub.includes('↑'));
  const isNegative = typeof sub === 'string' && (sub.startsWith('-') || sub.includes('↓'));
  const trendClass = isPositive ? 'trend-up' : isNegative ? 'trend-down' : 'trend-neutral';
  return `
    <div class="lex-metric-card">
      <div class="lex-metric-label">${icon} ${label}</div>
      <div class="lex-metric-value">${value}</div>
      ${sub ? `<div class="lex-metric-trend ${trendClass}">${sub} <span style="color:var(--lex-faint)">${subLabel}</span></div>` : ''}
    </div>
  `;
}

function buildErrorHTML(message) {
  return `
    <div id="lexteriq-panel">
      <div class="lex-header">
        <div class="lex-logo"><div class="lex-logo-icon">LX</div><span>Lexteriq</span></div>
      </div>
      <div style="padding:24px;text-align:center">
        <div style="font-size:24px;margin-bottom:8px">⚠️</div>
        <p style="font-size:12px;color:var(--lex-muted)">${message || 'Error al analizar el video.'}</p>
        <button class="lex-btn-upgrade" style="margin-top:12px" id="lex-retry-btn">Reintentar</button>
      </div>
    </div>
  `;
}

// ---- EVENTOS ----
function attachEvents(root) {
  // Tabs
  root.querySelectorAll('.lex-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      state.activeTab = tab.dataset.tab;
      root.querySelectorAll('.lex-tab').forEach(t => t.classList.remove('active'));
      root.querySelectorAll('.lex-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      root.querySelector(`[data-content="${state.activeTab}"]`)?.classList.add('active');
    });
  });

  // Colapsar/expandir
  root.querySelector('#lex-collapse')?.addEventListener('click', (e) => {
    e.stopPropagation();
    state.collapsed = !state.collapsed;
    root.querySelector('#lexteriq-panel')?.classList.toggle('collapsed', state.collapsed);
  });

  // Refrescar
  root.querySelector('#lex-refresh')?.addEventListener('click', (e) => {
    e.stopPropagation();
    state.videoId = null;
    mountPanel();
  });

  // Upgrade CTA
  root.querySelectorAll('#lex-upgrade-btn, .lex-btn-upgrade').forEach(btn => {
    btn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_UPGRADE', promo: 'LEXBETA2026' });
    });
  });

  // Retry
  root.querySelector('#lex-retry-btn')?.addEventListener('click', () => {
    state.videoId = null;
    mountPanel();
  });

  // Unlock keywords
  root.querySelector('#lex-unlock-kw')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_UPGRADE', promo: 'LEXBETA2026' });
  });
}

// ---- ANIMACIONES ----
function animateScore(root, targetScore) {
  const ring = root.querySelector('#lex-score-ring');
  const numberEl = root.querySelector('#lex-score-number');
  if (!ring || !numberEl) return;

  const circumference = 2 * Math.PI * 28;
  const targetOffset = circumference - (targetScore / 100) * circumference;
  let current = 0;
  const duration = 1200;
  const start = performance.now();

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    current = Math.round(targetScore * ease);
    numberEl.textContent = current;
    ring.style.strokeDashoffset = circumference - (current / 100) * circumference;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function animateVelocity(root, targetPercent) {
  const fill = root.querySelector('#lex-vel-fill');
  if (!fill) return;
  setTimeout(() => {
    fill.style.width = `${Math.min(100, targetPercent || 0)}%`;
  }, 300);
}

// ---- UTILIDADES ----
function formatNumber(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function getScoreDescription(score) {
  if (score >= 80) return 'Excelente optimización. Tu video está bien posicionado.';
  if (score >= 65) return 'Buena optimización. Hay oportunidades de mejora.';
  if (score >= 50) return 'Optimización básica. Varios factores pueden mejorar.';
  if (score >= 35) return 'Pobre optimización. Necesita trabajo en SEO.';
  return 'SEO crítico. El video no está optimizado para rankear.';
}
