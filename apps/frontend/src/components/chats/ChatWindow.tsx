'use client'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { useSendMessage } from '../../hooks/use-chat-mutations'

interface ChatWindowProps {
  chatId: string
}

export function ChatWindow({ chatId }: ChatWindowProps) {
  const send = useSendMessage(chatId)

  return (
    <div className="flex h-screen flex-col">
      <div className="flex-1 overflow-hidden">
        <MessageList chatId={chatId} />
      </div>
      <MessageInput
        onSend={(content, messageType, mediaUrl) => send.mutate({ chatId, content, messageType, mediaUrl })}
        disabled={send.isPending}
      />
    </div>
  )
}
