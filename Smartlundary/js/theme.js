// js/theme.js
// Manages dark/light theme toggle + persistence

const STORAGE_KEY = 'color-theme';

function getPreferredTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return saved;
  // Respect OS-level dark mode preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY, theme);

  // Update all toggle thumbs on the page
  document.querySelectorAll('.theme-toggle-thumb').forEach(thumb => {
    thumb.textContent = theme === 'dark' ? '🌙' : '☀️';
  });
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  });
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// Apply immediately (before DOM ready) to avoid flash of wrong theme
applyTheme(getPreferredTheme());

export { applyTheme, toggleTheme, getPreferredTheme };
