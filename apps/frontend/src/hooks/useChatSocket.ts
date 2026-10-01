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
import { WS_CLIENT_EVENTS } from '@email-chat-pro/types'
import { useSessionSocket } from '../components/Providers/SocketProvider'

export function useChatSocket(activeChatId: string | null): void {
  const { socket } = useSessionSocket()

  useEffect(() => {
    if (!socket || !activeChatId) return

    // The gateway's `chat:join` handler re-resolves the handshake token itself,
    // so the join is safe to emit as soon as the socket exists. Until the
    // connection is live the manager buffers nothing here, so wait for it.
    const join = () => socket.emit(WS_CLIENT_EVENTS.JOIN_CHAT, { chatId: activeChatId })

    if (socket.connected) {
      join()
    }

    // The server drops room membership on disconnect, so every reconnect needs a
    // fresh join. This must be a persistent `.on` listener, not `.once`: a
    // reconnect flips `socket.connected` back to true without changing any
    // dependency of this effect, so nothing else would re-run it and the
    // socket would sit connected while in no room — no incoming messages for
    // the rest of the session, with the header still showing "Connected".
    socket.on('connect', join)

    return () => {
      socket.off('connect', join)
      // Leaving a room only makes sense while still connected; the server
      // drops the membership on disconnect anyway.
      if (socket.connected) {
        socket.emit(WS_CLIENT_EVENTS.LEAVE_CHAT, { chatId: activeChatId })
      }
    }
  }, [socket, activeChatId])
}
