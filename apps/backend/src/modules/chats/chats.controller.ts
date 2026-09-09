import { Controller, Get, HttpCode, HttpStatus, Req, UseGuards } from '@nestjs/common'
import type { ApiResponse, ConversationListItem } from '@email-chat-pro/types'
import type { Request } from 'express'
import { User } from '../auth/entities/user.entity'
import { JwtAuthGuard } from '../auth/guards/jwt.guard'
import { ChatsService } from './chats.service'

/** Request enriched with the authenticated user by the JWT strategy. */
type AuthenticatedRequest = Request & { user: User }

/**
 * Conversation-list endpoint (architecture.md §API Endpoints — Chat Endpoints;
 * features.md — Phase 2, "Conversation List").
 *
 * Route prefix: `chats` (shares the /chats namespace with MessagesController,
 * which handles `:chatId/messages`). Only `GET /chats` is defined here — the
 * conversation list for the authenticated user.
 */
@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  /**
   * GET /chats — returns the authenticated user's active conversations,
   * sorted by recent activity (features.md — Conversation List).
   *
   * Protected by JwtAuthGuard; `req.user.id` is used to scope the query to
   * chats the user participates in, so a user can only ever see their own
   * conversations.
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getConversations(
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiResponse<ConversationListItem[]>> {
    const data = await this.chatsService.findUserConversations(req.user.id)
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }
  }
}
