import { apiRequest } from './client'
import type { Message, ConversationListItem, PaginatedResponse, CreateMessageInput } from '@email-chat-pro/types'

export async function getUserConversationsApi(): Promise<ConversationListItem[]> {
  return apiRequest<ConversationListItem[]>({
    method: 'GET',
    url: '/chats',
  })
}

export async function getChatHistoryApi(chatId: string, page: number, limit: number): Promise<PaginatedResponse<Message>> {
  return apiRequest<PaginatedResponse<Message>>({
    method: 'GET',
    url: `/chats/${chatId}/messages`,
    params: { page, limit },
  })
}

export async function sendMessageApi(chatId: string, dto: CreateMessageInput): Promise<Message> {
  return apiRequest<Message>({
    method: 'POST',
    url: `/chats/${chatId}/messages`,
    data: dto,
  })
}
