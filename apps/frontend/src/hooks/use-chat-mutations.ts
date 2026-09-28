/**
 * Message send mutation (POST /chats/:chatId/messages).
 *
 * The response is written straight into the history and conversation caches so
 * the sent message appears immediately; the sender also receives its own
 * `message:received` broadcast, which `prependMessageToHistory` de-duplicates
 * by id. The refetch of history stays because the broadcast only covers the
 * participants currently in the room.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sendMessageApi } from '../lib/api/chats.api'
import type { CreateMessageInput, Message } from '@email-chat-pro/types'
import type { ApiRequestError } from '../lib/api/client'
import {
  applyIncomingMessage,
  CHAT_HISTORY_KEY,
  CONVERSATIONS_KEY,
} from './use-chat-query'

export type SendMessageError = ApiRequestError

export function useSendMessage(chatId: string | null) {
  const queryClient = useQueryClient()

  return useMutation<Message, SendMessageError, CreateMessageInput>({
    mutationFn: (dto) => {
      if (!chatId) throw new Error('chatId required')
      return sendMessageApi(chatId, dto)
    },
    onSuccess: (message) => {
      // Update the open chat and the conversation list from the response, then
      // let the server confirm history (covers messages sent while this tab was
      // not subscribed to the room).
      applyIncomingMessage(queryClient, message)
      void queryClient.invalidateQueries({ queryKey: CHAT_HISTORY_KEY, exact: false })
      void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY })
    },
  })
}
