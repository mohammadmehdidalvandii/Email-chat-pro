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
import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Message } from '@email-chat-pro/types'
import { formatDate } from '../../i18n/formatting'

interface MessageItemProps {
  message: Message
  isOwn: boolean
}

/** Static `chat:` keys naming each media type, for the alt-text interpolation. */
const MEDIA_TYPE_LABEL_KEY = {
  image: 'mediaType.image',
  video: 'mediaType.video',
} as const

/** Message media (image/video) as rendered inside a bubble. */
function MessageMedia({ url, type, alt }: { url: string; type: 'image' | 'video'; alt: string }) {
  const { t } = useTranslation('chat', { useSuspense: false })
  // A media URL that 404s or is still transforming on Cloudinary must not leave
  // a broken image icon or an unplayable player in the transcript.
  const [failed, setFailed] = useState(false)
  const unavailable = t('mediaUnavailable')

  if (failed) {
    return (
      <p className="mb-2 text-sm opacity-70" role="img" aria-label={unavailable}>
        {unavailable}
      </p>
    )
  }

  if (type === 'image') {
    return (
      // The media is served from the storage provider, not the Next.js image
      // pipeline, so `next/image` (and its host allowlist) is not applicable.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className="mb-2 max-w-full rounded-lg"
      />
    )
  }

  return (
    <video
      src={url}
      controls
      preload="metadata"
      onError={() => setFailed(true)}
      className="mb-2 max-w-full rounded-lg"
    >
      {unavailable}
    </video>
  )
}

export const MessageItem = memo(function MessageItem({ message, isOwn }: MessageItemProps) {
  const { t } = useTranslation('chat', { useSuspense: false })
  const time = formatDate(message.createdAt, { timeStyle: 'short' })

  // Alt text names who sent the media and what it is, rather than the generic
  // "Shared media", so a screen-reader user can tell the images apart. A
  // media-only message has an empty `content` to fall back on, and a
  // `messageType` of image/video with no URL is shown as unavailable instead of
  // rendering an empty element.
  const mediaType =
    message.messageType === 'image' ? 'image' : message.messageType === 'video' ? 'video' : null
  const mediaAlt =
    mediaType === null
      ? ''
      : t('mediaAlt', {
          sender: message.sender?.username ?? message.sender?.email ?? t('you'),
          type: t(MEDIA_TYPE_LABEL_KEY[mediaType]),
        })
  const mediaMissing = mediaType !== null && !message.mediaUrl

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs rounded-lg px-4 py-2 ${
          isOwn ? 'bg-blue-600 text-white' : 'bg-neutral-200 text-black'
        }`}
      >
        {mediaMissing ? (
          <p className="mb-2 text-sm opacity-70">{t('mediaUnavailable')}</p>
        ) : mediaType && message.mediaUrl ? (
          <MessageMedia url={message.mediaUrl} type={mediaType} alt={mediaAlt} />
        ) : null}
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
