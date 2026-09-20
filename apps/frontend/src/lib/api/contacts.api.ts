import type {
  ContactRequest,
  CreateContactRequestInput,
  UpdateContactRequestInput,
} from '@email-chat-pro/types'
import type { User } from '@email-chat-pro/types'
import { apiRequest } from './client'

export function sendContactRequestApi(input: CreateContactRequestInput): Promise<ContactRequest> {
  return apiRequest<ContactRequest>({ method: 'POST', url: '/contacts/requests', data: input })
}

export function fetchIncomingRequestsApi(): Promise<ContactRequest[]> {
  return apiRequest<ContactRequest[]>({ method: 'GET', url: '/contacts/requests/incoming' })
}

export function respondToContactRequestApi(
  requestId: string,
  input: UpdateContactRequestInput,
): Promise<ContactRequest> {
  return apiRequest<ContactRequest>({ method: 'PATCH', url: `/contacts/requests/${requestId}`, data: input })
}

export function fetchContactsApi(): Promise<User[]> {
  return apiRequest<User[]>({ method: 'GET', url: '/contacts' })
}

export function searchUsersApi(q: string): Promise<User[]> {
  return apiRequest<User[]>({ method: 'GET', url: `/users/search?q=${encodeURIComponent(q)}` })
}
