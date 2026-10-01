'use client'

/**
 * AppSidebar — the authenticated navigation list.
 *
 * Renders the brand, the five section links, and the footer (language switcher +
 * logout). It is rendered twice by `AppShell`: once in the persistent desktop
 * `aside`, and once inside the `MobileSidebar` drawer. Both instances share this
 * component so the two can never drift apart.
 *
 * RTL: every horizontal utility here is a logical property (`start`, `ms`,
 * `border-e`), so the sidebar mirrors to the right under `dir="rtl"` without
 * any per-locale branching.
 *
 * Logout is a real button driving the existing `useLogoutMutation` and then
 * redirecting to /login — the same behavior the top navigation had.
 */
import { useRouter, usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Search,
  Settings,
  Users,
} from 'lucide-react'
import { useLogoutMutation } from '../../hooks/use-auth-mutations'
import { LanguageSwitcher } from './LanguageSwitcher'
import { SidebarItem } from './SidebarItem'
import { cn } from '../../lib/utils'

/**
 * The section links, in display order.
 *
 * `labelKey` is the full static `common:` key rather than a template literal, so
 * the bundler can extract it and a typo fails loudly instead of silently
 * rendering the key itself.
 */
export const NAV_ITEMS = [
  { href: '/dashboard', labelKey: 'common:nav.dashboard', icon: LayoutDashboard },
  { href: '/chats', labelKey: 'common:nav.chats', icon: MessageCircle },
  { href: '/contacts', labelKey: 'common:nav.contacts', icon: Users },
  { href: '/search', labelKey: 'common:nav.search', icon: Search },
  { href: '/settings/profile', labelKey: 'common:nav.profile', icon: Settings },
] as const

/**
 * A nav item is active on its own route and on any route nested beneath it, so
 * `/chats/abc` still highlights "Chats" and `/settings/profile` highlights
 * "Profile".
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export interface AppSidebarProps {
  /** Called after a nav link is followed — used to close the mobile drawer. */
  onNavigate?: () => void
  className?: string
}

export function AppSidebar({ onNavigate, className }: AppSidebarProps) {
  const { t } = useTranslation(['common', 'auth'], { useSuspense: false })
  const pathname = usePathname()
  const router = useRouter()
  const logout = useLogoutMutation()

  const onLogout = () => {
    void logout.mutateAsync().finally(() => {
      router.replace('/login')
    })
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col bg-white', className)}>
      <div className="border-b border-neutral-200 px-4 py-4">
        <span className="text-base font-bold tracking-tight">{t('common:appName')}</span>

        {/* Language sits above the nav so it is reachable before scrolling. */}
        <div className="pt-3">
          <LanguageSwitcher />
        </div>
      </div>

      <nav
        aria-label={t('common:nav.main')}
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3"
      >
        {NAV_ITEMS.map((item) => (
          <SidebarItem
            key={item.href}
            href={item.href}
            label={t(item.labelKey)}
            icon={<item.icon className="h-4 w-4" />}
            active={isNavItemActive(pathname, item.href)}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="border-t border-neutral-200 p-3">
        <button
          type="button"
          onClick={onLogout}
          disabled={logout.isPending}
          className={cn(
            'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            'bg-red-600 text-white',
            'hover:bg-red-700 active:bg-red-800',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600',
            'disabled:pointer-events-none disabled:opacity-50',
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">{t('common:nav.logout')}</span>
        </button>
      </div>
    </div>
  )
}
