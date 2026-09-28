'use client'

/**
 * MessageList — paginated chat history (GET /chats/:chatId/messages).
 *
 * The backend returns history newest-first, so the list is rendered with
 * `flex-col-reverse` (oldest message visually at the bottom) and paged with
 * "newer" / "older" controls driven by the response's own `pagination` block.
 * New messages arrive through the session socket and are written into the same
 * query cache by `applyIncomingMessage`, so this component never keeps its own
 * copy of the messages.
 */
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageItem } from './MessageItem'
import { useChatSocket } from '../../hooks/useChatSocket'
import { useAuthStore } from '../../stores/auth.store'
import { useChatHistory } from '../../hooks/use-chat-query'
import { toApiRequestError } from '../../lib/api/client'
import { translateApiError } from '../../i18n/errors'

interface MessageListProps {
  chatId: string
}

export function MessageList({ chatId }: MessageListProps) {
  const { t } = useTranslation(['chat', 'common'], { useSuspense: false })
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, error, refetch } = useChatHistory(chatId, page)
  useChatSocket(chatId)
  const userId = useAuthStore((s) => s.user?.id)
  const scrollRef = useRef<HTMLDivElement>(null)

  // A different conversation always starts at its newest page.
  useEffect(() => {
    setPage(1)
  }, [chatId])

  // The server returns newest-first, so the newest message is at the start of
  // the array; scrolling to the visual top (index 0 in column-reverse) shows it.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [chatId, page, data?.data.length])

  if (isLoading) return <p className="p-4 text-sm text-neutral-500">{t('chat:loading')}</p>

  if (isError) {
    const apiError = toApiRequestError(error)
    return (
      <div className="flex flex-col items-start gap-3 p-4">
        <p className="text-sm text-red-600" role="alert">
          {translateApiError(apiError.code, t('chat:loadError'))}
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

  const messages = data?.data ?? []
  const pagination = data?.pagination

  if (messages.length === 0) {
    return <p className="p-4 text-sm text-neutral-500">{t('chat:emptyMessages')}</p>
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex flex-1 flex-col-reverse gap-2 overflow-y-auto p-4">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            isOwn={message.senderId === userId}
          />
        ))}
      </div>

      {pagination && pagination.pages > 1 && (
        <div
          className="flex items-center justify-between gap-3 border-t border-neutral-200 bg-white px-4 py-2"
          dir="ltr"
        >
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(current + 1, pagination.pages))}
            disabled={page >= pagination.pages}
            className="text-sm text-neutral-700 underline underline-offset-4 disabled:opacity-40"
          >
            {t('chat:older')}
          </button>
          <span className="text-xs text-neutral-500">
            {t('chat:pageOf', { page: pagination.page, pages: pagination.pages })}
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(current - 1, 1))}
            disabled={page <= 1}
            className="text-sm text-neutral-700 underline underline-offset-4 disabled:opacity-40"
          >
            {t('chat:newer')}
          </button>
        </div>
      )}
    </div>
  )
}
