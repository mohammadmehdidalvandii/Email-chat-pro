'use client'

/**
 * ContactRequestItem — an incoming contact request awaiting a response.
 *
 * The backend's `ContactRequest` carries the full `sender` User, so the request
 * is identified by the sender's username/name/avatar rather than a raw id, and
 * the status is rendered through the `contacts:status` translations.
 */
import { useTranslation } from 'react-i18next'
import type { ContactRequest } from '@email-chat-pro/types'
import { UserAvatar } from '../common/UserAvatar'
import { Button } from '../ui/button'
import { Card } from '../ui/card'

interface ContactRequestItemProps {
  request: ContactRequest
  onAccept: () => void
  onDecline: () => void
  isProcessing?: boolean
}

export function ContactRequestItem({ request, onAccept, onDecline, isProcessing }: ContactRequestItemProps) {
  const { t } = useTranslation('contacts', { useSuspense: false })
  const sender = request.sender

  return (
    <Card className="flex items-center justify-between gap-3 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar user={sender} />
        <div className="min-w-0">
          <p className="truncate font-semibold" dir="auto">
            {sender.username ?? sender.email}
          </p>
          {sender.fullName && (
            <p className="truncate text-sm text-neutral-500" dir="auto">
              {sender.fullName}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs text-neutral-500">
          {t(`status.${request.status}`)}
        </span>
        <Button onClick={onAccept} disabled={isProcessing} size="sm">
          {t('accept')}
        </Button>
        <Button onClick={onDecline} disabled={isProcessing} variant="secondary" size="sm">
          {t('decline')}
        </Button>
      </div>
    </Card>
  )
}
