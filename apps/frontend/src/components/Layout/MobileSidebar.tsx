'use client'

/**
 * MobileSidebar — the sidebar as a drawer on small screens.
 *
 * The panel is anchored to the inline-start edge, so it slides in from the left
 * under `dir="ltr"` and from the right under `dir="rtl"` with no per-locale
 * branching. Escape and a backdrop click both dismiss it; navigating to another
 * section dismisses it too (via `AppSidebar`'s `onNavigate`).
 *
 * This is a focus-trapping dialog in name only — it renders `role="dialog"` and
 * `aria-modal` so assistive technology treats the rest of the page as inert,
 * but it does not implement a full focus trap or restore-on-close. That matches
 * the rest of the app, which has no focus-management utility to reuse.
 */
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { AppSidebar } from './AppSidebar'

export interface MobileSidebarProps {
  open: boolean
  onClose: () => void
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const { t } = useTranslation('common', { useSuspense: false })

  // Escape closes the drawer.
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <button
        type="button"
        aria-label={t('nav.closeMenu')}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-neutral-900/40"
      />

      {/* Panel — anchored to the inline start so RTL slides from the right. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.menu')}
        className="absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col border-e border-neutral-200 shadow-xl"
      >
        <div className="flex justify-end border-b border-neutral-200 bg-white px-2 py-2">
          <button
            type="button"
            onClick={onClose}
            aria-label={t('nav.closeMenu')}
            className="rounded-md p-2 text-neutral-700 hover:bg-neutral-100"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1">
          <AppSidebar onNavigate={onClose} />
        </div>
      </div>
    </div>
  )
}
