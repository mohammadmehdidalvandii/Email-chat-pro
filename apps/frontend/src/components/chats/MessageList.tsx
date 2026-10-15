'use client'

/**
 * MessageList — infinite scroll chat history (GET /chats/:chatId/messages).
 *
 * Uses TanStack Query `useInfiniteQuery` with the existing paginated endpoint.
 * The backend returns newest-first (`message.createdAt DESC`); messages are
 * displayed oldest-at-top / newest-at-bottom via a normal `flex-col` layout
 * with chronological sort. Scrolling upward loads older pages.
 */
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageItem } from './MessageItem'
import { MediaViewer } from './MediaViewer'
import { useChatSocket } from '../../hooks/useChatSocket'
import { useMarkRead } from '../../hooks/use-chat-mutations'
import { useAuthStore } from '../../stores/auth.store'
import { useChatHistoryInfinite } from '../../hooks/use-chat-history-infinite'
import { toApiRequestError } from '../../lib/api/client'
import { translateApiError } from '../../i18n/errors'

interface MessageListProps {
  chatId: string
}

export function MessageList({ chatId }: MessageListProps) {
  const { t } = useTranslation(['chat', 'common'], { useSuspense: false })
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollPositionRef = useRef<number>(0)
  const previousLengthRef = useRef<number>(0)

  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useChatHistoryInfinite(chatId)
  useChatSocket(chatId)
  const markRead = useMarkRead(chatId)
  const userId = useAuthStore((s) => s.user?.id)

  // Combine all pages (newest-first from server) into chronological order.
  // Page 1 = newest messages; deeper pages = older. After sorting oldest-first,
  // the newest messages sit at the bottom and oldest at the top.
  const allPages = data?.pages ?? []
  // Combine all messages from all pages, then sort oldest-first for chronological display.
  const messages = allPages.flatMap((p) => p.data).sort((a, b) => {
    const ta = new Date(a.createdAt).getTime()
    const tb = new Date(b.createdAt).getTime()
    if (ta !== tb) return ta - tb
    return a.id.localeCompare(b.id)
  })

  // Preserve approximate scroll position when older pages are prepended.
  useEffect(() => {
    if (!scrollRef.current) return
    const newLength = messages.length
    const prevLength = previousLengthRef.current
    if (newLength > prevLength && prevLength > 0) {
      // Older messages added: restore previous scroll offset.
      scrollRef.current.scrollTop = scrollPositionRef.current + (newLength - prevLength) * 60 // approximate
    }
    previousLengthRef.current = newLength
  }, [messages.length])

  // Capture scroll position before new pages load.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      scrollPositionRef.current = el.scrollTop
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // When opening a chat for the first time, scroll to bottom (newest messages).
  useEffect(() => {
    if (!isLoading && messages.length > 0 && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatId, isLoading, messages.length > 0])

  // Load older messages when scrolling near top.
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !hasNextPage || isFetchingNextPage || isLoading) return
    const onScroll = () => {
      if (el.scrollTop < 100) {
        fetchNextPage()
      }
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isLoading])

  // Mark read when chat opens and not loading.
  useEffect(() => {
    if (chatId && !isLoading && !isError) {
      void markRead.mutateAsync()
    }
  }, [chatId, isLoading, isError])

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
          onClick={() => window.location.reload()}
          className="text-sm text-neutral-700 underline underline-offset-4"
        >
          {t('common:retry')}
        </button>
      </div>
    )
  }

  if (messages.length === 0) {
    return <p className="p-4 text-sm text-neutral-500">{t('chat:emptyMessages')}</p>
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MediaViewer />
      <div ref={scrollRef} className="chat-scroll flex flex-1 flex-col gap-2 overflow-y-auto p-4">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            isOwn={message.senderId === userId}
          />
        ))}
        {isFetchingNextPage && (
          <p className="py-2 text-center text-xs text-neutral-400">{t('chat:loadingOlder')}</p>
        )}
      </div>
    </div>
  )
}
