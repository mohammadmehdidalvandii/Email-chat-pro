/**
 * AccountDeletionModal — confirmation modal for account deletion
 * (current-task.md §Phase 2 — Components Required).
 *
 * Requires the user's password for confirmation (DELETE /users/me
 * body: DeleteAccountInput). On success, the parent clears auth
 * state and redirects via the existing session flow.
 */
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDeleteAccountMutation } from '../../hooks/use-profile-mutations'
import { useProfileModalStore } from '../../stores/profile.store'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

export function AccountDeletionModal() {
  const { t } = useTranslation('profile', { useSuspense: false })
  const { isDeleteModalOpen, closeDeleteModal } = useProfileModalStore()
  const mutation = useDeleteAccountMutation()
  const [password, setPassword] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus the password input when the modal opens; reset state on close.
  useEffect(() => {
    if (isDeleteModalOpen) {
      setPassword('')
      setSubmitError(null)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isDeleteModalOpen])

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitError(null)
    try {
      await mutation.mutateAsync({ password })
    } catch (error) {
      // The typed error from the mutation is available via mutation.error.
      setSubmitError(
        error instanceof Error ? error.message : t('deleteError'),
      )
    }
  }

  if (!isDeleteModalOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeDeleteModal()
      }}
    >
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">{t('deleteTitle')}</h2>
        <p className="mt-1 text-sm text-neutral-500">{t('deleteDescription')}</p>

        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">{t('password')}</Label>
            <Input
              ref={inputRef}
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={mutation.isPending}
            />
          </div>

          {submitError && (
            <p className="text-sm text-red-600" dir="auto" role="alert">
              {submitError}
            </p>
          )}

          {mutation.isError && mutation.error && !submitError && (
            <p className="text-sm text-red-600" dir="auto" role="alert">
              {mutation.error.message}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={closeDeleteModal}
              disabled={mutation.isPending}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={mutation.isPending}
              className="bg-red-600 hover:bg-red-700 focus-visible:outline-red-600"
            >
              {t('delete')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
