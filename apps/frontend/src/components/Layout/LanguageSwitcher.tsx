'use client'

import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { LOCALE_META, SUPPORTED_LOCALES, DEFAULT_LOCALE, type Locale } from '../../config/i18n.config'

/**
 * Language switcher (architecture.md: Layout/LanguageSwitcher.tsx). Changing
 * the selection updates the i18next language; I18nProvider reacts by flipping
 * the document `dir`/`lang` and persisting the choice.
 */
/** id linking the visible label to the select. */
const SELECT_ID = 'language-switcher'

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation('common', { useSuspense: false })
  // Narrow through the same SUPPORTED_LOCALES guard as `getActiveLocale`
  // instead of asserting, so an unsupported i18next language cannot leave the
  // select showing no matching option.
  const active = i18n.resolvedLanguage ?? i18n.language ?? DEFAULT_LOCALE
  const current: Locale = SUPPORTED_LOCALES.includes(active as Locale)
    ? (active as Locale)
    : DEFAULT_LOCALE

  return (
    // Mirrors the SidebarItem control language: rounded-md, the same offset
    // focus ring, and muted neutral text. The switch logic below is untouched.
    <label htmlFor={SELECT_ID} className="block space-y-1.5">
      <span className="block text-xs font-medium text-neutral-500">{t('language')}</span>
      <span className="relative block">
        <select
          id={SELECT_ID}
          value={current}
          onChange={(event) => {
            void i18n.changeLanguage(event.target.value)
          }}
          className="w-full appearance-none rounded-md border-0 bg-neutral-100 py-2 ps-3 pe-8 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
        >
          {SUPPORTED_LOCALES.map((code) => (
            <option key={code} value={code}>
              {LOCALE_META[code].label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
          aria-hidden
        />
      </span>
    </label>
  )
}
