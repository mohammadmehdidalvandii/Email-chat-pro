/**
 * AccountDeletionModal — confirmation modal for account deletion
 * (current-task.md §Phase 2 — Components Required).
 *
 * Requires the user's password for confirmation (DELETE /users/me
 * body: DeleteAccountInput). On success the mutation hook clears the
 * auth session and this component redirects to /login. This is the
 * component that owns the mutation that performs the deletion, so it
 * is also the one that navigates — a redirect wired to a separate
 * `useDeleteAccountMutation()` instance would never fire, because
 * `mutateAsync` only transitions the instance it was called on.
 */
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDeleteAccountMutation } from '../../hooks/use-profile-mutations'
import { useProfileModalStore } from '../../stores/profile.store'
import { toApiRequestError } from '../../lib/api/client'
import { translateApiError } from '../../i18n/errors'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

export function AccountDeletionModal() {
  const { t } = useTranslation('profile', { useSuspense: false })
  const router = useRouter()
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
      // The deletion succeeded, so the auth session has already been
      // cleared by the mutation's onSuccess handler (token removed from
      // localStorage, user state nulled, query cache emptied). Redirect
      // to /login now — never before this point, so a failed request
      // leaves the user exactly where they were.
      void router.replace('/login')
    } catch (error) {
      // `apiRequest` rejects with a plain `ApiRequestError` object rather than an
      // Error instance, so `instanceof Error` was always false and every failure
      // collapsed to the generic `deleteError` string — including a wrong
      // password. Normalize and translate through the same path ProfileForm
      // uses, so the backend's own error code is what the user sees.
      setSubmitError(
        translateApiError(toApiRequestError(error).code, t('deleteError')),
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
              {translateApiError(
                toApiRequestError(mutation.error).code,
                t('deleteError'),
              )}
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
