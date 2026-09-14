'use client'

import { useTranslation } from 'react-i18next'
import { LOCALE_META, SUPPORTED_LOCALES, type Locale } from '../../config/i18n.config'

/**
 * Language switcher (architecture.md: Layout/LanguageSwitcher.tsx). Changing
 * the selection updates the i18next language; I18nProvider reacts by flipping
 * the document `dir`/`lang` and persisting the choice.
 */
export function LanguageSwitcher() {
  const { i18n, t } = useTranslation('common', { useSuspense: false })
  const current = (i18n.resolvedLanguage ?? i18n.language ?? 'en') as string as Locale

  return (
    <label className="flex items-center gap-2 text-sm text-neutral-400">
      <span>{t('language')}</span>
      <select
        value={current}
        onChange={(event) => {
          void i18n.changeLanguage(event.target.value)
        }}
        className="rounded bg-neutral-800 px-2 py-1 text-neutral-200"
      >
        {SUPPORTED_LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_META[code].label}
          </option>
        ))}
      </select>
    </label>
  )
}
