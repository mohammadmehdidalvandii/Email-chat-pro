'use client'

/**
 * EmailVerificationForm — verification token submission
 * (current-task.md §Phase 1 — Components Required).
 *
 * Submits the 64-character hex token to POST /auth/verify-email. On success it
 * routes the user to login. Field-level validation enforces the token shape
 * (length + hex) using the shared VERIFICATION_TOKEN_LENGTH constant; the
 * backend remains authoritative for token validity.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useVerifyEmailMutation } from '../../hooks/use-auth-mutations'
import { authErrorMessage } from '../../lib/api/error-message'
import {
  verifyEmailSchema,
  type VerifyEmailFormValues,
} from '../../lib/validation/auth.schema'
import { toApiRequestError } from '../../lib/api/client'
import { Button } from '../ui/button'
import { FormField } from './FormField'

export function EmailVerificationForm() {
  const { t } = useTranslation('auth', { useSuspense: false })
  const router = useRouter()
  const mutation = useVerifyEmailMutation()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VerifyEmailFormValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { token: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      await mutation.mutateAsync({ token: values.token })
      setSuccess(true)
      router.push('/login')
    } catch (error) {
      setSubmitError(authErrorMessage(toApiRequestError(error)))
    }
  })

  const loading = isSubmitting || mutation.isPending

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <FormField
        id="token"
        label={t('verificationToken')}
        autoComplete="off"
        dir="ltr"
        registration={register('token')}
        error={errors.token}
      />

      {success && (
        <p className="text-sm text-green-600" dir="auto" role="status">
          {t('verifySuccess')}
        </p>
      )}
      {submitError && (
        <p className="text-sm text-red-600" dir="auto" role="alert">
          {submitError}
        </p>
      )}

      <Button type="submit" isLoading={loading} className="mt-2 w-full">
        {loading ? t('verifying') : t('submit')}
      </Button>
    </form>
  )
}
