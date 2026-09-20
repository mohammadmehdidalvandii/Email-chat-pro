import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sendMessageApi } from '../lib/api/chats.api'
import type { CreateMessageInput, Message } from '@email-chat-pro/types'
import { CHAT_HISTORY_KEY } from './use-chat-query'

export function useSendMessage(chatId: string | null) {
  const queryClient = useQueryClient()

  return useMutation<Message, Error, CreateMessageInput>({
    mutationFn: (dto) => {
      if (!chatId) throw new Error('chatId required')
      return sendMessageApi(chatId, dto)
    },
    onSuccess: () => {
      // Invalidate messages cache so history refreshes.
      queryClient.invalidateQueries({
        queryKey: CHAT_HISTORY_KEY,
        exact: false,
      })
    },
  })
}