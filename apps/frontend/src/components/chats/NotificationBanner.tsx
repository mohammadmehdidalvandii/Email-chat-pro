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
  const remove = useNotificationStore((s) => s.remove)

  // Each notification has its own 4-second lifetime so an arrival
  // does not reset or prematurely kill another entry.
  useEffect(() => {
    if (items.length === 0) return
    const timers = items.map((item) =>
      setTimeout(() => remove(item.id), 4000),
    )
    return () => timers.forEach(clearTimeout)
  }, [items, remove])

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
          className="pointer-events-auto flex w-72 items-start gap-3 rounded-lg border border-border bg-card p-3 shadow-lg"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {t('newMessageNotification')}
            </p>
            <p className="truncate text-xs text-text-muted">
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
              onClick={() => remove(item.id)}
              aria-label={t('newMessageNotification')}
              className="text-xs text-blue-600 underline underline-offset-4"
            >
              {t('newMessageNotification')}
            </Link>
            <button
              type="button"
              onClick={() => remove(item.id)}
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
