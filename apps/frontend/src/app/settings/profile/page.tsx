'use client'
/**
 * /settings/profile — protected profile page
 * (current-task.md §Phase 2 — Pages / Screens).
 *
 * Gated by RequireAuth, which validates the session against GET /auth/session
 * and redirects unauthenticated users to /login. The page displays the
 * authenticated user's profile (ProfileForm) and provides an account
 * deletion action (AccountDeletionModal).
 */
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../../../components/Layout/LanguageSwitcher'
import { RequireAuth } from '../../../components/auth/RequireAuth'
import { AccountDeletionModal } from '../../../components/profile/AccountDeletionModal'
import { ProfileForm } from '../../../components/profile/ProfileForm'
import { useDeleteAccountMutation } from '../../../hooks/use-profile-mutations'
import { useProfileModalStore } from '../../../stores/profile.store'

function ProfileContent() {
  const { t } = useTranslation(['common', 'profile'], { useSuspense: false })
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
    <main className="flex min-h-screen flex-col bg-neutral-100 text-neutral-900">
      <div className="flex items-center justify-between p-6">
        <LanguageSwitcher />
      </div>
      <div className="flex flex-1 flex-col items-center px-6 pb-12">
        <div className="w-full max-w-md">
          <h1 className="mb-6 text-2xl font-bold tracking-tight" dir="auto">
            {t('profileTitle')}
          </h1>
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
      </div>
      <AccountDeletionModal />
    </main>
  )
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileContent />
    </RequireAuth>
  )
}
