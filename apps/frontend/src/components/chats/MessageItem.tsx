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
import { memo, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Message } from '@email-chat-pro/types'
import { Check, CheckCheck } from 'lucide-react'
import { formatDate } from '../../i18n/formatting'
import { apiClient } from '../../lib/api/client'

interface MessageItemProps {
  message: Message
  isOwn: boolean
}

/** Static `chat:` keys naming each media type, for the alt-text interpolation. */
const MEDIA_TYPE_LABEL_KEY = {
  image: 'mediaType.image',
  video: 'mediaType.video',
} as const

/** WhatsApp-style read receipt: single grey check while sent, double green when read. */
function ReadReceipt({ readAt }: { readAt: string | null }) {
  if (readAt) {
    return (
      <span aria-label="Read" title="Read" className="text-success">
        <CheckCheck size={14} />
      </span>
    )
  }
  return (
    <span aria-label="Sent" title="Sent" className="text-text-muted">
      <Check size={14} />
    </span>
  )
}

/**
 * Message media (image/video) as rendered inside a bubble.
 *
 * The media is served from the authenticated `/attachments/:id` endpoint, so
 * it cannot be loaded with a plain `<img src>` — the browser would send the
 * request without the JWT and the backend would reject it with a 401. We
 * therefore fetch the bytes through the shared `apiClient`, whose request
 * interceptor attaches the `Authorization: Bearer` header, and turn the blob
 * into an object URL for the element. The URL is revoked on unmount to avoid
 * leaking object URLs.
 */
function MessageMedia({ url, type, alt }: { url: string; type: 'image' | 'video'; alt: string }) {
  const { t } = useTranslation('chat', { useSuspense: false })
  // A media URL that 404s or the token that signed it expires must not leave
  // a broken image icon or an unplayable player in the transcript.
  const [failed, setFailed] = useState(false)
  const [src, setSrc] = useState<string | null>(null)
  const unavailable = t('mediaUnavailable')

  useEffect(() => {
    let revoked = false

    async function load() {
      try {
        // mediaUrl is absolute from the backend (e.g. /api/v1/attachments/...),
        // but apiClient.baseURL already includes /api/v1; pass a relative URL
        // so the base URL is not duplicated (/api/v1/api/v1/attachments/...).
        const relativeUrl = url.replace(/^\/api\/v1/, '') || url
        const blob = await apiClient.request<{ data: Blob }>({
          method: 'GET',
          url: relativeUrl,
          responseType: 'blob',
        }).then((r) => r.data)

        // An error response that also carries a `data` body (e.g. 401 with an
        // error envelope) is not usable media.
        if (!(blob instanceof Blob)) {
          setFailed(true)
          return
        }

        if (!revoked) {
          URL.revokeObjectURL(src ?? '')
          setSrc(URL.createObjectURL(blob))
        }
      } catch {
        if (!revoked) {
          setFailed(true)
        }
      }
    }

    load()
    return () => {
      revoked = true
      if (src) {
        URL.revokeObjectURL(src)
      }
    }
  }, [url, src])

  if (failed || !src) {
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
        src={src}
        alt={alt}
        loading="lazy"
        className="mb-2 max-w-full rounded-lg"
      />
    )
  }

  return (
    <video src={src} controls preload="metadata" className="mb-2 max-w-full rounded-lg">
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
          isOwn ? 'bg-message-sent text-white' : 'bg-message-received text-text-main'
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
          <p className="mt-1 flex items-center gap-1 text-xs opacity-70" dir="ltr">
            {time}
            {isOwn && <ReadReceipt readAt={message.readAt} />}
          </p>
        )}
      </div>
    </div>
  )
})
