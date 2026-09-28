'use client'

/**
 * ChatHeader — the active conversation's identity and connection state.
 *
 * Everything shown here comes from the conversation list the backend already
 * returns (`GET /chats` → `ConversationListItem.contact`), which carries the
 * full contact `User`: username, full name, bio, avatar, and `lastSeenAt`.
 * Online/offline comes from the `presence:changed` events the session socket
 * receives; there is no polling and no separate presence request.
 */
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { useSessionSocket } from '../Providers/SocketProvider'
import { PresenceIndicator } from '../common/PresenceIndicator'
import { UserAvatar } from '../common/UserAvatar'
import { useConversations } from '../../hooks/use-chat-query'

interface ChatHeaderProps {
  chatId: string
}

export function ChatHeader({ chatId }: ChatHeaderProps) {
  const { t } = useTranslation(['chat', 'common'], { useSuspense: false })
  const { isConnected, hasError } = useSessionSocket()
  const { data: conversations } = useConversations()
  const contact = conversations?.find((conversation) => conversation.id === chatId)?.contact

  const name = contact ? (contact.username ?? contact.email) : t('chat:conversations')
  const status = hasError
    ? t('chat:connection.failed')
    : isConnected
      ? t('chat:connection.connected')
      : t('chat:connection.connecting')

  return (
    <header className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3">
      {/* Back navigation returns to the conversation list on every screen size;
          the header is the only chrome on the chat route. */}
      <Link
        href="/chats"
        aria-label={t('chat:back')}
        className="rounded-md p-2 text-neutral-700 hover:bg-neutral-100"
      >
        <ArrowLeft className="h-5 w-5 rtl:rotate-180" aria-hidden />
      </Link>

      {contact ? (
        <div className="relative">
          <UserAvatar user={contact} size="sm" />
          <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-0.5">
            <PresenceIndicator userId={contact.id} />
          </span>
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold" dir="auto">
          {name}
        </p>
        {contact ? (
          <PresenceIndicator
            userId={contact.id}
            lastSeenAt={contact.lastSeenAt}
            showLastSeen
            className="truncate"
          />
        ) : null}
      </div>

      {/* Surface the socket state rather than letting a dropped connection look
          like a quiet chat. */}
      <span
        role="status"
        className={`hidden shrink-0 text-xs sm:inline ${
          hasError ? 'text-red-600' : 'text-neutral-500'
        }`}
      >
        {status}
      </span>
    </header>
  )
}
