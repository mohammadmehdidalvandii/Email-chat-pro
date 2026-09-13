import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import type { ApiResponse, ContactRequest as ContactRequestContract } from '@email-chat-pro/types'
import type { Request } from 'express'
import { User } from '../auth/entities/user.entity'
import { JwtAuthGuard } from '../auth/guards/jwt.guard'
import { ContactsService } from './contacts.service'
import { CreateContactRequestDto } from './dto/create-contact-request.dto'
import { UpdateContactRequestDto } from './dto/update-contact-request.dto'

/** Request enriched with the authenticated user by the JWT strategy. */
type AuthenticatedRequest = Request & { user: User }

/**
 * Contact endpoints (architecture.md §API Endpoints — Contact Endpoints).
 *
 * All three endpoints are protected by JwtAuthGuard; `req.user` is the
 * authenticated entity attached by the JWT strategy and is always the caller
 * of the operation — the sender of a new request and the receiver of an accept
 * / decline are derived from it, never from the body (the body only carries
 * `receiverId` / `status`).
 */
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  /**
   * POST /contacts/requests — sends a new contact request to `receiverId`
   * (201). The sender is the authenticated user. Re-sending after a decline
   * reactivates the previous request to `pending` (same status code: the
   * endpoint's contract is "request sent").
   */
  @Post('requests')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async sendRequest(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateContactRequestDto,
  ): Promise<ApiResponse<ContactRequestContract>> {
    const request = await this.contactsService.sendRequest(req.user, dto.receiverId)
    return {
      success: true,
      data: request,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * GET /contacts/requests/incoming — the authenticated user's pending
   * incoming requests (200), newest first.
   */
  @Get('requests/incoming')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getIncomingRequests(
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiResponse<ContactRequestContract[]>> {
    const requests = await this.contactsService.getIncomingRequests(req.user.id)
    return {
      success: true,
      data: requests,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * PATCH /contacts/requests/:requestId — the authenticated user (as the
   * request's receiver) accepts or declines a pending request (200). `:requestId`
   * is validated as a UUID by ParseUUIDPipe before it reaches the service layer;
   * the service enforces receiver ownership (403) and pending-state (409).
   */
  @Patch('requests/:requestId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async respondToRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: UpdateContactRequestDto,
  ): Promise<ApiResponse<ContactRequestContract>> {
    const request = await this.contactsService.respondToRequest(req.user.id, requestId, dto.status)
    return {
      success: true,
      data: request,
      timestamp: new Date().toISOString(),
    }
  }
}
