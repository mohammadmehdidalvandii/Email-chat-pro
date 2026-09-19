/**
 * AuthLayout — centered layout wrapper for the auth pages
 * (current-task.md §Phase 1 — Components Required).
 *
 * Provides the shared two-column shell: a localized app title on the left and
 * a Card on the right that the individual auth forms compose into. Keeps the
 * forms themselves free of chrome concerns.
 */
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card'

export interface AuthLayoutProps {
  /** Localized title shown above the form card. */
  title: string
  /** Localized subtitle/description. */
  description?: string
  /** The form component rendered inside the card. */
  children: ReactNode
  /** Optional footer row (e.g. a "go to login" link). */
  footer?: ReactNode
}

export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  const { t } = useTranslation('common', { useSuspense: false })

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 p-6">
      <div className="flex w-full max-w-md flex-col gap-6">
        <h1 className="text-center text-3xl font-bold tracking-tight text-neutral-900" dir="auto">
          {t('appName')}
        </h1>
        <Card>
          <CardHeader>
            <CardTitle dir="auto">{title}</CardTitle>
            {description && <CardDescription dir="auto">{description}</CardDescription>}
          </CardHeader>
          <CardContent>{children}</CardContent>
          {footer && <CardFooter className="justify-center">{footer}</CardFooter>}
        </Card>
      </div>
    </main>
  )
}
