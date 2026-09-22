'use client'
import { useState, useRef, ChangeEvent } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
  MESSAGE_CONTENT_MAX_LENGTH,
  IMAGE_MAX_SIZE_BYTES,
  VIDEO_MAX_SIZE_BYTES,
  IMAGE_MIME_TYPES,
  VIDEO_MIME_TYPES,
  ERROR_CODES,
} from '@email-chat-pro/constants'
import { MessageType } from '@email-chat-pro/types'
import { useMutation } from '@tanstack/react-query'
import { uploadFileApi } from '../../lib/api/files.api'
import { translateApiError } from '../../i18n/errors'
import { useTranslation } from 'react-i18next'

interface MessageInputProps {
  onSend: (content: string, messageType: MessageType, mediaUrl?: string | null) => void
  disabled?: boolean
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const { t } = useTranslation(['chat', 'errors'], { useSuspense: false })
  const [text, setText] = useState('')
  const [media, setMedia] = useState<{ url: string; type: MessageType } | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadMutation = useMutation({
    mutationFn: uploadFileApi,
    onSuccess: (_data, _variables) => {
      // variables is FormData, but we can't easily read it back to get type.
      // We'll trust the type passed by the change handler via a temporary state.
      // (Refactor: could use a more robust way to track pending type).
      setUploadError(null)
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : ''
      setUploadError(translateApiError(ERROR_CODES.INTERNAL_ERROR, message || 'Upload failed'))
    },
  })

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError(null)

    const isImage = IMAGE_MIME_TYPES.includes(file.type as any)
    const isVideo = VIDEO_MIME_TYPES.includes(file.type as any)

    if (!isImage && !isVideo) {
      setUploadError(translateApiError(ERROR_CODES.VALIDATION_ERROR, 'Invalid file type'))
      return
    }

    const maxSize = isImage ? IMAGE_MAX_SIZE_BYTES : VIDEO_MAX_SIZE_BYTES
    if (file.size > maxSize) {
      setUploadError(translateApiError(ERROR_CODES.VALIDATION_ERROR, 'File too large'))
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', isImage ? 'image' : 'video')

    try {
      const result = await uploadMutation.mutateAsync(formData)
      setMedia({ url: result.url, type: isImage ? 'image' : 'video' })
    } catch {
      // Error is handled via onError above and displayed inline.
    }
  }

  const handleSend = () => {
    const trimmed = text.trim()
    if (disabled || (trimmed.length === 0 && !media)) return
    onSend(trimmed, media ? media.type : 'text', media?.url)
    setText('')
    setMedia(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex items-end gap-2 p-4">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('chat:messageInput')}
        maxLength={MESSAGE_CONTENT_MAX_LENGTH}
        disabled={disabled}
      />
      <input type="file" accept="image/*,video/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
      <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={disabled || uploadMutation.isPending}>Attach</Button>
      <Button onClick={handleSend} disabled={disabled || (!text.trim() && !media) || uploadMutation.isPending}>Send</Button>
      {media && (
        <div className="text-xs text-neutral-600">{media.type}:{media.url.slice(0, 40)}...</div>
      )}
      {uploadMutation.isPending && <span className="text-xs text-neutral-500">{t('chat:uploading')}</span>}
      {uploadMutation.error ? (
        <span className="text-xs text-red-500">{translateApiError(ERROR_CODES.INTERNAL_ERROR, 'Upload error')}</span>
      ) : null}
      {uploadError && (
        <span className="text-xs text-red-500">{uploadError}</span>
      )}
    </div>
  )
}
