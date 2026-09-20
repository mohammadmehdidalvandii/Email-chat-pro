import { useQuery } from '@tanstack/react-query'
import { fetchContactsApi, fetchIncomingRequestsApi } from '../lib/api/contacts.api'
import { useAuthStore } from '../stores/auth.store'

export const CONTACTS_KEY = ['contacts'] as const
export const INCOMING_KEY = ['contacts', 'requests', 'incoming'] as const

export function useContacts() {
  const token = useAuthStore((s) => s.token)
  return useQuery({ queryKey: CONTACTS_KEY, queryFn: fetchContactsApi, enabled: Boolean(token), refetchOnWindowFocus: false, retry: false })
}

export function useIncomingRequests() {
  const token = useAuthStore((s) => s.token)
  return useQuery({ queryKey: INCOMING_KEY, queryFn: fetchIncomingRequestsApi, enabled: Boolean(token), refetchOnWindowFocus: false, retry: false })
}
