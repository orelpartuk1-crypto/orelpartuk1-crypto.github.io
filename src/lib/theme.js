const KEY = 'db_theme' // 'light' | 'dark' | 'system'

export const getTheme = () => localStorage.getItem(KEY) || 'system'

const prefersDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches

export function isDark(theme = getTheme()) {
  return theme === 'dark' || (theme === 'system' && prefersDark())
}

export function applyTheme(theme = getTheme()) {
  const dark = isDark(theme)
  document.documentElement.classList.toggle('dark', dark)
  // The browser chrome around the page has to move with it, otherwise a dark
  // app sits under a bright status bar on the home-screen install.
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? '#0e1611' : '#eff3ed')
  return dark
}

export function setTheme(theme) {
  localStorage.setItem(KEY, theme)
  return applyTheme(theme)
}

// Called once at startup. While the choice is "system", the app keeps following
// the OS — someone who switches their phone to dark at sunset expects this to
// follow without reopening it.
export function initTheme() {
  applyTheme()
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getTheme() === 'system') applyTheme('system')
  })
}
