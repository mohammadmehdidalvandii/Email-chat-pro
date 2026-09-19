'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { AuthLayout } from '../../components/auth/AuthLayout'
import { EmailVerificationForm } from '../../components/auth/EmailVerificationForm'

export default function VerifyEmailPage() {
  const { t } = useTranslation('auth', { useSuspense: false })
  return (
    <AuthLayout
      title={t('verifyEmailTitle')}
      description={t('verifyEmailDescription')}
      footer={
        <Link href="/login" className="text-sm text-neutral-600 hover:underline">
          {t('goToLogin')}
        </Link>
      }
    >
      <EmailVerificationForm />
    </AuthLayout>
  )
}
