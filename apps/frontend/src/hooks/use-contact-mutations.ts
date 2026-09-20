import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ContactRequest, CreateContactRequestInput, UpdateContactRequestInput } from '@email-chat-pro/types'
import { sendContactRequestApi, respondToContactRequestApi } from '../lib/api/contacts.api'
import { CONTACTS_KEY, INCOMING_KEY } from './use-contact-query'

export function useSendContactRequestMutation() {
  const qc = useQueryClient()
  return useMutation<ContactRequest, Error, CreateContactRequestInput>({
    mutationFn: sendContactRequestApi,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: INCOMING_KEY }) },
  })
}

export function useRespondToRequestMutation() {
  const qc = useQueryClient()
  return useMutation<ContactRequest, Error, { requestId: string; input: UpdateContactRequestInput }>({
    mutationFn: ({ requestId, input }) => respondToContactRequestApi(requestId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: INCOMING_KEY })
      void qc.invalidateQueries({ queryKey: CONTACTS_KEY })
    },
  })
}
