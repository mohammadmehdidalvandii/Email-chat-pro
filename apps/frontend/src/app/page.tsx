'use client'

import { API_BASE_PATH } from '@email-chat-pro/constants'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../components/Layout/LanguageSwitcher'

export default function Home() {
  const { i18n, t, ready } = useTranslation('common', { useSuspense: false })

  // Keep the browser tab title in sync with the active language. The layout
  // Metadata provides the static English title for SSR/crawlers.
  useEffect(() => {
    document.title = t('appName')
  }, [t, i18n.resolvedLanguage])

  return (
    <main className="flex min-h-screen flex-col bg-neutral-950 text-white">
      <div className="flex justify-end p-6">
        <LanguageSwitcher />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 pb-24">
        <h1 className="text-4xl font-bold tracking-tight" dir="auto">
          {t('appName')}
        </h1>
        {ready && <p className="text-neutral-400">{t('foundationReady')}</p>}
        <code className="rounded bg-neutral-800 px-2 py-1 text-sm text-neutral-300">
          {t('apiLabel')}: {API_BASE_PATH}
        </code>
      </div>
    </main>
  )
}
