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
  type MessageSentEvent,
  type PresenceChangedEvent,
} from '@email-chat-pro/types'
import { useAuthStore } from '../../stores/auth.store'
import { useChatStore } from '../../stores/chat.store'
import { usePresenceStore } from '../../stores/presence.store'
import { applyIncomingMessage } from '../../hooks/use-chat-query'

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
      transports: ['websocket'],
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
    }
    const onDisconnect = () => {
      setIsConnected(false)
      setIsSocketConnected(false)
    }
    // The gateway rejects an unauthenticated handshake before the connection is
    // established, so the reason arrives here rather than as a server event.
    const onConnectError = () => {
      setIsConnected(false)
      setHasError(true)
      setIsSocketConnected(false)
    }

    // A message is written into the query cache, never into Zustand: TanStack
    // Query already owns this server state (rules.md §State Management).
    const onMessageReceived = (payload: MessageSentEvent) => {
      applyIncomingMessage(queryClient, payload.message)
    }

    const onPresenceChanged = (event: PresenceChangedEvent) => {
      usePresenceStore.getState().setPresence(event.userId, {
        status: event.status,
        lastSeenAt: event.lastSeenAt,
      })
    }

    // The gateway answers chat:join / chat:leave with these; an authorization
    // or lookup failure arrives as `error:event` rather than a throw.
    const onErrorEvent = (event: ErrorEvent) => {
      // eslint-disable-next-line no-console
      console.error(`WebSocket error [${event.code}]:`, event.message)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)
    socket.on(WS_SERVER_EVENTS.MESSAGE_RECEIVED, onMessageReceived)
    socket.on(WS_SERVER_EVENTS.PRESENCE_CHANGED, onPresenceChanged)
    socket.on(WS_SERVER_EVENTS.ERROR, onErrorEvent)
    socket.on(WS_SERVER_EVENTS.CHAT_JOINED, () => undefined)
    socket.on(WS_SERVER_EVENTS.CHAT_LEFT, () => undefined)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
      socket.off(WS_SERVER_EVENTS.MESSAGE_RECEIVED, onMessageReceived)
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
