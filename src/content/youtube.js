// ============================================
// LEXTERIQ - YouTube Content Script
// Inyecta panel lateral en youtube.com/watch
// ============================================

(function() {
  'use strict';

  let currentVideoId = null;
  let panelInjected = false;

  function getVideoId() {
    const url = new URL(window.location.href);
    return url.searchParams.get('v');
  }

  function createPanel(data) {
    const existing = document.getElementById('lexteriq-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'lexteriq-panel';
    panel.innerHTML = `
      <div class="lx-header">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#4f98a3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Lexteriq</span>
        <span class="lx-plan-badge">${data.planName || 'Free'}</span>
        <button class="lx-close" id="lx-close-btn">×</button>
      </div>

      <div class="lx-tabs">
        <button class="lx-tab active" data-tab="overview">Overview</button>
        <button class="lx-tab" data-tab="keywords">Keywords</button>
        <button class="lx-tab" data-tab="seo">SEO</button>
        <button class="lx-tab" data-tab="tags">Tags</button>
      </div>

      <div class="lx-content" id="lx-tab-overview">
        <div class="lx-seo-circle">
          <svg viewBox="0 0 36 36" width="80" height="80">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#2d2c2a" stroke-width="3"/>
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="${data.seoScore >= 70 ? '#6daa45' : data.seoScore >= 40 ? '#e8af34' : '#dd6974'}" stroke-width="3" stroke-dasharray="${data.seoScore || 0}, 100" stroke-linecap="round"/>
            <text x="18" y="20.5" text-anchor="middle" fill="#cdccca" font-size="8" font-weight="bold">${data.seoScore || 0}</text>
          </svg>
          <span class="lx-seo-label">SEO Score</span>
        </div>
        <div class="lx-stats">
          <div class="lx-stat"><span class="lx-stat-label">👁 Vistas</span><span class="lx-stat-val">${formatNumber(data.viewCount)}</span></div>
          <div class="lx-stat"><span class="lx-stat-label">👍 Likes</span><span class="lx-stat-val">${formatNumber(data.likeCount)}</span></div>
          <div class="lx-stat"><span class="lx-stat-label">💬 Comentarios</span><span class="lx-stat-val">${formatNumber(data.commentCount)}</span></div>
          <div class="lx-stat"><span class="lx-stat-label">🏷 Tags</span><span class="lx-stat-val">${data.tags?.length || 0}</span></div>
        </div>
      </div>

      <div class="lx-content lx-hidden" id="lx-tab-keywords">
        <p class="lx-section-title">Top Keywords detectadas</p>
        <div class="lx-keywords">
          ${(data.keywords || []).slice(0, 15).map(k =>
            `<span class="lx-keyword-chip">${k.word} <small>${k.count}</small></span>`
          ).join('')}
        </div>
      </div>

      <div class="lx-content lx-hidden" id="lx-tab-seo">
        <p class="lx-section-title">Análisis SEO</p>
        <div class="lx-seo-items">
          <div class="lx-seo-item ${getTitleScore(data.title)}">
            <span>📝 Título</span>
            <span>${data.title?.length || 0} chars ${getTitleScoreText(data.title)}</span>
          </div>
          <div class="lx-seo-item ${data.tags?.length >= 5 ? 'good' : 'warn'}">
            <span>🏷 Tags</span>
            <span>${data.tags?.length || 0} tags ${data.tags?.length >= 5 ? '✓' : '⚠ Agregar más'}</span>
          </div>
          <div class="lx-seo-item ${getDescScore(data.description)}">
            <span>📄 Descripción</span>
            <span>${data.description?.length || 0} chars ${getDescScoreText(data.description)}</span>
          </div>
        </div>
      </div>

      <div class="lx-content lx-hidden" id="lx-tab-tags">
        <p class="lx-section-title">Tags del video <small>(${data.tags?.length || 0})</small></p>
        <div class="lx-tags-list">
          ${(data.tags || []).map(t =>
            `<span class="lx-tag">${t}</span>`
          ).join('') || '<p class="lx-muted">Sin tags</p>'}
        </div>
      </div>
    `;

    // Inject styles
    if (!document.getElementById('lexteriq-styles')) {
      const style = document.createElement('style');
      style.id = 'lexteriq-styles';
      style.textContent = getLexteriqStyles();
      document.head.appendChild(style);
    }

    // Inject into YouTube sidebar
    const secondary = document.querySelector('#secondary') || document.querySelector('ytd-watch-flexy #secondary');
    if (secondary) {
      secondary.prepend(panel);
      panelInjected = true;
    }

    // Tab switching
    panel.querySelectorAll('.lx-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        panel.querySelectorAll('.lx-tab').forEach(t => t.classList.remove('active'));
        panel.querySelectorAll('.lx-content').forEach(c => c.classList.add('lx-hidden'));
        btn.classList.add('active');
        document.getElementById(`lx-tab-${btn.dataset.tab}`)?.classList.remove('lx-hidden');
      });
    });

    document.getElementById('lx-close-btn')?.addEventListener('click', () => panel.remove());
  }

  function showLoadingPanel() {
    const existing = document.getElementById('lexteriq-panel');
    if (existing) existing.remove();
    const panel = document.createElement('div');
    panel.id = 'lexteriq-panel';
    panel.innerHTML = `
      <div class="lx-header">
        <span>Lexteriq</span>
        <button class="lx-close" id="lx-close-btn">×</button>
      </div>
      <div style="padding:24px;text-align:center;color:#797876">
        <div class="lx-spinner"></div>
        <p style="margin-top:12px;font-size:13px">Analizando video...</p>
      </div>
    `;
    if (!document.getElementById('lexteriq-styles')) {
      const style = document.createElement('style');
      style.id = 'lexteriq-styles';
      style.textContent = getLexteriqStyles();
      document.head.appendChild(style);
    }
    const secondary = document.querySelector('#secondary');
    if (secondary) secondary.prepend(panel);
    document.getElementById('lx-close-btn')?.addEventListener('click', () => panel.remove());
  }

  async function analyzeCurrentVideo() {
    const videoId = getVideoId();
    if (!videoId || videoId === currentVideoId) return;
    currentVideoId = videoId;
    showLoadingPanel();
    chrome.runtime.sendMessage({ action: 'ANALYZE_VIDEO', videoId }, (response) => {
      if (response?.error) {
        const panel = document.getElementById('lexteriq-panel');
        if (panel) panel.innerHTML = `<div style="padding:16px;color:#dd6974">${response.error}</div>`;
        return;
      }
      if (response?.data) createPanel(response.data);
    });
  }

  // Watch for YouTube navigation
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      currentVideoId = null;
      if (url.includes('youtube.com/watch')) setTimeout(analyzeCurrentVideo, 1500);
    }
  }).observe(document, { subtree: true, childList: true });

  if (location.href.includes('youtube.com/watch')) setTimeout(analyzeCurrentVideo, 2000);

  // Helpers
  function formatNumber(n) {
    if (!n) return '0';
    if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n/1000).toFixed(1) + 'K';
    return n.toString();
  }
  function getTitleScore(title) {
    const l = title?.length || 0;
    return l >= 40 && l <= 70 ? 'good' : l >= 20 ? 'warn' : 'bad';
  }
  function getTitleScoreText(title) {
    const l = title?.length || 0;
    return l >= 40 && l <= 70 ? '✓ Óptimo' : l >= 20 ? '⚠ Mejorable' : '✗ Muy corto';
  }
  function getDescScore(desc) {
    const l = desc?.length || 0;
    return l >= 200 ? 'good' : l >= 100 ? 'warn' : 'bad';
  }
  function getDescScoreText(desc) {
    const l = desc?.length || 0;
    return l >= 200 ? '✓ Óptimo' : l >= 100 ? '⚠ Mejorable' : '✗ Muy corta';
  }

  function getLexteriqStyles() {
    return `
      #lexteriq-panel {
        background: #1c1b19;
        border: 1px solid #393836;
        border-radius: 12px;
        margin-bottom: 16px;
        font-family: 'Inter', -apple-system, sans-serif;
        font-size: 13px;
        color: #cdccca;
        overflow: hidden;
        box-shadow: 0 4px 24px rgba(0,0,0,0.4);
      }
      .lx-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 14px;
        background: #201f1d;
        border-bottom: 1px solid #393836;
        font-weight: 600;
        font-size: 14px;
      }
      .lx-plan-badge {
        background: #4f98a3;
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 999px;
        text-transform: uppercase;
        margin-left: auto;
      }
      .lx-close {
        background: none;
        border: none;
        color: #797876;
        font-size: 18px;
        cursor: pointer;
        padding: 0 4px;
        margin-left: 4px;
      }
      .lx-tabs {
        display: flex;
        gap: 0;
        border-bottom: 1px solid #393836;
        background: #1c1b19;
      }
      .lx-tab {
        flex: 1;
        padding: 8px 0;
        background: none;
        border: none;
        color: #797876;
        font-size: 12px;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        transition: all 180ms;
      }
      .lx-tab.active {
        color: #4f98a3;
        border-bottom-color: #4f98a3;
      }
      .lx-content { padding: 14px; }
      .lx-hidden { display: none !important; }
      .lx-seo-circle { display: flex; flex-direction: column; align-items: center; margin-bottom: 14px; }
      .lx-seo-label { font-size: 11px; color: #797876; margin-top: 4px; }
      .lx-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .lx-stat { background: #22211f; border-radius: 8px; padding: 8px 10px; display: flex; flex-direction: column; gap: 2px; }
      .lx-stat-label { font-size: 11px; color: #797876; }
      .lx-stat-val { font-size: 14px; font-weight: 600; color: #cdccca; }
      .lx-section-title { font-size: 11px; color: #797876; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
      .lx-keywords { display: flex; flex-wrap: wrap; gap: 6px; }
      .lx-keyword-chip { background: #22211f; border: 1px solid #393836; border-radius: 999px; padding: 3px 10px; font-size: 12px; color: #cdccca; }
      .lx-keyword-chip small { color: #4f98a3; margin-left: 4px; }
      .lx-seo-items { display: flex; flex-direction: column; gap: 8px; }
      .lx-seo-item { display: flex; justify-content: space-between; padding: 8px 10px; border-radius: 8px; font-size: 12px; }
      .lx-seo-item.good { background: #3a4435; color: #6daa45; }
      .lx-seo-item.warn { background: #4d4332; color: #e8af34; }
      .lx-seo-item.bad  { background: #574848; color: #dd6974; }
      .lx-tags-list { display: flex; flex-wrap: wrap; gap: 5px; }
      .lx-tag { background: #22211f; border: 1px solid #393836; padding: 3px 8px; border-radius: 6px; font-size: 11px; color: #cdccca; }
      .lx-muted { color: #797876; font-size: 12px; }
      .lx-spinner { width: 28px; height: 28px; border: 3px solid #393836; border-top-color: #4f98a3; border-radius: 50%; animation: lx-spin 0.8s linear infinite; margin: 0 auto; }
      @keyframes lx-spin { to { transform: rotate(360deg); } }
    `;
  }
})();
