import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type {
  ApiResponse,
  Message as MessageContract,
  PaginatedResponse,
} from '@email-chat-pro/types'
import type { Request } from 'express'
import { endpointThrottles } from '../../config/rate-limit.config'
import { User } from '../auth/entities/user.entity'
import { JwtAuthGuard } from '../auth/guards/jwt.guard'
import { CreateMessageDto } from './dto/create-message.dto'
import { PaginationDto } from './dto/pagination.dto'
import { MessagesService } from './messages.service'

/** Request enriched with the authenticated user by the JWT strategy. */
type AuthenticatedRequest = Request & { user: User }

/**
 * Message endpoints (architecture.md §API Endpoints — Message Endpoints).
 *
 * Both endpoints are protected by JwtAuthGuard; `req.user` is the
 * authenticated entity attached by the JWT strategy.
 *
 * Route prefix: `chats` (shares the /chats namespace with a future
 * ChatsController for the conversation-list endpoint).
 */
@Controller('chats')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /**
   * POST /chats/:chatId/messages — sends a new message in the specified chat.
   *
   * Route param `chatId` is validated as a UUID by ParseUUIDPipe before it
   * reaches the service layer. The service handles authorization (403) and
   * chat-existence checks (404).
   */
  @Post(':chatId/messages')
  @UseGuards(JwtAuthGuard)
  @Throttle(endpointThrottles.SEND_MESSAGE)
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Req() req: AuthenticatedRequest,
    @Param('chatId', ParseUUIDPipe) _chatId: string,
    @Body() dto: CreateMessageDto,
  ): Promise<ApiResponse<MessageContract>> {
    const message = await this.messagesService.sendMessage(req.user, _chatId, dto)
    return {
      success: true,
      data: message,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * GET /chats/:chatId/messages — returns paginated message history for the
   * specified chat (newest-first).
   *
   * Query params are validated by {@link PaginationDto} (page >= 1,
   * 1 <= limit <= MESSAGE_LIMIT_MAX), so an out-of-range value is a
   * VALIDATION_ERROR 400 rather than a negative `skip` reaching the database or
   * an unbounded result set.
   */
  @Get(':chatId/messages')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getHistory(
    @Req() req: AuthenticatedRequest,
    @Param('chatId', ParseUUIDPipe) _chatId: string,
    @Query(new ValidationPipe({ transform: true })) pagination: PaginationDto,
  ): Promise<PaginatedResponse<MessageContract>> {
    const { page, limit } = pagination
    const { data, total } = await this.messagesService.getHistory(req.user.id, _chatId, page, limit)
    const pages = total === 0 ? 0 : Math.ceil(total / limit)
    return {
      success: true,
      data,
      pagination: { total, page, limit, pages },
      timestamp: new Date().toISOString(),
    }
  }
}
