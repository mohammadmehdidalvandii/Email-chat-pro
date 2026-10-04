'use client'

/**
 * NotificationBanner — shows incoming-message notifications.
 *
 * Rendered once near the root of the authenticated layout. Each
 * entry is driven by the `message:received` socket event (see
 * SocketProvider), is keyed by the message id so the same event
 * never produces a second notification, and auto-dismisses.
 */
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { X } from 'lucide-react'
import { useNotificationStore } from '../../stores/notification.store'

export function NotificationBanner() {
  const { t } = useTranslation('chat', { useSuspense: false })
  const items = useNotificationStore((s) => s.items)
  const clear = useNotificationStore((s) => s.clear)

  // Auto-dismiss after a short, non-intrusive interval so the
  // notification does not persist forever. `items` is the only
  // dependency; the timer resets when a new notification arrives.
  useEffect(() => {
    if (items.length === 0) return
    const timer = setTimeout(clear, 4000)
    return () => clearTimeout(timer)
  }, [items, clear])

  if (items.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed end-4 top-4 z-50 flex flex-col gap-2"
      aria-live="polite"
    >
      {items.map((item) => (
        <div
          key={item.id}
          role="status"
          className="pointer-events-auto flex w-72 items-start gap-3 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {t('newMessageNotification')}
            </p>
            <p className="truncate text-xs text-neutral-500">
              {t('newMessageFrom', { sender: item.senderName })}
            </p>
            {item.preview && (
              <p className="mt-1 truncate text-xs" dir="auto">
                {t('notificationPreview', { preview: item.preview })}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <Link
              href={`/chats/${item.chatId}`}
              onClick={clear}
              aria-label={t('newMessageNotification')}
              className="text-xs text-blue-600 underline underline-offset-4"
            >
              {t('newMessageNotification')}
            </Link>
            <button
              type="button"
              onClick={clear}
              aria-label={t('chat:notificationDismiss')}
              className="text-neutral-400 hover:text-neutral-600"
            >
              <X size={14} aria-hidden />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
