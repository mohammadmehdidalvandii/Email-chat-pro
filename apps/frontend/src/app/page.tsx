'use client'

/**
 * / — entry point.
 *
 * The product has no public landing page, so the root route is only a router:
 * it sends an authenticated visitor to the dashboard and everyone else to
 * login. `useSession` validates the persisted JWT against GET /auth/session;
 * an absent token leaves the query disabled, which is the "not signed in"
 * case rather than an error.
 *
 * The document title is kept in sync with the active language; the layout
 * Metadata supplies the static English title for SSR/crawlers.
 */
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSession } from '../hooks/use-session'
import { useAuthStore } from '../stores/auth.store'

export default function Home() {
  const { t } = useTranslation('common', { useSuspense: false })
  const router = useRouter()
  const token = useAuthStore((s) => s.token)
  const hasSessionResolved = useAuthStore((s) => s.hasSessionResolved)
  const { isError, isLoading } = useSession()

  useEffect(() => {
    document.title = t('appName')
  }, [t])

  // A rejected session (expired/invalid JWT) means the token was cleared by the
  // query; the visitor is not authenticated either way.
  useEffect(() => {
    const signedIn = Boolean(token) && !isError
    if (isLoading || (token && !hasSessionResolved)) return
    void router.replace(signedIn ? '/dashboard' : '/login')
  }, [token, isError, isLoading, hasSessionResolved, router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 text-neutral-900">
      <p className="text-sm text-neutral-500" role="status">
        {t('redirecting')}
      </p>
    </main>
  )
}
