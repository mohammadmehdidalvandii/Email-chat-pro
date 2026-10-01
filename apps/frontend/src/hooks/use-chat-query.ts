/**
 * Chat server-state hooks (rules.md §State Management — TanStack Query owns
 * server state; the message list is never mirrored into Zustand).
 *
 * Both the REST fetch and the WebSocket `message:received` handler write to
 * these same cache keys, so a message arrives whether it was sent from this
 * browser or pushed from the other participant.
 */
import { useQuery, type QueryClient } from '@tanstack/react-query'
import { getUserConversationsApi, getChatHistoryApi } from '../lib/api/chats.api'
import { useAuthStore } from '../stores/auth.store'
import type { ConversationListItem, Message, PaginatedResponse } from '@email-chat-pro/types'

export const CONVERSATIONS_KEY = ['conversations'] as const
export const CHAT_HISTORY_KEY = ['chatHistory'] as const

/** Messages requested per history page (backend default is also 50). */
export const CHAT_HISTORY_PAGE_SIZE = 50

/**
 * How often the conversation list refetches itself to pick up messages in chats
 * the user is not currently viewing.
 */
export const CONVERSATIONS_POLL_INTERVAL_MS = 30_000

/** Cache key for one chat's history page. */
export function chatHistoryKey(chatId: string, page: number): readonly unknown[] {
  return [...CHAT_HISTORY_KEY, chatId, page]
}

/**
 * Inserts a message at the head of a history page.
 *
 * The backend returns history newest-first, so a new message belongs at the
 * front. Messages are de-duplicated by id because the sender also receives the
 * `message:received` broadcast for its own message — the optimistic cache write
 * from the send mutation and the socket event describe the same row. Page 1 is
 * trimmed back to its limit to match what the server would return; deeper pages
 * are left untouched because a new message does not belong in them.
 */
export function prependMessageToHistory(
  cache: PaginatedResponse<Message> | undefined,
  message: Message,
): PaginatedResponse<Message> | undefined {
  if (!cache) return cache
  if (cache.data.some((existing) => existing.id === message.id)) return cache
  if (cache.pagination.page !== 1) return cache

  return {
    ...cache,
    data: [message, ...cache.data].slice(0, cache.pagination.limit),
    pagination: { ...cache.pagination, total: cache.pagination.total + 1 },
  }
}

/**
 * Reflects a newly received message in the conversation list so the preview,
 * the activity timestamp, and the ordering all follow backend data without a
 * refetch (§5).
 *
 * Ordering guard: the socket event, the optimistic send write, and the polling
 * refetch all reach this cache independently, so a message can arrive after a
 * newer one has already been applied. `createdAt` is the backend's own ordering
 * field (the same one `lastActivityAt` comes from), so a message older than the
 * preview it would replace is dropped instead of regressing the preview and the
 * list position.
 */
export function patchConversationWithMessage(
  cache: ConversationListItem[] | undefined,
  message: Message,
): ConversationListItem[] | undefined {
  if (!cache) return cache

  const updated = cache.map((conversation) => {
    if (conversation.id !== message.chatId) return conversation
    // Out-of-order arrival: never let an older message overwrite a newer
    // preview or move the conversation backwards in the list.
    if (conversation.lastMessage && conversation.lastMessage.createdAt > message.createdAt) {
      return conversation
    }
    return { ...conversation, lastMessage: message, lastActivityAt: message.createdAt }
  })

  // The backend sorts by lastActivityAt descending; mirror that exactly so the
  // list order never disagrees with a subsequent refetch.
  return [...updated].sort((a, b) => (a.lastActivityAt < b.lastActivityAt ? 1 : -1))
}

export function useConversations() {
  const token = useAuthStore((s) => s.token)
  return useQuery({
    queryKey: CONVERSATIONS_KEY,
    queryFn: () => getUserConversationsApi(),
    enabled: Boolean(token),
    staleTime: 1000 * 60, // 1 minute
    // The gateway broadcasts `message:received` only to the room the sender's
    // chat is in (`server.to('chat:' + chatId)`), and the client joins just the
    // chat it is currently viewing. A message in any other conversation
    // therefore never reaches this browser, so `applyIncomingMessage` cannot
    // patch it — the only way the list learns about it is a refetch. Poll on a
    // slow interval so background conversations surface on their own instead of
    // going stale until a manual refresh. TanStack Query pauses this in a
    // backgrounded tab unless `refetchIntervalInBackground` is enabled, so an
    // idle tab costs nothing.
    refetchInterval: CONVERSATIONS_POLL_INTERVAL_MS,
  })
}

export function useChatHistory(chatId: string | null, page: number = 1) {
  const token = useAuthStore((s) => s.token)
  return useQuery({
    queryKey: chatHistoryKey(chatId ?? '', page),
    queryFn: () => {
      if (!chatId) throw new Error('chatId required')
      return getChatHistoryApi(chatId, page, CHAT_HISTORY_PAGE_SIZE)
    },
    enabled: Boolean(token) && Boolean(chatId),
    staleTime: 0, // Messages change via WebSocket, so always stale
    refetchOnWindowFocus: false,
  })
}

/**
 * Resolves the chat id for a contact from the conversation list the backend
 * already returns. `GET /chats` exposes each conversation's `contact` (the
 * other participant) alongside its chat id, so no extra endpoint is needed to
 * turn an accepted contact into a link to their conversation.
 */
export function findChatIdForContact(
  conversations: ConversationListItem[] | undefined,
  contactId: string,
): string | undefined {
  return conversations?.find((conversation) => conversation.contact.id === contactId)?.id
}

/** Applies a newly received message to every cache it belongs to. */
export function applyIncomingMessage(queryClient: QueryClient, message: Message): void {
  queryClient.setQueryData(
    chatHistoryKey(message.chatId, 1),
    (cache: PaginatedResponse<Message> | undefined) => prependMessageToHistory(cache, message),
  )
  queryClient.setQueryData(CONVERSATIONS_KEY, (cache: ConversationListItem[] | undefined) =>
    patchConversationWithMessage(cache, message),
  )
}
