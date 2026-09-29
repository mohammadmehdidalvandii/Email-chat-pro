'use client'

/**
 * AppShell — the authenticated application chrome
 * (architecture.md §Layout — authenticated pages share one shell).
 *
 * Every protected page renders inside this shell, so the navigation (Dashboard,
 * Chats, Contacts, User search, Profile, Logout) is always one click away. The
 * session socket is opened once by `SocketProvider` above this shell, not per
 * page, so the user's presence does not change as they move between screens.
 *
 * Layout: a persistent sidebar on desktop that becomes a drawer below the `md`
 * breakpoint. Both breakpoints share `AppSidebar`, so the links, the active
 * state, and the logout control are identical in each. Public pages (login,
 * register, verify-email) do not use this shell at all and are unaffected.
 *
 * Layout only — it composes the existing design system (neutral palette, same
 * spacing scale) and adds no new visual language.
 */
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Menu } from 'lucide-react'
import { AppSidebar } from './AppSidebar'
import { MobileSidebar } from './MobileSidebar'

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation('common', { useSuspense: false })
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  // Close the drawer whenever navigation happens.
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  return (
    <div className="flex min-h-screen bg-neutral-100 text-neutral-900">
      {/* Desktop: persistent sidebar, always visible. */}
      <aside className="hidden w-64 shrink-0 border-e border-neutral-200 md:block">
        {/* Sticky so the nav stays put while a long page scrolls. */}
        <div className="sticky top-0 h-screen">
          <AppSidebar />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile-only bar: the menu button that opens the drawer. */}
        <header className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 md:hidden">
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="app-mobile-nav"
            aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-md p-2 text-neutral-700 hover:bg-neutral-100"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <span className="text-base font-bold tracking-tight">{t('appName')}</span>
        </header>

        <MobileSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

        {/* Pages keep their own max-width containers, so the column is unconstrained. */}
        <main className="flex-1 px-4 py-6 md:py-8">{children}</main>
      </div>
    </div>
  )
}
