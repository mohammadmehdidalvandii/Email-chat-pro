'use client'

/**
 * MessageItem — a single chat bubble.
 *
 * Rendering follows only what the backend persists (features.md §Message
 * Content): `messageType` decides whether media or text is shown, and
 * `mediaUrl` is the Cloudinary URL from `POST /files/upload`. Nothing is
 * derived that the API does not provide — there are no read receipts, edit
 * affordances, or reactions because the backend has no such fields.
 */
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Message } from '@email-chat-pro/types'
import { formatDate } from '../../i18n/formatting'

interface MessageItemProps {
  message: Message
  isOwn: boolean
}

export const MessageItem = memo(function MessageItem({ message, isOwn }: MessageItemProps) {
  const { t } = useTranslation('chat', { useSuspense: false })
  const mediaAlt = t('mediaAlt')
  const time = formatDate(message.createdAt, { timeStyle: 'short' })

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs rounded-lg px-4 py-2 ${
          isOwn ? 'bg-blue-600 text-white' : 'bg-neutral-200 text-black'
        }`}
      >
        {message.messageType === 'image' && message.mediaUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={message.mediaUrl} alt={mediaAlt} className="mb-2 max-w-full rounded-lg" />
        )}
        {message.messageType === 'video' && message.mediaUrl && (
          <video src={message.mediaUrl} controls className="mb-2 max-w-full rounded-lg">
            <track kind="captions" />
          </video>
        )}
        {/* A media-only message stores an empty content string server-side. */}
        {message.content && (
          <p className="whitespace-pre-wrap break-words text-sm" dir="auto">
            {message.content}
          </p>
        )}
        {time && (
          <p className="mt-1 text-xs opacity-70" dir="ltr">
            {time}
          </p>
        )}
      </div>
    </div>
  )
})
