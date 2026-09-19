'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { AuthLayout } from '../../components/auth/AuthLayout'
import { LoginForm } from '../../components/auth/LoginForm'

export default function LoginPage() {
  const { t } = useTranslation('auth', { useSuspense: false })
  return (
    <AuthLayout
      title={t('loginTitle')}
      description={t('loginDescription')}
      footer={
        <div className="flex flex-col items-center gap-1 text-sm text-neutral-600">
          <Link href="/register" className="hover:underline">
            {t('noAccount')} {t('register')}
          </Link>
          <Link href="/verify-email" className="hover:underline">
            {t('goToVerify')}
          </Link>
        </div>
      }
    >
      <LoginForm />
    </AuthLayout>
  )
}
