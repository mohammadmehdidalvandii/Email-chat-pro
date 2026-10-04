'use client'

/**
 * SocketProvider — owns the single session-scoped Socket.IO connection
 * (architecture.md §WebSocket Architecture).
 *
 * ONE socket is opened for the whole authenticated session, not one per chat.
 * That matters beyond efficiency: the backend derives online presence from the
 * number of live sockets a user holds, so a per-chat connection would report
 * the user offline every time they moved between conversations.
 *
 * The connection is authenticated with the same JWT the REST calls use, carried
 * in the handshake `auth` payload exactly as the gateway reads it, and the
 * gateway is mounted on the `/chats` namespace.
 *
 * The provider is the only place that subscribes to server events. Room
 * membership is handled separately by `useChatSocket(chatId)`, which only emits
 * `chat:join` / `chat:leave` against this socket.
 */
import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import {
  WS_SERVER_EVENTS,
  type ErrorEvent,
  type Message,
  type MessageReadEvent,
  type MessageSentEvent,
  type PaginatedResponse,
  type PresenceChangedEvent,
} from '@email-chat-pro/types'
import { useAuthStore } from '../../stores/auth.store'
import { useChatStore } from '../../stores/chat.store'
import { useNotificationStore } from '../../stores/notification.store'
import { usePresenceStore } from '../../stores/presence.store'
import { applyIncomingMessage, CHAT_HISTORY_KEY, CONVERSATIONS_KEY } from '../../hooks/use-chat-query'

/** Backend origin; the gateway namespace is appended by the `io()` call. */
const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000'

/** The gateway is mounted on the `/chats` namespace, not the default one. */
const CHATS_NAMESPACE = '/chats'

/**
 * Ceiling on automatic reconnection attempts for one socket.
 *
 * The gateway rejects a handshake outright (and force-disconnects) when the
 * token is missing, invalid, or belongs to a deactivated user. That outcome
 * never changes on its own, so the retry loop must terminate rather than
 * re-checking a dead token indefinitely.
 */
const RECONNECTION_ATTEMPTS = 10

const SocketContext = createContext<SocketState>({ socket: null, isConnected: false, hasError: false })

/**
 * Tracks the live socket plus a last-error flag. The error is what lets the
 * chat header say "connection lost" instead of silently showing stale history.
 */
export interface SocketState {
  socket: Socket | null
  isConnected: boolean
  /** Set when a connect attempt failed (bad/rejected token, server down). */
  hasError: boolean
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const token = useAuthStore((s) => s.token)
  const setIsSocketConnected = useChatStore((s) => s.setIsSocketConnected)
  const activeChatId = useChatStore((s) => s.activeChatId)
  const userId = useAuthStore((s) => s.user?.id)
  const addNotification = useNotificationStore((s) => s.add)
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (!token) {
      socketRef.current?.disconnect()
      socketRef.current = null
      setIsConnected(false)
      return
    }

    const socket = io(`${SOCKET_URL}${CHATS_NAMESPACE}`, {
      auth: { token },
      transports: ['polling', 'websocket'],
      // Presence is re-broadcast on every (re)connect, so let the manager retry
      // transient drops instead of leaving the user silently offline.
      reconnection: true,
      // Bound the retries. The gateway force-disconnects any handshake whose
      // token is missing, expired, or belongs to an inactive user
      // (websocket.gateway.ts), and that rejection is permanent — without a
      // cap the manager would retry forever, re-validating the same bad token
      // against the database on every attempt. A transient outage recovers
      // well within this budget.
      reconnectionAttempts: RECONNECTION_ATTEMPTS,
      // Back off between attempts instead of hammering immediately.
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30_000,
    })
    socket.connect()
    socketRef.current = socket

    const onConnect = () => {
      setIsConnected(true)
      setHasError(false)
      setIsSocketConnected(true)
      // [RT-DELAY] temporary diagnostic
      console.debug('[RT-DELAY] SOCKET_CONNECTED', {
        socketId: socket.id,
        transport: socket.io.engine.transport.name,
        at: new Date().toISOString(),
      })
    }
    const onDisconnect = () => {
      setIsConnected(false)
      setIsSocketConnected(false)
      // [RT-DELAY] temporary diagnostic
      console.debug('[RT-DELAY] SOCKET_DISCONNECTED', {
        socketId: socket.id,
        at: new Date().toISOString(),
      })
    }
    // The gateway rejects an unauthenticated handshake before the connection is
    // established, so the reason arrives here rather than as a server event.
    const onConnectError = () => {
      setIsConnected(false)
      setHasError(true)
      setIsSocketConnected(false)
      // [RT-DELAY] temporary diagnostic — connection failure
      console.debug('[RT-DELAY] SOCKET_CONNECTION_ERROR', { at: new Date().toISOString() })
    }

    // [RT-DELAY] temporary diagnostic — transport upgrade (polling → websocket)
    socket.io.engine.on('upgrade', () => {
      console.debug('[RT-DELAY][SOCKET] event=upgrade', {
        transport: socket.io.engine.transport.name,
      })
    })

