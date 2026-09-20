import { useQuery } from '@tanstack/react-query'
import { getUserConversationsApi, getChatHistoryApi } from '../lib/api/chats.api'
import { useAuthStore } from '../stores/auth.store'

export const CONVERSATIONS_KEY = ['conversations'] as const
export const CHAT_HISTORY_KEY = ['chatHistory'] as const

export function useConversations() {
  const token = useAuthStore((s) => s.token)
  return useQuery({
    queryKey: CONVERSATIONS_KEY,
    queryFn: () => getUserConversationsApi(),
    enabled: Boolean(token),
    staleTime: 1000 * 60, // 1 minute
  })
}

export function useChatHistory(chatId: string | null, enabled?: boolean) {
  const token = useAuthStore((s) => s.token)
  return useQuery({
    queryKey: [...CHAT_HISTORY_KEY, chatId],
    queryFn: () => {
      if (!chatId) throw new Error('chatId required')
      return getChatHistoryApi(chatId, 1, 50)
    },
    enabled: Boolean(token) && Boolean(chatId) && enabled !== false,
    staleTime: 0, // Messages change via WebSocket, so always stale
    refetchOnWindowFocus: false,
  })
}