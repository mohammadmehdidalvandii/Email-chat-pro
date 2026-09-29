import { Type } from 'class-transformer'
import { IsInt, IsOptional, Max, Min } from 'class-validator'
import {
  MESSAGE_LIMIT_DEFAULT,
  MESSAGE_LIMIT_MAX,
  MESSAGE_LIMIT_MIN,
  MESSAGE_PAGE_DEFAULT,
  MESSAGE_PAGE_MIN,
} from '@email-chat-pro/constants'

/**
 * Query DTO for GET /chats/:chatId/messages (Task 2.2 — Message Persistence).
 *
 * `ParseIntPipe` alone only proves the value parses as an integer: it accepts
 * `page=0` and `limit=-5`, which would reach the repository as a negative
 * `skip`, and it accepts an arbitrarily large `limit`, which would let a client
 * pull an unbounded result set in one call. This DTO rejects out-of-range values
 * with the standard VALIDATION_ERROR envelope, before the service runs.
 *
 * Query strings are always strings, so `@Type` performs the numeric conversion.
 */
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MESSAGE_PAGE_MIN)
  page: number = MESSAGE_PAGE_DEFAULT

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MESSAGE_LIMIT_MIN)
  @Max(MESSAGE_LIMIT_MAX)
  limit: number = MESSAGE_LIMIT_DEFAULT
}
