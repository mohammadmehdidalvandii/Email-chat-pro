/**
 * Shared contact-request contracts (architecture.md: packages/types/contact.types.ts).
 * Single source of truth for frontend and backend.
 *
 * Task 3.2 introduces the contact request lifecycle: send, view pending
 * incoming, accept, decline. The `ContactRequestStatus` union mirrors the
 * column CHECK constraint (`pending` / `accepted` / `declined`) in the
 * contact_requests migration.
 */

import type { User } from './user.types'

/**
 * Lifecycle state of a contact request (architecture.md §Data Model — Contact
 * Requests). Only `accepted` requests allow messaging (enforced in a later
 * task); `declined` requests can be re-sent by the same sender.
 */
export type ContactRequestStatus = 'pending' | 'accepted' | 'declined'

/**
 * A persisted contact request between two users (architecture.md — Contact
 * Request Types). Requests are one-directional: `sender` → `receiver`. Both
 * participants are full User objects so the recipient can identify the sender.
 */
export interface ContactRequest {
  id: string
  senderId: string
  sender: User
  receiverId: string
  receiver: User
  status: ContactRequestStatus
  createdAt: string
  updatedAt: string
}

/**
 * Request body for POST /contacts/requests (architecture.md — CreateContactRequestInput).
 * Only the receiver id is client-supplied; the sender is the authenticated user.
 */
export interface CreateContactRequestInput {
  receiverId: string
}

/**
 * Request body for PATCH /contacts/requests/:requestId (architecture.md —
 * UpdateContactRequestInput). The receiver responds with `accepted` (creates
 * the one-to-one chat) or `declined`.
 */
export interface UpdateContactRequestInput {
  status: Extract<ContactRequestStatus, 'accepted' | 'declined'>
}
