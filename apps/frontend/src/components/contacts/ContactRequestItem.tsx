import type { ContactRequest } from '@email-chat-pro/types'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'

interface ContactRequestItemProps {
  request: ContactRequest
  onAccept: () => void
  onDecline: () => void
  isProcessing?: boolean
}

export function ContactRequestItem({ request, onAccept, onDecline, isProcessing }: ContactRequestItemProps) {
  const { t } = useTranslation('contacts')
  return (
    <div className="rounded border border-neutral-200 bg-white p-4">
      <p className="font-medium">{request.senderId}</p>
      <p className="text-sm text-neutral-500">Status: {request.status}</p>
      <div className="mt-3 flex gap-2">
        <Button onClick={onAccept} disabled={isProcessing} size="sm">
          {t('accept')}
        </Button>
        <Button onClick={onDecline} disabled={isProcessing} variant="secondary" size="sm">
          {t('decline')}
        </Button>
      </div>
    </div>
  )
}
