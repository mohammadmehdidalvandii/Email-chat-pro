'use client'

/**
 * /dashboard — minimal protected page for Phase 1
 * (current-task.md §Phase 1 — Protected routes).
 *
 * Gated by RequireAuth, which validates the session against GET /auth/session
 * and redirects unauthenticated users to /login. The page itself shows the
 * authenticated user's email and a logout button so the Phase 1 verification
 * criteria (protected access, logout clears session + redirects) can be
 * exercised. Richer navigation lands with later phases.
 */
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../../components/Layout/LanguageSwitcher'
import { RequireAuth } from '../../components/auth/RequireAuth'
import { Button } from '../../components/ui/button'
import { useLogoutMutation } from '../../hooks/use-auth-mutations'
import { useAuthStore } from '../../stores/auth.store'

function DashboardContent() {
  const { t } = useTranslation(['common', 'auth'], { useSuspense: false })
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const logout = useLogoutMutation()

  const onLogout = () => {
    void logout.mutateAsync().finally(() => {
      router.replace('/login')
    })
  }

  return (
    <main className="flex min-h-screen flex-col bg-neutral-100 text-neutral-900">
      <div className="flex items-center justify-between p-6">
        <span className="text-sm text-neutral-500">{user?.email}</span>
        <LanguageSwitcher />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <h1 className="text-3xl font-bold tracking-tight" dir="auto">
          {t('appName')}
        </h1>
        <p className="text-neutral-500" dir="auto">{user?.email}</p>
        <Button variant="secondary" onClick={onLogout} isLoading={logout.isPending}>
          {t('auth:logOut')}
        </Button>
      </div>
    </main>
  )
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  )
}
