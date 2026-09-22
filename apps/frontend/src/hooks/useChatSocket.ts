import { useEffect, useRef, useCallback } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/auth.store'
import { usePresenceStore } from '../stores/presence.store'
import { WS_CLIENT_EVENTS, WS_SERVER_EVENTS } from '@email-chat-pro/types'
import { CHAT_HISTORY_KEY } from './use-chat-query'
import type { PresenceChangedEvent } from '@email-chat-pro/types'

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000'

export function useChatSocket(activeChatId: string | null) {
  const socketRef = useRef<Socket | null>(null)
  const queryClient = useQueryClient()
  const token = useAuthStore((s) => s.token)

  const connect = useCallback(() => {
    if (!token || !activeChatId) return

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    })

    socket.on(WS_SERVER_EVENTS.MESSAGE_RECEIVED, (data: { message: unknown; chatId: string }) => {
      // Add the received message to the active chat's history cache.
      queryClient.setQueryData(
        [...CHAT_HISTORY_KEY, activeChatId],
        (old: { data: unknown[]; total: number } | undefined): { data: unknown[]; total: number } | undefined => {
          if (!old) return old
          const msg = data.message as { id: string }
          const exists = (old.data as { id: string }[]).some(
            (m) => m.id === msg.id
          )
          if (exists) return old
          return { ...old, data: [msg, ...old.data] } as { data: unknown[]; total: number }
        }
      )
    })

    socket.on(WS_SERVER_EVENTS.PRESENCE_CHANGED, (event: PresenceChangedEvent) => {
      const setPresence = usePresenceStore.getState().setPresence
      setPresence(event.userId, {
        status: event.status,
        lastSeenAt: event.lastSeenAt,
      })
    })

    socket.connect()
    socketRef.current = socket

    // Join the chat room once connected.
    socket.on('connect', () => {
      socket.emit(WS_CLIENT_EVENTS.JOIN_CHAT, { chatId: activeChatId })
    })

    return () => {
      socket.off(WS_SERVER_EVENTS.MESSAGE_RECEIVED)
      socket.off(WS_SERVER_EVENTS.PRESENCE_CHANGED)
      socket.disconnect()
      socketRef.current = null
    }
  }, [token, activeChatId, queryClient])

  useEffect(() => {
    if (!activeChatId || !token) {
      // Leave any previous chat.
      if (socketRef.current) {
        socketRef.current.emit(WS_CLIENT_EVENTS.LEAVE_CHAT, {
          chatId: activeChatId,
        })
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    const cleanup = connect()
    return cleanup
  }, [activeChatId, token, connect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [])

  return socketRef
}
