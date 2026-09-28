'use client'

/**
 * ContactItem — an accepted contact, linking to their conversation.
 *
 * The chat id is resolved from the conversation list the backend already
 * returns (`GET /chats` → each item's `contact` is the other participant), so
 * opening a chat from a contact needs no extra endpoint. A contact with no
 * conversation yet simply has no link.
 */
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import type { User } from '@email-chat-pro/types'
import { useConversations, findChatIdForContact } from '../../hooks/use-chat-query'
import { PresenceIndicator } from '../common/PresenceIndicator'
import { UserAvatar } from '../common/UserAvatar'
import { Card } from '../ui/card'

interface ContactItemProps {
  user: User
}

export function ContactItem({ user }: ContactItemProps) {
  const { t } = useTranslation(['contacts', 'common'], { useSuspense: false })
  const router = useRouter()
  const { data: conversations } = useConversations()
  const chatId = findChatIdForContact(conversations, user.id)
  const name = user.username ?? user.email

  return (
    <Card className="flex items-center justify-between gap-3 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative">
          <UserAvatar user={user} />
          <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-0.5">
            <PresenceIndicator userId={user.id} lastSeenAt={user.lastSeenAt} />
          </span>
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold" dir="auto">
            {name}
          </p>
          {user.fullName && (
            <p className="truncate text-sm text-neutral-500" dir="auto">
              {user.fullName}
            </p>
          )}
        </div>
      </div>

      {chatId && (
        <button
          type="button"
          onClick={() => router.push(`/chats/${chatId}`)}
          className="shrink-0 text-sm text-neutral-700 underline underline-offset-4"
        >
          {t('contacts:openChat')}
        </button>
      )}
    </Card>
  )
}
