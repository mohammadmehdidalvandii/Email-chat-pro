'use client'
import { useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { MESSAGE_CONTENT_MAX_LENGTH } from '@email-chat-pro/constants'

interface MessageInputProps {
  onSend: (content: string) => void
  disabled?: boolean
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [text, setText] = useState('')

  const handleSend = () => {
    const trimmed = text.trim()
    if (trimmed.length === 0 || trimmed.length > MESSAGE_CONTENT_MAX_LENGTH || disabled) return
    onSend(trimmed)
    setText('')
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
        placeholder="Type a message..."
        maxLength={MESSAGE_CONTENT_MAX_LENGTH}
        disabled={disabled}
      />
      <Button onClick={handleSend} disabled={disabled || !text.trim()}>
        Send
      </Button>
    </div>
  )
}
