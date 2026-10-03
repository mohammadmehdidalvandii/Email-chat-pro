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
 *
 * The post-deletion redirect to /login lives inside AccountDeletionModal —
 * the component that owns the mutation performing the deletion — so this page
 * deliberately holds no delete-account mutation of its own (a second
 * `useDeleteAccountMutation()` instance here would never observe the modal's
 * success and its redirect effect would never fire).
 */
import { useTranslation } from 'react-i18next'
import { AppShell } from '../../../components/Layout/AppShell'
import { RequireAuth } from '../../../components/auth/RequireAuth'
import { AccountDeletionModal } from '../../../components/profile/AccountDeletionModal'
import { ProfileForm } from '../../../components/profile/ProfileForm'
import { useProfileModalStore } from '../../../stores/profile.store'

function ProfileContent() {
  const { t } = useTranslation('profile', { useSuspense: false })
  const { openDeleteModal } = useProfileModalStore()

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
