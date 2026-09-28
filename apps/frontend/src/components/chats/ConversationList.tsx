'use client'

/**
 * ConversationList — the authenticated user's conversations (GET /chats).
 *
 * Each row shows the resolved contact, a message preview, and the recent
 * activity time, all from the backend payload. Selecting a row opens the chat.
 * `limit` previews only the first N rows (the dashboard shows the most recent
 * few); the list itself is never re-sliced in a way that hides the empty state.
 */
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useConversations } from '../../hooks/use-chat-query'
import { PresenceIndicator } from '../common/PresenceIndicator'
import { UserAvatar } from '../common/UserAvatar'
import { formatDate } from '../../i18n/formatting'
import { Card } from '../ui/card'

interface ConversationListProps {
  /** Show only the first N conversations (most recent, per backend ordering). */
  limit?: number
}

export function ConversationList({ limit }: ConversationListProps = {}) {
  const router = useRouter()
  const { t } = useTranslation(['chat', 'common'], { useSuspense: false })
  const { data: conversations, isLoading, isError, refetch } = useConversations()

  if (isLoading) return <p className="text-sm text-neutral-500">{t('common:loading')}</p>

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-red-600" role="alert">
          {t('chat:chatError')}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-sm text-neutral-700 underline underline-offset-4"
        >
          {t('common:retry')}
        </button>
      </div>
    )
  }

  if (!conversations || conversations.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        {t('chat:noConversations')}
      </p>
    )
  }

  const rows = limit === undefined ? conversations : conversations.slice(0, limit)

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((conversation) => {
        const contact = conversation.contact
        // A media-only message has an empty `content`; fall back to a label
        // rather than an empty row.
        const content = conversation.lastMessage?.content?.trim()
        const preview = conversation.lastMessage
          ? content || t('chat:attachmentPreview')
          : t('chat:noMessages')
        const activity = formatDate(conversation.lastActivityAt, {
          dateStyle: 'short',
          timeStyle: 'short',
        })

        return (
          <li key={conversation.id}>
            <Card
              role="button"
              tabIndex={0}
              aria-label={contact.username ?? contact.email}
              onClick={() => router.push(`/chats/${conversation.id}`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  router.push(`/chats/${conversation.id}`)
                }
              }}
              className="flex cursor-pointer items-center justify-between gap-3 p-4 transition-colors hover:bg-neutral-100"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative">
                  <UserAvatar user={contact} />
                  <PresenceDot userId={contact.id} />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold" dir="auto">
                    {contact.username ?? contact.email}
                  </p>
                  <p className="truncate text-sm text-neutral-500" dir="auto">
                    {preview}
                  </p>
                </div>
              </div>
              {activity && (
                <span className="shrink-0 text-xs text-neutral-400" dir="auto">
                  {activity}
                </span>
              )}
            </Card>
          </li>
        )
      })}
    </ul>
  )
}

/** Absolute-positioned presence dot over the avatar. */
function PresenceDot({ userId }: { userId: string }) {
  return (
    <PresenceIndicator
      userId={userId}
      className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-0.5"
    />
  )
}
