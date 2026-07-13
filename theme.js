/* =========================================================
   NOVA AI — theme.js
   Light / dark mode toggle with persistence per user.
========================================================= */

const NovaTheme = (() => {
  function apply(theme) {
    document.body.setAttribute('data-theme', theme);
    const icon = document.getElementById('theme-icon');
    const label = document.getElementById('theme-label');
    if (icon) icon.textContent = theme === 'dark' ? '🌙' : '☀️';
    if (label) label.textContent = theme === 'dark' ? 'Dark mode' : 'Light mode';

    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = theme === 'dark' ? '#07070d' : '#f6f5fb';
  }

  function current() {
    return document.body.getAttribute('data-theme') || 'dark';
  }

  function toggle() {
    const next = current() === 'dark' ? 'light' : 'dark';
    apply(next);
    if (window.NovaApp && typeof window.NovaApp.persistSetting === 'function') {
      window.NovaApp.persistSetting('theme', next);
    }
    return next;
  }

  function init(savedTheme) {
    const theme = savedTheme || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    apply(theme);
  }

  return { init, toggle, apply, current };
})();