    // A message is written into the query cache, never into Zustand: TanStack
    // Query already owns this server state (rules.md §State Management).
    const onMessageReceived = (payload: MessageSentEvent) => {
      // [RT-DELAY] temporary diagnostic
      console.debug('[RT-DELAY][RECEIVE]', {
        chatId: payload.chatId,
        messageId: payload.message.id,
        at: new Date().toISOString(),
        transport: socket.io.engine.transport.name,
      })
      applyIncomingMessage(queryClient, payload.message)

      // Incoming-message notification (recipient only). A notification
      // is shown only when the current user is NOT the sender and is
      // not already viewing the conversation where the message landed
      // — in that case the message appears normally and no redundant
      // alert is needed. `message.id` is the dedupe identity: the
      // same event must never produce two notifications, so reconnect
      // re-delivery or a repeated emit is a no-op. The preview keeps
      // only the sender's name and the message content (already
      // authorized for this user); no other data is exposed.
      if (
        payload.message.senderId !== userId &&
        payload.chatId !== activeChatId
      ) {
        addNotification({
          id: payload.message.id,
          chatId: payload.chatId,
          senderName:
            payload.message.sender?.username ??
            payload.message.sender?.email ??
            '',
          preview: payload.message.content,
        })
      }
    }

    const onMessageRead = (event: MessageReadEvent) => {
      // Patch `readAt` into every cached history page of the affected chat.
      // The key shape is `['chatHistory', chatId, page]`, so the chat id is
      // index 1 — the page (index 2) must NOT be compared against the chatId.
      queryClient.getQueriesData<Message[] | PaginatedResponse<Message>>({
        queryKey: CHAT_HISTORY_KEY,
      }).forEach(([key, cached]) => {
        const [prefix, cachedChatId] = key as readonly unknown[]
        if (
          prefix === CHAT_HISTORY_KEY[0] &&
          typeof cachedChatId === 'string' &&
          cachedChatId === event.chatId &&
          cached &&
          typeof cached === 'object' &&
          'data' in cached &&
          Array.isArray((cached as unknown as Record<string, unknown>).data)
        ) {
          const updated = cached.data.map((message) =>
            event.messageIds.includes(message.id)
              ? { ...message, readAt: event.readAt }
              : message,
          )
          queryClient.setQueryData(key, { ...cached, data: updated })
        }
      })
      // Invalidate the conversation list so unread counts and the green
      // unread ring refresh from the backend's `unreadCount`.
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY })
    }

    const onPresenceChanged = (event: PresenceChangedEvent) => {
      usePresenceStore.getState().setPresence(event.userId, {
        status: event.status,
        lastSeenAt: event.lastSeenAt,
      })
    }

    // [RT-DELAY] temporary diagnostic — reconnect
    socket.on('connect', () => {
      console.debug('[RT-DELAY] SOCKET_RECONNECTED', {
        socketId: socket.id,
        transport: socket.io.engine.transport.name,
        at: new Date().toISOString(),
      })
    })

    // The gateway answers chat:join / chat:leave with these; an authorization
    // or lookup failure arrives as `error:event` rather than a throw.
    const onErrorEvent = (event: ErrorEvent) => {
      console.error(`WebSocket error [${event.code}]:`, event.message)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)
    socket.on(WS_SERVER_EVENTS.MESSAGE_RECEIVED, onMessageReceived)
    socket.on(WS_SERVER_EVENTS.MESSAGE_READ, onMessageRead)
    socket.on(WS_SERVER_EVENTS.PRESENCE_CHANGED, onPresenceChanged)
    socket.on(WS_SERVER_EVENTS.ERROR, onErrorEvent)
    socket.on(WS_SERVER_EVENTS.CHAT_JOINED, () => undefined)
    socket.on(WS_SERVER_EVENTS.CHAT_LEFT, () => undefined)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
      socket.off(WS_SERVER_EVENTS.MESSAGE_RECEIVED, onMessageReceived)
      socket.off(WS_SERVER_EVENTS.MESSAGE_READ, onMessageRead)
      socket.off(WS_SERVER_EVENTS.PRESENCE_CHANGED, onPresenceChanged)
      socket.off(WS_SERVER_EVENTS.ERROR, onErrorEvent)
      socket.off(WS_SERVER_EVENTS.CHAT_JOINED)
      socket.off(WS_SERVER_EVENTS.CHAT_LEFT)
      socket.disconnect()
      socketRef.current = null
      setIsConnected(false)
      setIsSocketConnected(false)
    }
  }, [token, queryClient, setIsSocketConnected])

  // The socket instance is stable for the session, so the context value only
  // changes when the connection state does.
  const value = useMemo<SocketState>(
    () => ({ socket: socketRef.current, isConnected, hasError }),
    [isConnected, hasError],
  )

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

/** The session socket plus its connection state; `socket` is null until a token exists. */
export function useSessionSocket(): SocketState {
  return useContext(SocketContext)
}
