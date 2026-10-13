import { IsIn, IsOptional, IsString, Length, IsUUID } from 'class-validator'
import { ERROR_MESSAGES } from '@email-chat-pro/constants'
import {
  MEDIA_URL_MAX_LENGTH,
  MESSAGE_CONTENT_MAX_LENGTH,
  MESSAGE_CONTENT_MIN_LENGTH,
} from '@email-chat-pro/constants'

/**
 * Validated input for POST /api/v1/chats/:chatId/messages (architecture.md
 * §Validation Rules — Message Content; §Data Model — messages).
 *
 * - messageType: 'text', 'image', or 'video' (Task 4.2 enables video).
 * - content: 1–5000 characters when present. Optional at the DTO level so image
 *   and video messages may be sent without a caption; the service enforces the
 *   "required for text" rule with MESSAGE_CONTENT_REQUIRED.
 * - mediaUrl: 1–500 characters http(s) URL. Optional at the DTO level; the
 *   service enforces "required for image/video / forbidden for text".
 * - attachmentId: optional uuid of a pending attachment uploaded by this
 *   user (Task 4.1 — PostgreSQL BYTEA storage). Required for image/video
 *   when the attachment flow is used; the service validates ownership.
 */
export class CreateMessageDto {
  @IsOptional()
  @IsString()
  @Length(MESSAGE_CONTENT_MIN_LENGTH, MESSAGE_CONTENT_MAX_LENGTH)
  content?: string

  @IsIn(['text', 'image', 'video'], { message: ERROR_MESSAGES.MESSAGE_TYPE_INVALID })
  messageType!: 'text' | 'image' | 'video'

  @IsOptional()
  @IsString()
  @Length(1, MEDIA_URL_MAX_LENGTH)
  mediaUrl?: string | null

  @IsOptional()
  @IsUUID('4', { message: ERROR_MESSAGES.ATTACHMENT_ID_INVALID })
  attachmentId?: string
}
