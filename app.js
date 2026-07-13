/* =========================================================
   NOVA AI — app.js
   Application bootstrap: routes between views, wires up auth,
   sidebar, profile modal, theme, voice, and toasts.
========================================================= */

const NovaApp = (() => {
  let currentUser = null;

  // ---------------- Toasts ----------------
  function toast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .25s ease';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 250);
    }, 3200);
  }

  // ---------------- View routing ----------------
  function showView(name) {
    document.getElementById('landing-view').hidden = name !== 'landing';
    document.getElementById('auth-view').hidden = name !== 'login' && name !== 'signup';
    document.getElementById('app-view').hidden = name !== 'app';

    if (name === 'login' || name === 'signup') {
      document.getElementById('login-form').hidden = name !== 'login';
      document.getElementById('signup-form').hidden = name !== 'signup';
    }
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  function route(name) {
    if ((name === 'app') && !NovaAuth.currentUser()) {
      name = 'login';
    }
    showView(name);
    if (name === 'app') enterApp();
  }

  // ---------------- Entering the app after auth ----------------
  function enterApp() {
    currentUser = NovaAuth.currentUser();
    if (!currentUser) { route('login'); return; }

    const settings = NovaStorage.getSettings(currentUser.id);
    NovaTheme.init(settings.theme);
    NovaChat.setTtsAuto(!!settings.ttsAuto);

    document.getElementById('settings-tts-toggle').checked = !!settings.ttsAuto;
    document.getElementById('settings-voice-toggle').checked = settings.voiceEnabled !== false;

    const initial = currentUser.name.trim().charAt(0).toUpperCase() || 'U';
    document.getElementById('sidebar-avatar').textContent = initial;
    document.getElementById('sidebar-username').textContent = currentUser.name;
    document.getElementById('profile-avatar').textContent = initial;
    document.getElementById('profile-name-display').textContent = currentUser.name;
    document.getElementById('profile-email-display').textContent = currentUser.email;
    document.getElementById('settings-name').value = currentUser.name;

    NovaChat.init(currentUser.id);
  }

  function persistSetting(key, value) {
    if (!currentUser) return;
    const settings = NovaStorage.getSettings(currentUser.id);
    settings[key] = value;
    NovaStorage.saveSettings(currentUser.id, settings);
  }

  // ---------------- Auth form wiring ----------------
  function bindAuthForms() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loginError = document.getElementById('login-error');
    const signupError = document.getElementById('signup-error');

    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      loginError.textContent = '';
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const result = NovaAuth.login({ email, password });
      if (!result.ok) { loginError.textContent = result.error; return; }
      toast(`Welcome back, ${result.user.name.split(' ')[0]}!`, 'success');
      route('app');
    });

    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      signupError.textContent = '';
      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      const result = NovaAuth.signup({ name, email, password });
      if (!result.ok) { signupError.textContent = result.error; return; }
      toast(`Welcome to Nova AI, ${result.user.name.split(' ')[0]}!`, 'success');
      route('app');
    });

    document.getElementById('guest-btn').addEventListener('click', () => {
      NovaAuth.loginAsGuest();
      toast('Continuing as guest — your data stays on this device.', 'success');
      route('app');
    });

    document.querySelectorAll('.pw-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.textContent = show ? '🙈' : '👁';
      });
    });
  }

  // ---------------- Route link wiring (data-route attributes) ----------------
  function bindRouteLinks() {
    document.querySelectorAll('[data-route]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const target = el.dataset.route;
        route(target);
        document.getElementById('nav-links')?.classList.remove('open');
      });
    });
  }

  // ---------------- Mobile landing nav ----------------
  function bindMobileNav() {
    const hamburger = document.getElementById('hamburger-btn');
    const navLinks = document.querySelector('.nav-links');
    const navActions = document.querySelector('.nav-actions');
    hamburger.addEventListener('click', () => {
      const open = hamburger.classList.toggle('open');
      navLinks.classList.toggle('open', open);
      navActions.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', String(open));
    });
  }

  // ---------------- Sidebar (app view) ----------------
  function bindSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const openBtn = document.getElementById('sidebar-open');
    const closeBtn = document.getElementById('sidebar-close');

    function open() { sidebar.classList.add('open'); overlay.hidden = false; }
    function close() { sidebar.classList.remove('open'); overlay.hidden = true; }

    openBtn.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', close);

    document.getElementById('new-chat-btn').addEventListener('click', () => NovaChat.newConversation());
  }

  // ---------------- Theme toggles ----------------
  function bindTheme() {
    document.getElementById('theme-toggle-sidebar').addEventListener('click', () => NovaTheme.toggle());
    document.getElementById('settings-theme-btn').addEventListener('click', () => NovaTheme.toggle());
  }

  // ---------------- Profile / settings modal ----------------
  function bindProfileModal() {
    const modal = document.getElementById('profile-modal');
    const open = () => { modal.hidden = false; document.getElementById('close-profile-btn').focus(); };
    const close = () => { modal.hidden = true; };

    document.getElementById('open-profile-btn').addEventListener('click', open);
    document.getElementById('close-profile-btn').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) close(); });

    document.getElementById('settings-name').addEventListener('change', (e) => {
      const newName = e.target.value.trim();
      if (!newName || !currentUser) return;
      currentUser = NovaStorage.updateUser(currentUser.id, { name: newName });
      const initial = newName.charAt(0).toUpperCase();
      document.getElementById('sidebar-avatar').textContent = initial;
      document.getElementById('sidebar-username').textContent = newName;
      document.getElementById('profile-avatar').textContent = initial;
      document.getElementById('profile-name-display').textContent = newName;
      toast('Profile updated.', 'success');
    });

    document.getElementById('settings-tts-toggle').addEventListener('change', (e) => {
      NovaChat.setTtsAuto(e.target.checked);
      persistSetting('ttsAuto', e.target.checked);
    });
    document.getElementById('settings-voice-toggle').addEventListener('change', (e) => {
      persistSetting('voiceEnabled', e.target.checked);
    });

    document.getElementById('clear-history-btn').addEventListener('click', () => {
      if (confirm('Clear all conversations on this device? This cannot be undone.')) {
        NovaChat.clearAllHistory();
        toast('Conversation history cleared.', 'success');
      }
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
      NovaAuth.logout();
      close();
      toast('Logged out.', 'success');
      route('landing');
    });
  }

  // ---------------- Voice (mic + TTS toggle) ----------------
  function bindVoice() {
    const micBtn = document.getElementById('mic-btn');
    const ttsToggleBtn = document.getElementById('tts-toggle-btn');
    const input = document.getElementById('composer-input');

    if (!NovaVoice.isRecognitionSupported()) {
      micBtn.disabled = true;
      micBtn.title = 'Voice input is not supported in this browser';
      micBtn.style.opacity = '.35';
    }

    micBtn.addEventListener('click', () => {
      if (NovaVoice.isListening()) { NovaVoice.stopListening(); return; }
      micBtn.classList.add('recording');
      NovaVoice.startListening({
        onInterim: (text) => { input.value = text; },
        onResult: (text) => { input.value = text; input.focus(); },
        onEnd: () => micBtn.classList.remove('recording'),
        onError: (err) => {
          micBtn.classList.remove('recording');
          toast('Voice input error — check microphone permissions.', 'error');
          console.error(err);
        },
      });
    });

    let ttsOn = false;
    ttsToggleBtn.addEventListener('click', () => {
      ttsOn = !ttsOn;
      ttsToggleBtn.classList.toggle('active', ttsOn);
      NovaChat.setTtsAuto(ttsOn);
      persistSetting('ttsAuto', ttsOn);
      document.getElementById('settings-tts-toggle').checked = ttsOn;
      toast(ttsOn ? 'Nova will read replies aloud.' : 'Read-aloud turned off.', 'success');
      if (!ttsOn) NovaVoice.stopSpeaking();
    });
  }

  // ---------------- Export ----------------
  function bindExport() {
    document.getElementById('export-btn').addEventListener('click', () => {
      const convo = NovaChat.getActiveConversationOrNull();
      if (!convo || !convo.messages.length) { toast('Start a conversation before exporting.', 'error'); return; }
      const choice = prompt('Export as "pdf" or "txt"?', 'pdf');
      if (!choice) return;
      if (choice.toLowerCase().startsWith('p')) NovaExport.toPdf(convo);
      else NovaExport.toTxt(convo);
    });
  }

  // ---------------- Init ----------------
  function init() {
    document.getElementById('footer-year').textContent = new Date().getFullYear();

    NovaParticles.init();
    bindAuthForms();
    bindRouteLinks();
    bindMobileNav();
    bindSidebar();
    bindTheme();
    bindProfileModal();
    bindVoice();
    bindExport();

    // Apply theme even on landing/auth views using last-known or system preference.
    const existingUser = NovaAuth.currentUser();
    if (existingUser) {
      const settings = NovaStorage.getSettings(existingUser.id);
      NovaTheme.init(settings.theme);
      route('app');
    } else {
      NovaTheme.init();
      route('landing');
    }
  }

  return { route, toast, persistSetting, init };
})();

document.addEventListener('DOMContentLoaded', NovaApp.init);
