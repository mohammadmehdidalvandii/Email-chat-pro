/**
 * ProfileForm — profile viewing and editing form
 * (current-task.md §Phase 2 — Components Required).
 *
 * Displays the authenticated user's profile and allows editing
 * username, full name, and bio. Uses React Hook Form + Zod for
 * client-side validation, and TanStack Query mutation for the
 * PATCH /users/me call. Backend validation remains authoritative.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useUpdateProfileMutation } from '../../hooks/use-profile-mutations'
import { useProfile } from '../../hooks/use-profile-query'
import { profileSchema, type ProfileFormValues } from '../../lib/validation/profile.schema'
import { Button } from '../ui/button'
import { FormField } from '../auth/FormField'

export function ProfileForm() {
  const { t } = useTranslation('profile', { useSuspense: false })
  const { data: profile, isLoading, isError } = useProfile()
  const mutation = useUpdateProfileMutation()

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

  const loading = isSubmitting || mutation.isPending

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100">
        <p className="text-sm text-neutral-500">{t('loading')}</p>
      </main>
    )
  }

  if (isError || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100">
        <p className="text-sm text-red-600">{t('loadError')}</p>
      </main>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">{t('profileTitle')}</h2>
        <p className="text-sm text-neutral-500">{profile.email}</p>
      </div>

      <FormField
        id="username"
        label={t('username')}
        registration={register('username')}
        error={errors.username}
        dir="ltr"
        hint={t('usernameHint')}
      />
      <FormField
        id="fullName"
        label={t('fullName')}
        registration={register('fullName')}
        error={errors.fullName}
        dir="ltr"
      />
      <FormField
        id="bio"
        label={t('bio')}
        registration={register('bio')}
        error={errors.bio}
        dir="auto"
        hint={t('bioHint')}
      />

      <Button type="submit" isLoading={loading} disabled={!isDirty}>
        {loading ? t('saving') : t('save')}
      </Button>

      {mutation.isError && mutation.error && (
        <p className="text-sm text-red-600" dir="auto" role="alert">
          {mutation.error.message}
        </p>
      )}
    </form>
  )
}
