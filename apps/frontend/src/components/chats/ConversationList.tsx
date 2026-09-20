'use client'
import { useConversations } from '../../hooks/use-chat-query'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Card } from '../ui/card'

export function ConversationList() {
  const router = useRouter()
  const { t } = useTranslation('chats', { useSuspense: false })
  const { data: conversations, isLoading } = useConversations()

  if (isLoading) return <p>{t('loading')}</p>

  return (
    <div className="flex flex-col gap-2">
      {conversations && conversations.length === 0 && (
        <p className="text-sm text-neutral-500">{t('noConversations')}</p>
      )}
      {conversations?.map((conv) => (
        <Card
          key={conv.id}
          className="flex cursor-pointer items-center justify-between p-4 hover:bg-neutral-100"
          onClick={() => router.push(`/chats/${conv.id}`)}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-neutral-300" />
            <div>
              <p className="font-semibold">{conv.contact.username}</p>
              <p className="text-sm text-neutral-500">
                {conv.lastMessage?.content ?? t('noMessages')}
              </p>
            </div>
          </div>
          <span className="text-xs text-neutral-400">
            {conv.lastMessage?.createdAt
              ? new Date(conv.lastMessage.createdAt).toLocaleDateString()
              : ''}
          </span>
        </Card>
      ))}
    </div>
  )
}
