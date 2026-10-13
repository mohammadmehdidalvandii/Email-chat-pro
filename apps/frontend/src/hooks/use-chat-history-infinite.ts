import { useInfiniteQuery, type QueryClient } from '@tanstack/react-query'
import { getChatHistoryApi } from '../lib/api/chats.api'
import { useAuthStore } from '../stores/auth.store'
import type { Message, PaginatedResponse } from '@email-chat-pro/types'

export const CHAT_HISTORY_KEY = ['chatHistory'] as const
export const CHAT_HISTORY_PAGE_SIZE = 50

export function chatHistoryInfiniteKey(chatId: string) {
  return [...CHAT_HISTORY_KEY, chatId]
}

export function useChatHistoryInfinite(chatId: string | null) {
  const token = useAuthStore((s) => s.token)
  return useInfiniteQuery({
    queryKey: chatHistoryInfiniteKey(chatId ?? ''),
    queryFn: ({ pageParam = 1 }) => {
      if (!chatId) throw new Error('chatId required')
      return getChatHistoryApi(chatId, pageParam, CHAT_HISTORY_PAGE_SIZE)
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: PaginatedResponse<Message>) => {
      if (lastPage.pagination.page >= lastPage.pagination.pages) return undefined
      return lastPage.pagination.page + 1
    },
    enabled: Boolean(token) && Boolean(chatId),
    staleTime: 0,
    refetchOnWindowFocus: false,
  })
}
