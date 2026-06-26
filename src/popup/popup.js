/**
 * Lexteriq — Popup Script
 */

(function () {
  'use strict';

  let currentUser = null;

  // ─── Init ───────────────────────────────────────────────────────────────
  async function init() {
    setupTabs();
    checkAuthStatus();
    setupLoginBtn();
    setupSignOutBtn();
    setupKeywordSearch();
    loadCurrentTabVideo();
  }

  // ─── Auth ────────────────────────────────────────────────────────────────
  function checkAuthStatus() {
    chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' }, (res) => {
      if (res && res.isLoggedIn && res.user) {
        currentUser = res.user;
        showMainView(res.user);
      } else {
        showLoginView();
      }
    });
  }

  function showLoginView() {
    document.getElementById('view-login').classList.remove('hidden');
    document.getElementById('view-main').classList.add('hidden');
    document.getElementById('user-badge').classList.add('hidden');
  }

  function showMainView(user) {
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-main').classList.remove('hidden');

    // User badge en header
    const badge = document.getElementById('user-badge');
    badge.classList.remove('hidden');
    const avatar = document.getElementById('user-avatar');
    if (user.picture) avatar.src = user.picture;
    document.getElementById('user-name').textContent = user.given_name || user.name || '';

    // Account tab
    if (user.picture) document.getElementById('account-avatar').src = user.picture;
    document.getElementById('account-name').textContent = user.name || '';
    document.getElementById('account-email').textContent = user.email || '';
  }

  function setupLoginBtn() {
    document.getElementById('btn-login')?.addEventListener('click', () => {
      const btn = document.getElementById('btn-login');
      btn.textContent = 'Conectando...';
      btn.disabled = true;

      chrome.runtime.sendMessage({ type: 'SIGN_IN_GOOGLE' }, (res) => {
        if (res && res.success) {
          currentUser = res.user;
          showMainView(res.user);
          loadCurrentTabVideo();
        } else {
          btn.innerHTML = `<span>Error: ${res?.error || 'Inténtalo de nuevo'}</span>`;
          btn.disabled = false;
          setTimeout(() => {
            btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>Conectar con Google';
          }, 3000);
        }
      });
    });
  }

  function setupSignOutBtn() {
    document.getElementById('btn-signout')?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'SIGN_OUT' }, (res) => {
        if (res?.success) {
          currentUser = null;
          showLoginView();
        }
      });
    });
  }

  // ─── Tabs ────────────────────────────────────────────────────────────────
  function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${tabId}`)?.classList.add('active');
      });
    });
  }

  // ─── Current tab video ───────────────────────────────────────────────────
  function loadCurrentTabVideo() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.url?.includes('youtube.com/watch')) {
        return;
      }
      const videoId = new URL(tab.url).searchParams.get('v');
      if (!videoId) return;

      chrome.storage.local.get(`video_${videoId}`, (result) => {
        const cached = result[`video_${videoId}`];
        if (cached?.data) {
          renderPopupVideoSummary(cached.data, tab.url);
        }
      });
    });
  }

  function renderPopupVideoSummary(data, url) {
    document.getElementById('no-video-msg')?.classList.add('hidden');
    const summary = document.getElementById('video-summary');
    summary?.classList.remove('hidden');

    document.getElementById('popup-video-title').textContent = data.title;
    const link = document.getElementById('popup-open-video');
    if (link) link.href = url;

    const statsEl = document.getElementById('popup-quick-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="quick-stat"><div class="quick-stat-val">${data.seoScore}</div><div class="quick-stat-lbl">SEO</div></div>
        <div class="quick-stat"><div class="quick-stat-val">${formatNum(data.stats?.views)}</div><div class="quick-stat-lbl">Vistas</div></div>
        <div class="quick-stat"><div class="quick-stat-val">${data.tagCount}</div><div class="quick-stat-lbl">Tags</div></div>
      `;
    }
  }

  // ─── Keyword Search ──────────────────────────────────────────────────────
  function setupKeywordSearch() {
    const input = document.getElementById('kw-input');
    const btn = document.getElementById('kw-search-btn');

    const doSearch = () => {
      const query = input?.value?.trim();
      if (!query) return;
      searchKeywords(query);
    };

    btn?.addEventListener('click', doSearch);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch();
    });
  }

  function searchKeywords(query) {
    const resultsEl = document.getElementById('kw-results');
    if (!resultsEl) return;
    resultsEl.innerHTML = '<div class="info-msg">Buscando...</div>';

    chrome.runtime.sendMessage({ type: 'GET_KEYWORD_IDEAS', query }, (res) => {
      if (res?.success && res.data?.keywords) {
        renderKeywords(res.data.keywords);
      } else {
        // Fallback: generar keywords relacionadas localmente
        const mockKeywords = generateLocalKeywords(query);
        renderKeywords(mockKeywords);
      }
    });
  }

  function renderKeywords(keywords) {
    const resultsEl = document.getElementById('kw-results');
    if (!resultsEl) return;

    if (!keywords || keywords.length === 0) {
      resultsEl.innerHTML = '<div class="info-msg">No se encontraron keywords</div>';
      return;
    }

    resultsEl.innerHTML = keywords.map(kw => `
      <div class="kw-item">
        <span class="kw-text">${typeof kw === 'string' ? kw : kw.keyword}</span>
        ${kw.volume ? `<span class="kw-volume">${formatNum(kw.volume)}/mes</span>` : ''}
      </div>
    `).join('');
  }

  function generateLocalKeywords(query) {
    const prefixes = ['cómo', 'tutorial', 'guía', 'mejor', 'top 10', 'para principiantes', 'gratis', '2025', '2026'];
    const suffixes = ['tutorial', 'explicado', 'completo', 'rápido', 'fácil', 'paso a paso'];
    const keywords = [query];
    prefixes.slice(0, 4).forEach(p => keywords.push(`${p} ${query}`));
    suffixes.slice(0, 4).forEach(s => keywords.push(`${query} ${s}`));
    return keywords.slice(0, 8);
  }

  function formatNum(num) {
    if (!num) return '—';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return num.toString();
  }

  // Start
  document.addEventListener('DOMContentLoaded', init);
})();
