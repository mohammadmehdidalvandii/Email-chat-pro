import type { User } from '@email-chat-pro/types'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'

interface UserSearchResultProps {
  user: User
  onSendRequest: () => void
  isSending?: boolean
}

export function UserSearchResult({ user, onSendRequest, isSending }: UserSearchResultProps) {
  const { t } = useTranslation('contacts')
  return (
    <div className="flex items-center justify-between rounded border border-neutral-200 bg-white p-4">
      <div>
        <p className="font-medium">{user.username}</p>
        <p className="text-sm text-neutral-500">{user.email}</p>
      </div>
      <Button onClick={onSendRequest} disabled={isSending} size="sm">
        {t('sendRequest')}
      </Button>
    </div>
  )
}
