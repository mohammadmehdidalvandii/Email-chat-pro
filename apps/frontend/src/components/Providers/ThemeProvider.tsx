'use client'

/**
 * ThemeProvider — applies the persisted theme to the document root
 * before hydration completes, preventing a flash of light mode.
 *
 * Reads `useThemeStore.getState()` directly (non-reactive, safe at
 * component-initialization time) per the same pattern used by
 * `getAuthToken()` in `auth.store.ts`. Then watches store changes
 * to keep `<html class="dark">` in sync with toggles/meta changes.
 */
import { useEffect } from 'react'
import { useThemeStore, applyTheme } from '../../stores/theme.store'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Apply once on mount (before/render) to avoid flash.
  const initialTheme = useThemeStore.getState().theme
  applyTheme(initialTheme)

  // Watch for theme changes (toggle, persist hydration, etc.).
  const theme = useThemeStore((s) => s.theme)
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return <>{children}</>
}
