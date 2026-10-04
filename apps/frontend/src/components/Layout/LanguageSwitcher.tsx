'use client'

import { useTranslation } from 'react-i18next'
import { ChevronDown, Globe } from 'lucide-react'
import { LOCALE_META, SUPPORTED_LOCALES, DEFAULT_LOCALE, type Locale } from '../../config/i18n.config'

const SELECT_ID = 'language-switcher'

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation('common', { useSuspense: false })
  const active = i18n.resolvedLanguage ?? i18n.language ?? DEFAULT_LOCALE
  const current: Locale = SUPPORTED_LOCALES.includes(active as Locale)
    ? (active as Locale)
    : DEFAULT_LOCALE

  return (
    <div className="inline-flex items-center">
      <label htmlFor={SELECT_ID} className="sr-only">
        {t('language')}
      </label>
      <span className="relative inline-flex min-w-[8.5rem]">
        <select
          id={SELECT_ID}
          value={current}
          onChange={(event) => {
            void i18n.changeLanguage(event.target.value)
          }}
          className="
            w-full appearance-none rounded-lg border border-neutral-200/80
            bg-white px-3 py-2.5 pl-8 pr-8
            text-sm font-medium text-neutral-800 shadow-sm
            transition-all duration-150 ease-out
            hover:border-neutral-300 hover:shadow
            hover:-translate-y-px
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10
            focus-visible:border-neutral-400 focus-visible:shadow-md
            active:translate-y-0 active:shadow-sm
            dark:border-neutral-700/60 dark:bg-neutral-800 dark:text-neutral-100
            dark:hover:border-neutral-600 dark:hover:bg-neutral-700/60
            dark:focus-visible:ring-neutral-400/20
            dark:focus-visible:border-neutral-500
          "
        >
          {SUPPORTED_LOCALES.map((code) => (
            <option key={code} value={code}>
              {LOCALE_META[code].label}
            </option>
          ))}
        </select>
        {/* Icon: globe left, chevron right */}
        <Globe
          className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400 dark:text-neutral-500"
          aria-hidden
        />
        <ChevronDown
          className="pointer-events-none absolute end-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500"
          aria-hidden
        />
      </span>
    </div>
  )
}
