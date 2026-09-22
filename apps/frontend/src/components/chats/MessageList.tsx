'use client'
import { MessageItem } from './MessageItem'
import { useChatSocket } from '../../hooks/useChatSocket'
import { useAuthStore } from '../../stores/auth.store'
import { useChatHistory } from '../../hooks/use-chat-query'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

interface MessageListProps {
  chatId: string
}

export function MessageList({ chatId }: MessageListProps) {
  const { t } = useTranslation(['chat', 'common'], { useSuspense: false })
  const { data, isLoading, error } = useChatHistory(chatId)
  useChatSocket(chatId)
  const userId = useAuthStore((s) => s.user?.id)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [data?.data.length])

  if (error) return <p>{t('chat:loadError')}</p>
  if (isLoading) return <p>{t('common:loading')}</p>

  return (
    <div
      ref={scrollRef}
      className="flex flex-col-reverse gap-2 overflow-y-auto p-4 flex-1"
    >
      {data?.data.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          isOwn={message.senderId === userId}
        />
      ))}
    </div>
  )
}
