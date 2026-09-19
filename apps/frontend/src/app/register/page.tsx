'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { AuthLayout } from '../../components/auth/AuthLayout'
import { RegisterForm } from '../../components/auth/RegisterForm'

export default function RegisterPage() {
  const { t } = useTranslation('auth', { useSuspense: false })
  return (
    <AuthLayout
      title={t('registerTitle')}
      description={t('registerDescription')}
      footer={
        <Link href="/login" className="text-sm text-neutral-600 hover:underline">
          {t('haveAccount')} {t('logIn')}
        </Link>
      }
    >
      <RegisterForm />
    </AuthLayout>
  )
}
