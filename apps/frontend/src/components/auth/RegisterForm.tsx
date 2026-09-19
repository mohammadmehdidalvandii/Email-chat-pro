'use client'

/**
 * RegisterForm — registration form with email/password validation
 * (current-task.md §Phase 1 — Components Required).
 *
 * Uses React Hook Form + Zod (resolvers) for client-side validation, and the
 * TanStack Query `useRegisterMutation` for the API call. On success it routes
 * the user to the email-verification page. Backend validation remains
 * authoritative; field errors here are for immediate feedback only.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useRegisterMutation } from '../../hooks/use-auth-mutations'
import { authErrorMessage } from '../../lib/api/error-message'
import { registerSchema, type RegisterFormValues } from '../../lib/validation/auth.schema'
import { toApiRequestError } from '../../lib/api/client'
import { Button } from '../ui/button'
import { FormField } from './FormField'

export function RegisterForm() {
  const { t } = useTranslation('auth', { useSuspense: false })
  const router = useRouter()
  const mutation = useRegisterMutation()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      await mutation.mutateAsync({ email: values.email, password: values.password })
      router.push('/verify-email')
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
        autoComplete="new-password"
        dir="ltr"
        registration={register('password')}
        error={errors.password}
      />
      <FormField
        id="confirmPassword"
        label={t('confirmPassword')}
        type="password"
        autoComplete="new-password"
        dir="ltr"
        registration={register('confirmPassword')}
        error={errors.confirmPassword}
      />

      {submitError && (
        <p className="text-sm text-red-600" dir="auto" role="alert">
          {submitError}
        </p>
      )}

      <Button type="submit" isLoading={loading} className="mt-2 w-full">
        {loading ? t('registering') : t('register')}
      </Button>
    </form>
  )
}
