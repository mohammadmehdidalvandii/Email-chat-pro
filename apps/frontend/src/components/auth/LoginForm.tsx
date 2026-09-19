'use client'

/**
 * LoginForm — login form with email/password
 * (current-task.md §Phase 1 — Components Required).
 *
 * On success the `useLoginMutation` stores the returned JWT + user in the auth
 * store; this form then redirects to the protected dashboard. The unverified-
 * account case is distinguished from invalid credentials via
 * {@link authErrorMessage} so the user is prompted to verify their email.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useLoginMutation } from '../../hooks/use-auth-mutations'
import { authErrorMessage } from '../../lib/api/error-message'
import { loginSchema, type LoginFormValues } from '../../lib/validation/auth.schema'
import { toApiRequestError } from '../../lib/api/client'
import { Button } from '../ui/button'
import { FormField } from './FormField'

export function LoginForm() {
  const { t } = useTranslation('auth', { useSuspense: false })
  const router = useRouter()
  const mutation = useLoginMutation()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      await mutation.mutateAsync({ email: values.email, password: values.password })
      router.push('/dashboard')
    } catch (error) {
      setSubmitError(authErrorMessage(toApiRequestError(error)))
    }
  })

  const loading = isSubmitting || mutation.isPending

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <FormField
        id="email"
        label={t('email')}
        type="email"
        autoComplete="email"
        dir="ltr"
        registration={register('email')}
        error={errors.email}
      />
      <FormField
        id="password"
        label={t('password')}
        type="password"
        autoComplete="current-password"
        dir="ltr"
        registration={register('password')}
        error={errors.password}
      />

      {submitError && (
        <p className="text-sm text-red-600" dir="auto" role="alert">
          {submitError}
        </p>
      )}

      <Button type="submit" isLoading={loading} className="mt-2 w-full">
        {loading ? t('loggingIn') : t('logIn')}
      </Button>
    </form>
  )
}
