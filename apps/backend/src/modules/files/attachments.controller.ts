import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt.guard'
import { Chat } from '../chats/entities/chat.entity'
import { Attachment } from './entities/attachment.entity'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import type { Request, Response } from 'express'
import { User } from '../auth/entities/user.entity'
import { ERROR_CODES, ERROR_MESSAGES } from '@email-chat-pro/constants'

/** Request enriched with the authenticated user by the JWT strategy. */
type AuthenticatedRequest = Request & { user: User }

@Controller('attachments')
export class AttachmentsController {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentRepo: Repository<Attachment>,
    @InjectRepository(Chat)
    private readonly chatRepo: Repository<Chat>,
  ) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getAttachment(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const attachment = await this.attachmentRepo.findOne({
      where: { id },
      relations: ['message'],
    })
    if (!attachment) {
      throw new NotFoundException({
        code: ERROR_CODES.NOT_FOUND,
        message: ERROR_MESSAGES.NOT_FOUND,
      })
    }
    const chatId = attachment.message?.chatId ?? attachment.messageId ?? null
    if (!chatId) {
      throw new NotFoundException({
        code: ERROR_CODES.NOT_FOUND,
        message: ERROR_MESSAGES.NOT_FOUND,
      })
    }
    const chat = await this.chatRepo.findOne({ where: { id: chatId } })
    if (!chat) {
      throw new NotFoundException({
        code: ERROR_CODES.CHAT_NOT_FOUND,
        message: ERROR_MESSAGES.CHAT_NOT_FOUND,
      })
    }
    if (chat.userAId !== req.user.id && chat.userBId !== req.user.id) {
      throw new NotFoundException({
        code: ERROR_CODES.NOT_CHAT_PARTICIPANT,
        message: ERROR_MESSAGES.NOT_CHAT_PARTICIPANT,
      })
    }
    res.setHeader('Content-Type', attachment.mimeType)
    res.setHeader('Cache-Control', 'private, max-age=3600')
    res.setHeader('Content-Disposition', `inline; filename="${attachment.originalName ?? 'attachment'}"`)
    res.status(200).send(attachment.data)
  }
}
