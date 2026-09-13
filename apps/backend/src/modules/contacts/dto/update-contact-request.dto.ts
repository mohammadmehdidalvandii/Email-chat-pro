import { IsIn } from 'class-validator'
import { CONTACT_REQUEST_RESPONSE_STATUSES, ERROR_MESSAGES } from '@email-chat-pro/constants'

/**
 * Validated input for PATCH /api/v1/contacts/requests/:requestId
 * (architecture.md — UpdateContactRequestInput).
 *
 * The recipient may only respond with `accepted` (also creates the one-to-one
 * chat) or `declined`. Any other value is rejected by the global
 * ValidationPipe with 400 VALIDATION_ERROR using the shared documented message.
 */
export class UpdateContactRequestDto {
  @IsIn(CONTACT_REQUEST_RESPONSE_STATUSES, {
    message: ERROR_MESSAGES.CONTACT_REQUEST_STATUS_INVALID,
  })
  status!: 'accepted' | 'declined'
}
