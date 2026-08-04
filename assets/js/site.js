/* Small shared behaviors: theme toggle. The initial theme is set by an
   inline script in each page's <head> (so there's no flash). */
(function () {
  var btn = document.getElementById('theme-toggle');
  if (!btn) return;

  function label() {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.textContent = dark ? '☀' : '◐'; /* sun / half-circle */
    btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  }

  btn.addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) { /* private mode etc. */ }
    label();
    window.dispatchEvent(new CustomEvent('themechange'));
  });

  label();
})();
