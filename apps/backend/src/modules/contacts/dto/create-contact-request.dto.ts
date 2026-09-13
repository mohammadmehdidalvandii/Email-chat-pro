import { IsUUID } from 'class-validator'

/**
 * Validated input for POST /api/v1/contacts/requests (architecture.md —
 * CreateContactRequestInput).
 *
 * The receiver is the only client-supplied field; the sender is the
 * authenticated user derived from the JWT (never trusted from the body).
 */
export class CreateContactRequestDto {
  @IsUUID()
  receiverId!: string
}
