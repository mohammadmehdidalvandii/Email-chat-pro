import type { Locale } from '../config/i18n.config'

/** localStorage key under which the chosen language is persisted. */
export const LOCALE_STORAGE_KEY = 'email-chat-pro.locale'

const SUPPORTED_LOCALE_VALUES: readonly string[] = ['en', 'fa']

/** Type guard for a stored/parsed language value. */
export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && SUPPORTED_LOCALE_VALUES.includes(value)
}

/**
 * Returns the persisted language (when running in a browser) or the given
 * fallback on the server / first visit.
 */
export function getInitialLanguage(fallback: Locale): Locale {
  if (typeof window === 'undefined') return fallback
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    return isLocale(stored) ? stored : fallback
  } catch {
    return fallback
  }
}

/** Persists the active language across sessions. No-op outside a browser. */
export function persistLocale(locale: Locale): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // Storage unavailable (e.g. privacy mode) — language stays session-only.
  }
}
