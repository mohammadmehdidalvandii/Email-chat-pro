'use client'

/**
 * ChatWindow — one conversation: header, history, composer.
 *
 * A failed send is reported inline with the backend's translated error code so
 * the user can retry without losing what they typed.
 */
import { useState } from 'react'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { ChatHeader } from './ChatHeader'
import { useSendMessage } from '../../hooks/use-chat-mutations'
import { toApiRequestError } from '../../lib/api/client'
import { translateApiError } from '../../i18n/errors'

interface ChatWindowProps {
  chatId: string
}

export function ChatWindow({ chatId }: ChatWindowProps) {
  const send = useSendMessage(chatId)
  const [sendError, setSendError] = useState<string | null>(null)

  const handleSend = (content: string, messageType: 'text' | 'image' | 'video', mediaUrl?: string | null) => {
    setSendError(null)
    send.mutate(
      { chatId, content, messageType, mediaUrl },
      {
        onError: (error) => {
          const apiError = toApiRequestError(error)
          setSendError(translateApiError(apiError.code, apiError.message))
        },
      },
    )
  }

  return (
    // Height fills the viewport minus the shell chrome: on mobile that is the
    // menu bar (61px) plus `main`'s py-6 (48px) = 109px; on desktop there is no
    // menu bar, leaving only `main`'s py-8 (64px). `dvh` (not `vh`) keeps the
    // composer clear of mobile browser chrome. These must track AppShell's
    // padding — if either changes, this needs the same change.
    <section className="flex h-[calc(100dvh-6.8125rem)] flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white md:h-[calc(100dvh-4rem)]">
      <ChatHeader chatId={chatId} />
      {sendError && (
        <p className="px-4 py-2 text-sm text-red-600" role="alert">
          {sendError}
        </p>
      )}
      <MessageList chatId={chatId} />
      <MessageInput onSend={handleSend} disabled={send.isPending} />
    </section>
  )
}
