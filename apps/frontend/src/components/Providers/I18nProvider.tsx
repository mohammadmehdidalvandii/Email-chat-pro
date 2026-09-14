'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n, { DEFAULT_LOCALE, LOCALE_META, type Locale } from '../../config/i18n.config'
import { getInitialLanguage, persistLocale } from '../../i18n/storage'

/**
 * Client provider that exposes the shared i18next instance to the tree and
 * keeps the document attributes (`lang`, `dir`) in sync with the active
 * language. Mounted once in the root layout.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const applyDocumentLocale = (language: string) => {
      const meta = LOCALE_META[language as Locale]
      if (!meta) return
      document.documentElement.lang = language
      document.documentElement.dir = meta.dir
    }

    applyDocumentLocale(i18n.resolvedLanguage ?? i18n.language)

    const onLanguageChanged = (language: string) => {
      applyDocumentLocale(language)
      if (language === 'en' || language === 'fa') {
        persistLocale(language)
      }
    }
    i18n.on('languageChanged', onLanguageChanged)

    // The i18next instance initializes with DEFAULT_LOCALE so SSR and the
    // first client render agree (no hydration mismatch). After mount, restore
    // a previously persisted language — this triggers `languageChanged`, which
    // applies the document attributes and re-persists the choice.
    const persisted = getInitialLanguage(DEFAULT_LOCALE)
    if (persisted !== i18n.resolvedLanguage) {
      void i18n.changeLanguage(persisted)
    }

    return () => {
      i18n.off('languageChanged', onLanguageChanged)
    }
  }, [])

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
