'use client'

/**
 * MessageInput — text entry, media attachment, and send.
 *
 * A picked file is uploaded first (`POST /files/upload`, the same endpoint the
 * backend already exposes) and the returned Cloudinary URL is sent with the
 * message; nothing is invented client-side. Upload failures are shown inline
 * with the backend's own error code translated through the `errors` namespace
 * rather than a generic message.
 */
import { useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import {
  MESSAGE_CONTENT_MAX_LENGTH,
  IMAGE_MAX_SIZE_BYTES,
  VIDEO_MAX_SIZE_BYTES,
  IMAGE_MIME_TYPES,
  VIDEO_MIME_TYPES,
} from '@email-chat-pro/constants'
import type { MessageType } from '@email-chat-pro/types'
import { uploadFileApi } from '../../lib/api/files.api'
import { toApiRequestError } from '../../lib/api/client'
import { translateApiError } from '../../i18n/errors'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

interface MessageInputProps {
  /**
   * Returns `true` once the message has been persisted by the backend. The
   * composer clears itself only on `true`, so a failed send keeps the caption
   * and the picked attachment for a retry.
   */
  onSend: (content: string, messageType: MessageType, mediaUrl?: string | null) => Promise<boolean>
  disabled?: boolean
}

interface Attachment {
  url: string
  type: 'image' | 'video'
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const { t } = useTranslation(['chat', 'common', 'errors'], { useSuspense: false })
  const [text, setText] = useState('')
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) =>
      uploadFileApi(formData, (percent) => setProgress(percent)),
    onSuccess: () => setProgress(null),
    onError: () => setProgress(null),
  })

  const busy = disabled || uploadMutation.isPending

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Reset so re-picking the same file fires `change` again.
    event.target.value = ''
    if (!file) return

    setLocalError(null)

    const isImage = (IMAGE_MIME_TYPES as readonly string[]).includes(file.type)
    const isVideo = (VIDEO_MIME_TYPES as readonly string[]).includes(file.type)

    // The same constraints the backend enforces, checked here so the user is
    // told immediately instead of after the upload round-trip.
    if (!isImage && !isVideo) {
      setLocalError(t('chat:invalidFileType'))
      return
    }

    const maxSize = isImage ? IMAGE_MAX_SIZE_BYTES : VIDEO_MAX_SIZE_BYTES
    if (file.size > maxSize) {
      setLocalError(t('chat:fileTooLarge'))
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', isImage ? 'image' : 'video')

    try {
      const result = await uploadMutation.mutateAsync(formData)
      setAttachment({ url: result.url, type: isImage ? 'image' : 'video' })
    } catch (error) {
      const apiError = toApiRequestError(error)
      setLocalError(translateApiError(apiError.code, apiError.message))
    }
  }

  const handleSend = async () => {
    const trimmed = text.trim()
    if (busy || (trimmed.length === 0 && !attachment)) return

    // Capture what is being sent so a retry after a failure cannot pick up
    // newer edits — the send is resolved against exactly these values.
    const pendingText = trimmed
    const pendingAttachment = attachment

    const sent = await onSend(
      pendingText,
      pendingAttachment ? pendingAttachment.type : 'text',
      pendingAttachment?.url,
    )

    // Only clear once the backend confirmed the write. On failure the caption
    // and attachment stay put, and the error is shown above by ChatWindow.
    if (!sent) return

    // Guard against the user having typed or picked something else while the
    // request was in flight; that input must not be wiped by this send.
    setText((current) => (current.trim() === pendingText ? '' : current))
    setAttachment((current) => (current?.url === pendingAttachment?.url ? null : current))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className="border-t border-neutral-200 bg-white p-4">
      {attachment && (
        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-neutral-600">
          <span className="truncate" dir="auto">
            {t('chat:attachmentAttachedWithUrl', { url: attachment.url })}
          </span>
          <button
            type="button"
            onClick={() => setAttachment(null)}
            disabled={busy}
            className="shrink-0 underline underline-offset-4 disabled:opacity-50"
          >
            {t('chat:attachmentRemove')}
          </button>
        </div>
      )}

      {localError && (
        <p className="mb-2 text-xs text-red-600" role="alert">
          {localError}
        </p>
      )}

      <div className="flex items-center gap-2">
        <input
          type="file"
          accept="image/*,video/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
        >
          {t('chat:attach')}
        </Button>
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('chat:messageInput')}
          aria-label={t('chat:messageInput')}
          maxLength={MESSAGE_CONTENT_MAX_LENGTH}
          disabled={busy}
        />
        <Button
          type="button"
          onClick={() => void handleSend()}
          disabled={busy || (!text.trim() && !attachment)}
        >
          {t('chat:send')}
        </Button>
      </div>

      {uploadMutation.isPending && (
        <p className="mt-2 text-xs text-neutral-500" role="status">
          {progress === null
            ? t('chat:uploading')
            : t('chat:uploadingProgress', { percent: progress })}
        </p>
      )}
    </div>
  )
}
