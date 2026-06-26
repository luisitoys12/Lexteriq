// Lexteriq Popup Script
(function() {
  const views = { login: document.getElementById('view-login'), dashboard: document.getElementById('view-dashboard') };

  function showView(name) {
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[name]?.classList.remove('hidden');
  }

  function renderUser(user) {
    if (!user) return showView('login');
    document.getElementById('user-avatar').src = user.avatar_url || '';
    document.getElementById('user-name').textContent = user.display_name || 'Usuario';
    document.getElementById('user-email').textContent = user.email || '';
    document.getElementById('user-plan').textContent = (user.plan_id || 'free').toUpperCase();
    document.getElementById('stat-analyses').textContent = user.analyses_used_this_month || 0;
    const plan = user.plan_id || 'free';
    const limits = { free: 50, pro: 500, business: -1 };
    const limit = limits[plan] ?? 50;
    document.getElementById('stat-remaining').textContent = limit === -1 ? '∞' : Math.max(0, limit - (user.analyses_used_this_month || 0));
    // Trial banner
    if (user.trial_ends_at && !user.trial_expired) {
      const days = Math.ceil((new Date(user.trial_ends_at) - new Date()) / 86400000);
      if (days > 0) {
        document.getElementById('trial-banner').classList.remove('hidden');
        document.getElementById('trial-days').textContent = days;
      }
    }
    if (plan === 'free') document.getElementById('btn-upgrade').style.display = 'block';
    showView('dashboard');
  }

  // Init
  chrome.runtime.sendMessage({ action: 'GET_USER' }, (res) => renderUser(res?.user));

  // Login
  document.getElementById('btn-login')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'LOGIN' }, (res) => {
      if (res?.success) renderUser(res.user);
    });
  });

  // Invite code
  document.getElementById('btn-invite')?.addEventListener('click', async () => {
    const code = document.getElementById('invite-code')?.value?.trim();
    const msg = document.getElementById('invite-msg');
    if (!code) return;
    msg.textContent = 'Validando...';
    msg.className = 'invite-hint';
    chrome.runtime.sendMessage({ action: 'VALIDATE_INVITE', code }, (res) => {
      if (!res?.valid) {
        msg.textContent = res?.error || 'Código inválido';
        msg.className = 'invite-hint error';
        return;
      }
      msg.textContent = '✓ Código válido! Inicia sesión para activar.';
      msg.className = 'invite-hint success';
    });
  });

  // Open YouTube
  document.getElementById('btn-open-yt')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://youtube.com' });
  });

  // Upgrade
  document.getElementById('btn-upgrade')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://lexteriq.com/pricing' });
  });

  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    chrome.storage.local.remove(['lexteriq_user', 'lexteriq_token'], () => showView('login'));
  });
})();
