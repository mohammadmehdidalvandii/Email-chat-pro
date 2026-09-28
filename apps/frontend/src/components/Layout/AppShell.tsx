'use client'

/**
 * AppShell — the authenticated application chrome
 * (architecture.md §Layout — authenticated pages share one shell).
 *
 * Every protected page renders inside this shell, so the navigation links
 * (Dashboard, Chats, Contacts, User search, Profile, Logout) are reachable
 * without typing a URL. The session socket is opened once by `SocketProvider`
 * above this shell, not per page, so the user's presence does not change as
 * they move between screens.
 *
 * Layout only — it composes the existing design system (neutral palette, same
 * spacing scale) and adds no new visual language.
 */
import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageCircle, Search, Settings, Users, LayoutDashboard, LogOut, Menu, X } from 'lucide-react'
import { useLogoutMutation } from '../../hooks/use-auth-mutations'
import { useAuthStore } from '../../stores/auth.store'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Button } from '../ui/button'

const NAV_ITEMS = [
  { href: '/dashboard', key: 'dashboard', icon: LayoutDashboard },
  { href: '/chats', key: 'chats', icon: MessageCircle },
  { href: '/contacts', key: 'contacts', icon: Users },
  { href: '/search', key: 'search', icon: Search },
  { href: '/settings/profile', key: 'profile', icon: Settings },
] as const

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation(['common', 'auth'], { useSuspense: false })
  const pathname = usePathname()
  const router = useRouter()
  const logout = useLogoutMutation()
  const user = useAuthStore((s) => s.user)
  const [menuOpen, setMenuOpen] = useState(false)

  // Close the mobile drawer whenever navigation happens.
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  const onLogout = () => {
    void logout.mutateAsync().finally(() => {
      router.replace('/login')
    })
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-100 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/dashboard"
            className="text-lg font-bold tracking-tight"
            dir="auto"
          >
            {t('appName')}
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden items-center gap-1 md:flex" aria-label={t('nav.dashboard')}>
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={t(`nav.${item.key}`)}
                active={isActive(item.href)}
                icon={<item.icon className="h-4 w-4" aria-hidden />}
              />
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-neutral-500 sm:inline" dir="ltr">
              {user?.email}
            </span>
            <LanguageSwitcher />
            <Button
              variant="secondary"
              size="sm"
              onClick={onLogout}
              isLoading={logout.isPending}
              className="hidden md:inline-flex"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              {t('auth:logOut')}
            </Button>
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-controls="app-mobile-nav"
              aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
              onClick={() => setMenuOpen((open) => !open)}
              className="rounded-md p-2 text-neutral-700 hover:bg-neutral-100 md:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            </button>
          </div>
        </div>

        {/* Mobile navigation drawer */}
        {menuOpen && (
          <nav
            id="app-mobile-nav"
            className="flex flex-col gap-1 border-t border-neutral-200 px-4 py-3 md:hidden"
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={t(`nav.${item.key}`)}
                active={isActive(item.href)}
                icon={<item.icon className="h-4 w-4" aria-hidden />}
              />
            ))}
            <Button
              variant="secondary"
              size="sm"
              onClick={onLogout}
              isLoading={logout.isPending}
              className="mt-2"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              {t('auth:logOut')}
            </Button>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  )
}

function NavLink({
  href,
  label,
  active,
  icon,
}: {
  href: string
  label: string
  active: boolean
  icon: ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-neutral-900 text-white'
          : 'text-neutral-700 hover:bg-neutral-100'
      }`}
    >
      {icon}
      {label}
    </Link>
  )
}
