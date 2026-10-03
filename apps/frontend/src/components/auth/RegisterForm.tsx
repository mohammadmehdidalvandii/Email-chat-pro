'use client'

/**
 * RegisterForm — registration form with email/password validation
 * (current-task.md §Phase 1 — Components Required).
 *
 * Uses React Hook Form + Zod (resolvers) for client-side validation, and the
 * TanStack Query `useRegisterMutation` for the API call. On success it shows a
 * confirmation that the verification email was sent, then routes the user to
 * the email-verification page where the token is entered. Backend validation
 * remains authoritative; field errors here are for immediate feedback only.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useRegisterMutation } from '../../hooks/use-auth-mutations'
import { authErrorMessage } from '../../lib/api/error-message'
import { registerSchema, type RegisterFormValues } from '../../lib/validation/auth.schema'
import { toApiRequestError } from '../../lib/api/client'
import { Button } from '../ui/button'
import { FormField } from './FormField'

/** How long the confirmation stays on screen before moving to the next step. */
const REDIRECT_DELAY_MS = 2500

export function RegisterForm() {
  const { t } = useTranslation('auth', { useSuspense: false })
  const router = useRouter()
  const mutation = useRegisterMutation()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [registered, setRegistered] = useState(false)

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
      setRegistered(true)
    } catch (error) {
      setSubmitError(authErrorMessage(toApiRequestError(error)))
    }
  })

  // The backend has accepted the account and sent the token; move the user on
  // to the form that consumes it.
  useEffect(() => {
    if (!registered) return
    const timer = setTimeout(() => router.push('/verify-email'), REDIRECT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [registered, router])

  const loading = isSubmitting || mutation.isPending

  if (registered) {
    return (
      <div className="flex flex-col gap-3" role="status" aria-live="polite">
        <p className="text-sm text-green-700">{t('registerSuccess')}</p>
        <p className="text-sm text-neutral-600">{t('registerSuccessNext')}</p>
        <p className="text-sm text-neutral-600">{t('checkSpamFolder')}</p>
        <Button
          type="button"
          className="mt-2 w-full"
          onClick={() => router.push('/verify-email')}
        >
          {t('goToVerify')}
        </Button>
      </div>
    )
  }

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
        showPasswordToggle
      />
      <FormField
        id="confirmPassword"
        label={t('confirmPassword')}
        type="password"
        autoComplete="new-password"
        dir="ltr"
        registration={register('confirmPassword')}
        error={errors.confirmPassword}
        showPasswordToggle
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
