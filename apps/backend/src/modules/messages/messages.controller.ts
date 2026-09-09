import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import type {
  ApiResponse,
  Message as MessageContract,
  PaginatedResponse,
} from '@email-chat-pro/types'
import type { Request } from 'express'
import { User } from '../auth/entities/user.entity'
import { JwtAuthGuard } from '../auth/guards/jwt.guard'
import { CreateMessageDto } from './dto/create-message.dto'
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
   * Query params:
   *   - page (default 1)
   *   - limit (default 50)
   */
  @Get(':chatId/messages')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getHistory(
    @Req() req: AuthenticatedRequest,
    @Param('chatId', ParseUUIDPipe) _chatId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ): Promise<PaginatedResponse<MessageContract>> {
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
