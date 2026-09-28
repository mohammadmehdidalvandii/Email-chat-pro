'use client'

/**
 * PresenceIndicator — online/offline dot plus last-seen text
 * (architecture.md §presence:changed).
 *
 * Online/offline comes from the `presence:changed` events the backend pushes
 * to a user's accepted contacts. `lastSeenAt` is shown only when the backend
 * actually provides it: the socket event carries it for a contact, and
 * `users.lastSeenAt` comes from the REST payload. Until either arrives the
 * component renders nothing rather than guessing a state.
 */
import { useTranslation } from 'react-i18next'
import { usePresenceStore } from '../../stores/presence.store'
import { formatDate } from '../../i18n/formatting'
import { cn } from '../../lib/utils'

interface PresenceIndicatorProps {
  userId: string
  /** Fallback last-seen from the REST payload, used before any event arrives. */
  lastSeenAt?: string
  /** Render the textual status/last-seen line, not just the dot. */
  showLastSeen?: boolean
  className?: string
}

/** A day is treated as "recently" so the label stays useful without noise. */
const RECENT_THRESHOLD_MS = 24 * 60 * 60 * 1000

export function PresenceIndicator({
  userId,
  lastSeenAt,
  showLastSeen = false,
  className,
}: PresenceIndicatorProps) {
  const { t } = useTranslation(['chat', 'contacts'], { useSuspense: false })
  const presence = usePresenceStore((s) => s.presenceByUserId[userId])

  // Live socket state wins; the REST timestamp is only a pre-event fallback.
  const status = presence?.status
  const lastSeen = presence?.lastSeenAt ?? lastSeenAt

  // Nothing known yet — no dot rather than a wrong "offline".
  if (!status) return null

  const isOnline = status === 'online'
  const statusLabel = t(isOnline ? 'chat:online' : 'chat:offline')

  return (
    <span className={cn('flex items-center gap-1.5 text-xs text-neutral-500', className)}>
      <span
        role="status"
        aria-label={statusLabel}
        title={statusLabel}
        className={cn(
          'inline-block h-2.5 w-2.5 shrink-0 rounded-full',
          isOnline ? 'bg-green-500' : 'bg-neutral-400',
        )}
      />
      {showLastSeen &&
        (isOnline ? (
          <span>{statusLabel}</span>
        ) : (
          <LastSeenText lastSeenAt={lastSeen} />
        ))}
    </span>
  )
}

/** Localized "last seen …" line; degrades to "recently" for old timestamps. */
function LastSeenText({ lastSeenAt }: { lastSeenAt?: string }) {
  const { t } = useTranslation('chat', { useSuspense: false })
  if (!lastSeenAt) return <span>{t('chat:offline')}</span>

  const timestamp = new Date(lastSeenAt).getTime()
  if (Number.isNaN(timestamp)) return <span>{t('chat:offline')}</span>

  if (Date.now() - timestamp > RECENT_THRESHOLD_MS) {
    return <span>{t('chat:lastSeenRecently')}</span>
  }

  const formatted = formatDate(lastSeenAt, { dateStyle: 'medium', timeStyle: 'short' })
  return <span>{formatted ? t('chat:lastSeen', { time: formatted }) : t('chat:offline')}</span>
}
