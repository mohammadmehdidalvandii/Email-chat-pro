import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { I18nProvider } from '../components/Providers/I18nProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Email-Chat-Pro',
  description: 'Real-time 1-on-1 messaging platform.',
}

// `lang`/`dir` default to English (the app's default locale). I18nProvider is a
// client component that flips these to `fa`/`rtl` after hydration when a
// Persian preference is restored.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  )
}
