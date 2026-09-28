/**
 * Chat API calls (architecture.md §API Endpoints — Chat/Message Endpoints).
 *
 * Each function maps to one backend endpoint and returns the `data` payload
 * from the shared envelope. Failures throw an `ApiRequestError`.
 */
import { apiPaginatedRequest, apiRequest } from './client'
import type {
  ConversationListItem,
  CreateMessageInput,
  Message,
  MessageType,
  PaginatedResponse,
} from '@email-chat-pro/types'

/** GET /chats — the authenticated user's conversations, newest activity first. */
export async function getUserConversationsApi(): Promise<ConversationListItem[]> {
  return apiRequest<ConversationListItem[]>({
    method: 'GET',
    url: '/chats',
  })
}

/**
 * GET /chats/:chatId/messages — paginated history, newest-first.
 *
 * Uses the paginated envelope: the backend returns `pagination` as a sibling
 * of `data`, so it is preserved here for the page controls.
 */
export async function getChatHistoryApi(
  chatId: string,
  page: number,
  limit: number,
): Promise<PaginatedResponse<Message>> {
  return apiPaginatedRequest<Message>({
    method: 'GET',
    url: `/chats/${chatId}/messages`,
    params: { page, limit },
  })
}

/**
 * POST /chats/:chatId/messages — persist and broadcast a new message.
 *
 * `CreateMessageInput` carries `chatId` for the call site, but the route path
 * already identifies the chat and `CreateMessageDto` has no such field. The
 * backend runs a global `ValidationPipe` with `forbidNonWhitelisted`, so
 * including it would fail the request with 400. It is destructured out here.
 *
 * `content` is omitted entirely when empty (media-only message): the DTO
 * requires 1–5000 characters when present, and the service stores `''` itself
 * for image/video messages.
 */
export async function sendMessageApi(
  chatId: string,
  dto: CreateMessageInput,
): Promise<Message> {
  const { chatId: _ignoredChatId, content, messageType, mediaUrl } = dto

  const body: { content?: string; messageType: MessageType; mediaUrl?: string } =
    mediaUrl ? { messageType, mediaUrl } : { messageType, content }

  return apiRequest<Message>({
    method: 'POST',
    url: `/chats/${chatId}/messages`,
    data: body,
  })
}
