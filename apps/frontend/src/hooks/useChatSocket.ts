/**
 * Chat room membership (architecture.md §WebSocket Architecture).
 *
 * The socket connection itself is owned by `SocketProvider` for the whole
 * session; this hook only keeps the room membership in sync with the chat the
 * user is currently viewing, emitting `chat:join` when it changes and
 * `chat:leave` on the way out. Presence is therefore unaffected by moving
 * between conversations.
 */
import { useEffect } from 'react'
import { WS_CLIENT_EVENTS, WS_SERVER_EVENTS } from '@email-chat-pro/types'
import { useSessionSocket } from '../components/Providers/SocketProvider'
import { useChatStore } from '../stores/chat.store'

export function useChatSocket(activeChatId: string | null): void {
  const { socket } = useSessionSocket()
  const setActiveChatId = useChatStore((s) => s.setActiveChatId)

  useEffect(() => {
    if (!socket || !activeChatId) return

    // The chat window this hook renders in owns the active-conversation
    // state: entering the chat registers it, unmounting (navigating away
    // or closing) clears it. The notification decision in SocketProvider
    // compares incoming `chatId` against this value, so an unread message
    // in the open conversation must NOT raise a banner, while a message in
    // any other conversation must.
    setActiveChatId(activeChatId)

    // The gateway's `chat:join` handler re-resolves the handshake token itself,
    // so the join is safe to emit as soon as the socket exists. Until the
    // connection is live the manager buffers nothing here, so wait for it.
    const join = () => socket.emit(WS_CLIENT_EVENTS.JOIN_CHAT, { chatId: activeChatId })

    if (socket.connected) {
      // [RT-DELAY] temporary diagnostic
      console.debug('[RT-DELAY] ROOM_JOIN_ATTEMPT', { chatId: activeChatId, socketId: socket.id, at: new Date().toISOString() })
      join()
    }

    // Rejoin after reconnect, and retry if socket connects after effect runs (race fix: Case 2).
    const onConnectRetry = () => {
      if (activeChatId && socket && socket.connected) {
        console.debug('[RT-DELAY] ROOM_JOIN_ATTEMPT (post-connect/reconnect)', { chatId: activeChatId, socketId: socket.id, at: new Date().toISOString() })
        join()
      }
    }
    socket.on(WS_SERVER_EVENTS.CHAT_JOINED, (data: { chatId: string }) => {
      console.debug('[RT-DELAY] ROOM_JOINED (backend ack)', { chatId: data.chatId, socketId: socket.id, at: new Date().toISOString() })
    })
    socket.on('connect', onConnectRetry)

    return () => {
      // Leave the room only while still connected; the server drops the
      // membership on disconnect anyway. Also clear activeChatId so a
      // message arriving after navigation produces a notification again.
      setActiveChatId(null)
      socket.off('connect', onConnectRetry)
      socket.off(WS_SERVER_EVENTS.CHAT_JOINED)
      if (socket.connected) {
        socket.emit(WS_CLIENT_EVENTS.LEAVE_CHAT, { chatId: activeChatId })
      }
    }
  }, [socket, activeChatId, setActiveChatId])
}
