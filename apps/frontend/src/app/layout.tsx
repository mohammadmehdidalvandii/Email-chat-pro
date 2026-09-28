import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { I18nProvider } from '../components/Providers/I18nProvider'
import { QueryProvider } from '../components/Providers/QueryProvider'
import { SocketProvider } from '../components/Providers/SocketProvider'
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
        <I18nProvider>
          {/* QueryProvider must wrap SocketProvider: the socket writes incoming
              messages into the query cache and calls useQueryClient(). The
              socket still sits above the router, so one connection spans every
              authenticated page — see SocketProvider for why it is session-scoped. */}
          <QueryProvider>
            <SocketProvider>{children}</SocketProvider>
          </QueryProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
