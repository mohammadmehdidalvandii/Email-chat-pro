'use client'

/**
 * /settings/profile — protected profile page
 * (current-task.md §Phase 2 — Pages / Screens).
 *
 * Gated by RequireAuth, which validates the session against GET /auth/session
 * and redirects unauthenticated users to /login. The page displays the
 * authenticated user's profile (ProfileForm) and provides an account deletion
 * action (AccountDeletionModal). Renders inside the shared AppShell so it is
 * reachable from the navigation without typing a URL.
 */
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AppShell } from '../../../components/Layout/AppShell'
import { RequireAuth } from '../../../components/auth/RequireAuth'
import { AccountDeletionModal } from '../../../components/profile/AccountDeletionModal'
import { ProfileForm } from '../../../components/profile/ProfileForm'
import { useDeleteAccountMutation } from '../../../hooks/use-profile-mutations'
import { useProfileModalStore } from '../../../stores/profile.store'

function ProfileContent() {
  const { t } = useTranslation('profile', { useSuspense: false })
  const router = useRouter()
  const { openDeleteModal } = useProfileModalStore()
  const deleteAccount = useDeleteAccountMutation()

  // Redirect to /login when the account is successfully deleted.
  useEffect(() => {
    if (deleteAccount.isSuccess) {
      void router.replace('/login')
    }
  }, [deleteAccount.isSuccess, router])

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-md">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">{t('profileTitle')}</h1>
        <ProfileForm />
        <div className="mt-6 border-t border-neutral-200 pt-6">
          <button
            type="button"
            onClick={openDeleteModal}
            className="text-sm text-red-600 hover:underline"
          >
            {t('deleteAccount')}
          </button>
        </div>
      </div>
      <AccountDeletionModal />
    </AppShell>
  )
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileContent />
    </RequireAuth>
  )
}
