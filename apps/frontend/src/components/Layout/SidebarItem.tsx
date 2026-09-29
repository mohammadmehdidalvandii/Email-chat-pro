'use client'

/**
 * SidebarItem — one navigation row in the authenticated sidebar.
 *
 * Shared by the persistent desktop sidebar and the mobile drawer so the two can
 * never drift. Active state reuses the `bg-neutral-900 text-white` treatment the
 * previous top navigation used, so the visual language is unchanged by the move
 * to a sidebar.
 *
 * `onNavigate` lets the mobile drawer close itself as soon as a link is
 * followed; the desktop sidebar passes nothing and ignores it.
 */
import type { ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '../../lib/utils'

export interface SidebarItemProps {
  href: string
  label: string
  icon: ReactNode
  /** Whether this item's route (or a route beneath it) is the current one. */
  active: boolean
  /** Called after the link is followed — used to close the mobile drawer. */
  onNavigate?: () => void
  className?: string
}

export function SidebarItem({ href, label, icon, active, onNavigate, className }: SidebarItemProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900',
        active ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100',
        className,
      )}
    >
      <span className="shrink-0" aria-hidden>
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  )
}
