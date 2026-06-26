/**
 * Lexteriq — Content Script para YouTube
 * Inyecta el panel de análisis en páginas de YouTube Watch
 */

(function () {
  'use strict';

  const LEXTERIQ_PANEL_ID = 'lexteriq-panel';
  let currentVideoId = null;
  let panelVisible = true;

  // ─── Inicialización ──────────────────────────────────────────────────────
  function init() {
    observeURLChanges();
    if (isVideoPage()) {
      const videoId = getVideoId();
      if (videoId) injectPanel(videoId);
    }
  }

  // Detecta cambios de URL (SPA navigation de YouTube)
  function observeURLChanges() {
    let lastURL = location.href;
    new MutationObserver(() => {
      if (location.href !== lastURL) {
        lastURL = location.href;
        handleURLChange();
      }
    }).observe(document.body, { childList: true, subtree: true });

    // También escuchar el evento nativo de YouTube
    window.addEventListener('yt-navigate-finish', handleURLChange);
  }

  function handleURLChange() {
    if (isVideoPage()) {
      const videoId = getVideoId();
      if (videoId && videoId !== currentVideoId) {
        currentVideoId = videoId;
        removePanel();
        setTimeout(() => injectPanel(videoId), 1200); // esperar que cargue el DOM
      }
    } else {
      removePanel();
      currentVideoId = null;
    }
  }

  function isVideoPage() {
    return location.pathname === '/watch' && location.search.includes('v=');
  }

  function getVideoId() {
    return new URLSearchParams(location.search).get('v');
  }

  // ─── Inyectar panel ──────────────────────────────────────────────────────
  async function injectPanel(videoId) {
    // Esperar a que exista el contenedor de YouTube
    const container = await waitForElement('#secondary, #secondary-inner, ytd-watch-flexy');
    if (!container) return;

    // Crear panel
    const panel = createPanel();
    container.prepend(panel);
    currentVideoId = videoId;

    // Mostrar estado loading
    showLoadingState();

    // Pedir datos al background
    chrome.runtime.sendMessage({ type: 'GET_VIDEO_DATA', videoId }, (response) => {
      if (chrome.runtime.lastError) {
        showErrorState('Error de conexión');
        return;
      }
      if (response.needsLogin) {
        showLoginPrompt();
        return;
      }
      if (response.error) {
        showErrorState(response.error);
        return;
      }
      renderVideoData(response.data);
      
      // También cargar datos del canal
      if (response.data?.channelId) {
        chrome.runtime.sendMessage(
          { type: 'GET_CHANNEL_DATA', channelId: response.data.channelId },
          (chanRes) => { if (chanRes?.data) renderChannelData(chanRes.data); }
        );
      }
    });
  }

  function createPanel() {
    const panel = document.createElement('div');
    panel.id = LEXTERIQ_PANEL_ID;
    panel.innerHTML = `
      <div class="lxt-panel">
        <div class="lxt-header">
          <div class="lxt-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#4f98a3" stroke-width="2" stroke-linejoin="round"/>
              <path d="M2 17l10 5 10-5" stroke="#4f98a3" stroke-width="2" stroke-linejoin="round"/>
              <path d="M2 12l10 5 10-5" stroke="#4f98a3" stroke-width="2" stroke-linejoin="round"/>
            </svg>
            <span class="lxt-brand">Lexteriq</span>
          </div>
          <div class="lxt-header-actions">
            <button class="lxt-toggle-btn" id="lxt-toggle" title="Minimizar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 15l-6-6-6 6"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="lxt-content" id="lxt-content">
          <div class="lxt-loading" id="lxt-loading">
            <div class="lxt-spinner"></div>
            <span>Analizando video...</span>
          </div>
        </div>
      </div>
    `;

    // Toggle minimize
    panel.querySelector('#lxt-toggle').addEventListener('click', () => {
      const content = panel.querySelector('#lxt-content');
      const icon = panel.querySelector('#lxt-toggle svg');
      panelVisible = !panelVisible;
      content.style.display = panelVisible ? 'block' : 'none';
      icon.style.transform = panelVisible ? '' : 'rotate(180deg)';
    });

    return panel;
  }

  function removePanel() {
    const existing = document.getElementById(LEXTERIQ_PANEL_ID);
    if (existing) existing.remove();
  }

  // ─── Render: datos del video ──────────────────────────────────────────────
  function renderVideoData(data) {
    const content = document.getElementById('lxt-content');
    if (!content) return;

    const seoColor = data.seoScore >= 70 ? '#6daa45' : data.seoScore >= 40 ? '#e8af34' : '#dd6974';
    const seoLabel = data.seoScore >= 70 ? 'Bueno' : data.seoScore >= 40 ? 'Regular' : 'Bajo';

    content.innerHTML = `
      <!-- SEO Score -->
      <div class="lxt-section">
        <div class="lxt-section-title">SEO Score</div>
        <div class="lxt-score-row">
          <div class="lxt-score-circle" style="--score-color: ${seoColor}">
            <svg viewBox="0 0 36 36" class="lxt-score-svg">
              <path class="lxt-score-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
              <path class="lxt-score-fill" stroke="${seoColor}"
                stroke-dasharray="${data.seoScore}, 100"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
            </svg>
            <span class="lxt-score-num">${data.seoScore}</span>
          </div>
          <div class="lxt-score-details">
            <div class="lxt-score-label" style="color: ${seoColor}">${seoLabel}</div>
            <div class="lxt-score-hint">de 100 puntos</div>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="lxt-section">
        <div class="lxt-section-title">Estadísticas</div>
        <div class="lxt-stats-grid">
          <div class="lxt-stat">
            <div class="lxt-stat-val">${formatNumber(data.stats.views)}</div>
            <div class="lxt-stat-lbl">Vistas</div>
          </div>
          <div class="lxt-stat">
            <div class="lxt-stat-val">${formatNumber(data.stats.likes)}</div>
            <div class="lxt-stat-lbl">Likes</div>
          </div>
          <div class="lxt-stat">
            <div class="lxt-stat-val">${formatNumber(data.stats.comments)}</div>
            <div class="lxt-stat-lbl">Comentarios</div>
          </div>
          <div class="lxt-stat">
            <div class="lxt-stat-val">${data.stats.engagementRate}%</div>
            <div class="lxt-stat-lbl">Engagement</div>
          </div>
        </div>
      </div>

      <!-- SEO Checklist -->
      <div class="lxt-section">
        <div class="lxt-section-title">Checklist SEO</div>
        <div class="lxt-checklist">
          ${renderCheckItem('Título optimizado (30-60 chars)', data.titleLength >= 30 && data.titleLength <= 60, `${data.titleLength} caracteres`)}
          ${renderCheckItem('Descripción completa (200+ chars)', data.descriptionLength >= 200, `${data.descriptionLength} chars`)}
          ${renderCheckItem('Tags suficientes (10+)', data.tagCount >= 10, `${data.tagCount} tags`)}
          ${renderCheckItem('Miniatura HD', !!data.thumbnail, '')}
          ${renderCheckItem('Links en descripción', data.description?.includes('http'), '')}
        </div>
      </div>

      <!-- Tags -->
      ${data.tags.length > 0 ? `
      <div class="lxt-section">
        <div class="lxt-section-title">Tags del Video <span class="lxt-badge">${data.tags.length}</span></div>
        <div class="lxt-tags">
          ${data.tags.slice(0, 20).map(tag => `<span class="lxt-tag">${tag}</span>`).join('')}
          ${data.tags.length > 20 ? `<span class="lxt-tag lxt-tag-more">+${data.tags.length - 20} más</span>` : ''}
        </div>
      </div>` : ''}

      <!-- Keywords detectadas -->
      <div class="lxt-section">
        <div class="lxt-section-title">Keywords Detectadas</div>
        <div class="lxt-tags">
          ${data.keywords.map(kw => `<span class="lxt-tag lxt-tag-kw">${kw}</span>`).join('')}
        </div>
      </div>

      <!-- Duración -->
      <div class="lxt-section lxt-section-meta">
        <span>⏱ ${data.duration}</span>
        <span>📅 ${formatDate(data.publishedAt)}</span>
      </div>
    `;
  }

  function renderChannelData(channel) {
    const content = document.getElementById('lxt-content');
    if (!content) return;

    // Insertar sección de canal al inicio del contenido
    const channelSection = document.createElement('div');
    channelSection.className = 'lxt-section lxt-channel-section';
    channelSection.innerHTML = `
      <div class="lxt-section-title">Canal</div>
      <div class="lxt-channel-row">
        ${channel.thumbnail ? `<img class="lxt-channel-thumb" src="${channel.thumbnail}" alt="${channel.title}">` : ''}
        <div class="lxt-channel-info">
          <div class="lxt-channel-name">${channel.title}</div>
          <div class="lxt-channel-stats">
            ${formatNumber(channel.stats.subscribers)} subs &bull;
            ${formatNumber(channel.stats.videos)} videos
          </div>
        </div>
      </div>
    `;
    content.insertBefore(channelSection, content.firstChild);
  }

  function renderCheckItem(label, pass, hint) {
    return `
      <div class="lxt-check-item">
        <span class="lxt-check-icon ${pass ? 'lxt-pass' : 'lxt-fail'}">${pass ? '✓' : '✗'}</span>
        <span class="lxt-check-label">${label}</span>
        ${hint ? `<span class="lxt-check-hint">${hint}</span>` : ''}
      </div>
    `;
  }

  function showLoadingState() {
    const content = document.getElementById('lxt-content');
    if (content) {
      content.innerHTML = `
        <div class="lxt-loading">
          <div class="lxt-spinner"></div>
          <span>Analizando video...</span>
        </div>
      `;
    }
  }

  function showErrorState(msg) {
    const content = document.getElementById('lxt-content');
    if (content) {
      content.innerHTML = `
        <div class="lxt-error">
          <span>⚠️ ${msg}</span>
          <button class="lxt-retry" onclick="location.reload()">Reintentar</button>
        </div>
      `;
    }
  }

  function showLoginPrompt() {
    const content = document.getElementById('lxt-content');
    if (content) {
      content.innerHTML = `
        <div class="lxt-login-prompt">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#4f98a3" stroke-width="2" stroke-linejoin="round"/>
            <path d="M2 17l10 5 10-5" stroke="#4f98a3" stroke-width="2" stroke-linejoin="round"/>
            <path d="M2 12l10 5 10-5" stroke="#4f98a3" stroke-width="2" stroke-linejoin="round"/>
          </svg>
          <p>Inicia sesión para analizar videos</p>
          <button class="lxt-btn-primary" id="lxt-signin-btn">Conectar con Google</button>
        </div>
      `;
      document.getElementById('lxt-signin-btn')?.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'SIGN_IN_GOOGLE' }, (res) => {
          if (res.success) {
            removePanel();
            setTimeout(() => injectPanel(getVideoId()), 500);
          }
        });
      });
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function waitForElement(selector, timeout = 8000) {
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

  // Iniciar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
