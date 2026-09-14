import { getI18n } from 'react-i18next'
import { DEFAULT_LOCALE, LOCALE_META, SUPPORTED_LOCALES, type Locale } from '../config/i18n.config'

/**
 * Locale-aware formatting helpers (stack.md §11 — dates/numbers rendered by the
 * frontend follow the active `fa-IR` / `en-US` locale). The active locale is
 * read from the shared i18next instance, so formatting reacts to the current
 * language without any extra state.
 */

/** Active locale from i18next, falling back to the default when unset. */
export function getActiveLocale(): Locale {
  const i18n = getI18n()
  const resolved = i18n?.resolvedLanguage ?? i18n?.language ?? DEFAULT_LOCALE
  return SUPPORTED_LOCALES.includes(resolved as Locale) ? (resolved as Locale) : DEFAULT_LOCALE
}

/** Map a locale code to the `Intl` tag used by the formatting APIs. */
export function toIntlLocale(language: Locale): string {
  return LOCALE_META[language].intl
}

/**
 * Format a date in the active locale. Returns `null` for an invalid value so
 * callers can decide what to render instead of leaking "Invalid Date".
 */
export function formatDate(
  value: number | string | Date,
  options?: Intl.DateTimeFormatOptions,
): string | null {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(toIntlLocale(getActiveLocale()), options).format(date)
}

/** Format a number in the active locale (e.g. fa-IR Persian digits). */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(toIntlLocale(getActiveLocale()), options).format(value)
}
