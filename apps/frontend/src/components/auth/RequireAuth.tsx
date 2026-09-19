'use client'

/**
 * RequireAuth — client-side route guard for protected pages
 * (current-task.md §Phase 1 — Protected routes).
 *
 * On mount it triggers the `session` query (validates the persisted JWT against
 * GET /auth/session) and gates rendering until the check resolves. An
 * unauthenticated or rejected session redirects to /login. Backend
 * authorization remains authoritative; this guard is a UX layer that keeps
 * authenticated users in the app and bounces others to login.
 */
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSession } from '../../hooks/use-session'
import { useAuthStore } from '../../stores/auth.store'

export interface RequireAuthProps {
  children: ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { t } = useTranslation('common', { useSuspense: false })
  const router = useRouter()
  const token = useAuthStore((s) => s.token)
  const hasSessionResolved = useAuthStore((s) => s.hasSessionResolved)
  const { isError, isLoading } = useSession()

  // No persisted token at all → there is nothing to validate; go to login.
  useEffect(() => {
    if (!token) {
      void router.replace('/login')
    }
  }, [token, router])

  // Session query rejected (expired/invalid JWT) → clear and go to login.
  useEffect(() => {
    if (hasSessionResolved && isError) {
      void router.replace('/login')
    }
  }, [hasSessionResolved, isError, router])

  // Still checking the session → show a minimal loading state.
  if (token && isLoading && !hasSessionResolved) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100">
        <p className="text-sm text-neutral-500">{t('loading')}</p>
      </main>
    )
  }

  // If we have a token but the session check failed, render nothing while the
  // redirect effect fires.
  if (token && isError) return null

  return <>{children}</>
}
