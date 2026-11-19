export type ThemePreference = 'light' | 'dark' | 'system'

export const THEME_STORAGE_KEY = 'sashacrush:theme'

export function readThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'system') {
      return value
    }
  } catch {
    // ignore
  }
  return 'system'
}

export function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'light' || preference === 'dark') {
    return preference
  }
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
  return 'light'
}

export function applyResolvedTheme(resolved: 'light' | 'dark') {
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.classList.toggle('light', resolved === 'light')
  root.style.colorScheme = resolved
}

export function applyThemePreference(preference: ThemePreference) {
  applyResolvedTheme(resolveTheme(preference))
}

export function storeThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // ignore
  }
}

export const THEME_LABELS: Record<ThemePreference, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}
