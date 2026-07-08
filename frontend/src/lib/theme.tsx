import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

/** Light/dark theming per the design: tokens live in tokens.css keyed off
    the html element's data-theme; the choice persists in localStorage under
    the same key the prototype used. */

export type Theme = 'light' | 'dark'

const UI_PREFS_KEY = 'job-tracker-ui-prefs-v1'

function loadTheme(): Theme {
  try {
    const raw = localStorage.getItem(UI_PREFS_KEY)
    if (raw && JSON.parse(raw).theme === 'dark') return 'dark'
  } catch {
    /* unreadable prefs — fall back to light */
  }
  return 'light'
}

function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify({ theme }))
  } catch {
    /* storage unavailable — theme just won't persist */
  }
}

const ThemeContext = createContext<{ theme: Theme; set: (theme: Theme) => void }>({
  theme: 'light',
  set: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(loadTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const set = useCallback((next: Theme) => {
    saveTheme(next)
    setTheme(next)
  }, [])

  return <ThemeContext.Provider value={{ theme, set }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
