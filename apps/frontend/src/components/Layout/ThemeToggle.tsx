'use client'

/**
 * ThemeToggle — switches the app between light and dark themes.
 *
 * Rendered next to `LanguageSwitcher` (spec §1). Uses the existing
 * `lucide-react` icon library (Sun/Moon) and the existing
 * `useThemeStore` (spec §2). Accessible: visible button with an
 * `aria-label`, keyboard-focusable, and a visible focus ring.
 * The icon alone is not the only indicator — the aria-label
 * carries the state (spec §11).
 */
import { useThemeStore } from '../../stores/theme.store'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="
        inline-flex h-[2.625rem] w-[2.625rem] items-center justify-center
        rounded-lg border border-border bg-card text-text-main shadow-sm
        transition-all duration-150 ease-out
        hover:border-border-hover hover:shadow hover:-translate-y-px
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-primary/20 focus-visible:border-border-hover
        focus-visible:shadow-md
        active:translate-y-0 active:shadow-sm
      "
    >
      {isDark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
    </button>
  )
}
