'use client'

/**
 * UserSearchResult — one user returned by GET /users/search.
 *
 * The backend does not report a "request already exists" state per search
 * result, so the action reflects only what this tab knows: sending a request
 * that already exists comes back as `CONTACT_REQUEST_DUPLICATE` and is shown
 * as such rather than silently reported as a new request.
 */
import { useTranslation } from 'react-i18next'
import type { User } from '@email-chat-pro/types'
import { UserAvatar } from '../common/UserAvatar'
import { Button } from '../ui/button'
import { Card } from '../ui/card'

interface UserSearchResultProps {
  user: User
  onSendRequest: () => void
  isSending?: boolean
  /** Set once this tab successfully sent a request to this user. */
  isRequested?: boolean
}

export function UserSearchResult({
  user,
  onSendRequest,
  isSending,
  isRequested = false,
}: UserSearchResultProps) {
  const { t } = useTranslation('contacts', { useSuspense: false })

  return (
    <Card className="flex items-center justify-between gap-3 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar user={user} size="sm" />
        <div className="min-w-0">
          <p className="truncate font-semibold" dir="auto">
            {user.username ?? user.email}
          </p>
          {user.username && (
            <p className="truncate text-sm text-neutral-500" dir="ltr">
              {user.email}
            </p>
          )}
        </div>
      </div>

      {isRequested ? (
        <span className="shrink-0 text-sm text-neutral-500">{t('requestPending')}</span>
      ) : (
        <Button onClick={onSendRequest} disabled={isSending} size="sm">
          {t('sendRequest')}
        </Button>
      )}
    </Card>
  )
}
