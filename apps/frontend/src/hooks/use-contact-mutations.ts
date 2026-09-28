/**
 * Contact request mutations (POST /contacts/requests,
 * PATCH /contacts/requests/:requestId).
 *
 * Accepting a request makes the backend create the one-to-one chat, so the
 * conversation list is invalidated too — the new chat must appear without a
 * manual refresh.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ContactRequest, CreateContactRequestInput, UpdateContactRequestInput } from '@email-chat-pro/types'
import { sendContactRequestApi, respondToContactRequestApi } from '../lib/api/contacts.api'
import type { ApiRequestError } from '../lib/api/client'
import { CONTACTS_KEY, INCOMING_KEY } from './use-contact-query'
import { CONVERSATIONS_KEY } from './use-chat-query'

export function useSendContactRequestMutation() {
  const qc = useQueryClient()
  return useMutation<ContactRequest, ApiRequestError, CreateContactRequestInput>({
    mutationFn: sendContactRequestApi,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: INCOMING_KEY })
    },
  })
}

export function useRespondToRequestMutation() {
  const qc = useQueryClient()
  return useMutation<ContactRequest, ApiRequestError, { requestId: string; input: UpdateContactRequestInput }>({
    mutationFn: ({ requestId, input }) => respondToContactRequestApi(requestId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: INCOMING_KEY })
      void qc.invalidateQueries({ queryKey: CONTACTS_KEY })
      void qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY })
    },
  })
}
