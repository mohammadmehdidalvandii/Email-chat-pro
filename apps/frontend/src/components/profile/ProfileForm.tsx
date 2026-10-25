/**
 * ProfileForm — profile viewing and editing form
 * (current-task.md §Phase 2 — Components Required).
 *
 * Displays the authenticated user's profile and allows editing username, full
 * name, and bio. Uses React Hook Form + Zod for client-side validation, and a
 * TanStack Query mutation for the PATCH /users/me call. Backend validation
 * remains authoritative, so a rejected save is reported with the backend's own
 * error code translated through the `errors` namespace.
 *
 * Avatar upload functionality allows users to change or remove their avatar.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { ChangeEvent, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  useUpdateProfileMutation,
  useUploadAvatarMutation,
  useRemoveAvatarMutation,
} from '../../hooks/use-profile-mutations'
import { useProfile } from '../../hooks/use-profile-query'
import { profileSchema, type ProfileFormValues } from '../../lib/validation/profile.schema'
import { toApiRequestError } from '../../lib/api/client'
import { translateApiError } from '../../i18n/errors'
import { UserAvatar } from '../common/UserAvatar'
import { Button } from '../ui/button'
import { FormField } from '../auth/FormField'

export function ProfileForm() {
  const { t } = useTranslation(['profile', 'common', 'errors'], { useSuspense: false })
  const { data: profile, isLoading, isError, refetch } = useProfile()
  const mutation = useUpdateProfileMutation()
  const uploadAvatarMutation = useUploadAvatarMutation()
  const removeAvatarMutation = useRemoveAvatarMutation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { username: '', fullName: '', bio: '' },
  })

  // Sync form defaults when profile data arrives from the server.
  useEffect(() => {
    if (profile) {
      reset({
        username: profile.username ?? '',
        fullName: profile.fullName ?? '',
        bio: profile.bio ?? '',
      })
    }
  }, [profile, reset])

  const onSubmit = handleSubmit(async (values) => {
    await mutation.mutateAsync(values)
  })

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    await uploadAvatarMutation.mutateAsync(formData)
  }

  const onRemoveAvatar = async () => {
    await removeAvatarMutation.mutateAsync()
  }

  const loading = isSubmitting || mutation.isPending || uploadAvatarMutation.isPending || removeAvatarMutation.isPending

  if (isLoading) {
    return <p className="text-sm text-text-muted">{t('common:loading')}</p>
  }

  if (isError || !profile) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-error" role="alert">
          {t('profile:loadError')}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-sm text-text-secondary underline underline-offset-4"
        >
          {t('common:retry')}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <div className="flex items-center gap-4">
        <UserAvatar user={profile} size="lg" />
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">{t('profile:profileTitle')}</h2>
          <p className="text-sm text-text-muted" dir="ltr">
            {profile.email}
          </p>
          <div className="flex gap-2 mt-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={onFileChange}
              className="hidden"
              accept="image/*"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              {t('profile:uploadAvatar')}
            </Button>
            {profile.avatarUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onRemoveAvatar}
                disabled={loading}
                className="text-error hover:text-error-hover"
              >
                {t('profile:removeAvatar')}
              </Button>
            )}
          </div>
        </div>
      </div>

      <FormField
        id="username"
        label={t('profile:username')}
        registration={register('username')}
        error={errors.username}
        dir="ltr"
        hint={t('profile:usernameHint')}
      />
      <FormField
        id="fullName"
        label={t('profile:fullName')}
        registration={register('fullName')}
        error={errors.fullName}
        dir="auto"
      />
      <FormField
        id="bio"
        label={t('profile:bio')}
        registration={register('bio')}
        error={errors.bio}
        dir="auto"
        hint={t('profile:bioHint')}
      />

      <div className="flex items-center gap-3">
        <Button type="submit" isLoading={loading} disabled={!isDirty}>
          {loading ? t('profile:saving') : t('profile:save')}
        </Button>
        {mutation.isSuccess && !loading && (
          <p className="text-sm text-success" role="status">
            {t('profile:saved')}
          </p>
        )}
      </div>

      {(mutation.isError || uploadAvatarMutation.isError || removeAvatarMutation.isError) && (
        <p className="text-sm text-error" dir="auto" role="alert">
          {translateApiError(
            toApiRequestError(
              mutation.error ?? uploadAvatarMutation.error ?? removeAvatarMutation.error
            ).code,
            t('profile:updateFailed')
          )}
        </p>
      )}
    </form>
  )
}
