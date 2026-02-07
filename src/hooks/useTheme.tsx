import { createContext, useContext, useState, useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { getTheme, setTheme as persistTheme } from '@/utils/storage'
import type { ThemeId } from '@/utils/storage'

function subscribeSystemTheme(cb: () => void) {
  const m = window.matchMedia('(prefers-color-scheme: dark)')
  m.addEventListener('change', cb)
  return () => m.removeEventListener('change', cb)
}

function getSystemDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export type ThemeContextValue = {
  theme: ThemeId
  setTheme: (value: ThemeId) => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function useThemeState(): ThemeContextValue {
  const [theme, setThemeState] = useState<ThemeId>(getTheme)
  const systemDark = useSyncExternalStore(subscribeSystemTheme, getSystemDark, getSystemDark)
  const isDark = theme === 'dark' || (theme === 'system' && systemDark)

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  const setThemeValue = (value: ThemeId) => {
    persistTheme(value)
    setThemeState(value)
  }

  return { theme, setTheme: setThemeValue, isDark }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const value = useThemeState()
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
