'use client'

/**
 * TanStack Query provider (rules.md §State Management — server state).
 *
 * Mounted once in the root layout alongside the i18n provider. A stable
 * QueryClient is created once per browser session via a module-level singleton
 * so React's StrictMode double-invoke in dev does not share cache between
 * instances.
 */
import type { ReactNode } from 'react'
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Avoid hammering the backend on mount/refocus for this phase's
            // small set of endpoints; individual queries override as needed.
            refetchOnWindowFocus: false,
            retry: false,
          },
        },
      }),
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
