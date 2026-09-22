import { memo } from 'react'
import { Message } from '@email-chat-pro/types'

interface MessageItemProps {
  message: Message
  isOwn: boolean
}

export const MessageItem = memo(function MessageItem({ message, isOwn }: MessageItemProps) {
  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-xs rounded-lg px-4 py-2 ${
          isOwn ? 'bg-blue-600 text-white' : 'bg-neutral-200 text-black'
        }`}
      >
        {message.messageType === 'image' && message.mediaUrl && (
          <img src={message.mediaUrl} alt="media" className="max-w-xs rounded-lg mb-2" />
        )}
        {message.messageType === 'video' && message.mediaUrl && (
          <video src={message.mediaUrl} controls className="max-w-xs rounded-lg mb-2" />
        )}
        <p className="text-sm">{message.content}</p>
        <p className="mt-1 text-xs opacity-70">
          {new Date(message.createdAt).toLocaleTimeString()}
        </p>
      </div>
    </div>
  )
})
