/**
 * Theme state (Zustand with localStorage persistence).
 *
 * Theme is client state: it is UI presentation only, so it lives in a
 * Zustand store per rules.md §State Management — not in TanStack Query
 * (it is not server state). The `persist` middleware handles
 * localStorage synchronization so no second persistence mechanism is
 * needed (spec §3).
 *
 * Storage key follows the project's convention:
 *   - auth token:      `email-chat-pro:auth-token`
 *   - locale:          `email-chat-pro.locale`
 *   - theme:           `email-chat-pro.theme`
 *
 * Default is `light` so existing users keep the current appearance
 * unless they opt in (spec §4).
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'email-chat-pro.theme'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
    }),
    {
      name: THEME_STORAGE_KEY,
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
)

/** Applies the theme to the document root. Tailwind v4 class strategy. */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}
