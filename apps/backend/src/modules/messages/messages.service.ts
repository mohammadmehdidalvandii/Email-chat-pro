import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ERROR_CODES, ERROR_MESSAGES } from '@email-chat-pro/constants'
import type { Message as MessageContract } from '@email-chat-pro/types'
import { Repository } from 'typeorm'
import { AuthService } from '../auth/auth.service'
import { User } from '../auth/entities/user.entity'
import { ChatsService } from '../chats/chats.service'
import { CreateMessageDto } from './dto/create-message.dto'
import { Message } from './entities/message.entity'

/**
 * Message persistence service (architecture.md §WebSocket Architecture —
 * Message Flow; current-task.md Task 2.2).
 *
 * Responsibilities:
 *   - sendMessage: authorize (chat exists → 404, participant → 403), validate,
 *     persist, return the shared Message contract.
 *   - getHistory: authorize, paginate newest-first, return PaginatedResponse.
 *
 * Authorization boundary (Task 2.2): chat membership only.
 * Contact-relationship gating is Phase 3 (contact_requests table does not exist
 * yet).
 */
@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
    private readonly chatsService: ChatsService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Persists a new message in the specified chat.
   *
   * Flow (architecture.md §WebSocket Architecture — Message Flow):
   *   authorization → message validation → persistence → successful delivery
   *
   * Authorization:
   *   1. Chat must exist (404 otherwise — prevents leaking chat existence).
   *   2. Authenticated user must be a participant (403 otherwise).
   *
   * The sender relation is saved explicitly to avoid TypeORM cascade surprises;
   * senderId is derived from sender.id in the response object.
   */
  async sendMessage(sender: User, chatId: string, dto: CreateMessageDto): Promise<MessageContract> {
    const chat = await this.chatsService.findById(chatId)
    if (!chat) {
      throw new NotFoundException({
        code: ERROR_CODES.NOT_FOUND,
        message: ERROR_MESSAGES.CHAT_NOT_FOUND,
      })
    }

    if (chat.userAId !== sender.id && chat.userBId !== sender.id) {
      throw new ForbiddenException({
        code: ERROR_CODES.FORBIDDEN,
        message: ERROR_MESSAGES.NOT_CHAT_PARTICIPANT,
      })
    }

    if (dto.messageType === 'text' && dto.mediaUrl) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: ERROR_MESSAGES.MESSAGE_MEDIA_NOT_ALLOWED,
      })
    }

    const message = this.messagesRepository.create({
      chatId,
      sender,
      content: dto.content,
      messageType: dto.messageType,
      mediaUrl: dto.mediaUrl ?? null,
    })
    const saved = await this.messagesRepository.save(message)

    return this.toMessageDto(saved)
  }

  /**
   * Returns paginated message history for a chat (architecture.md §API
   * Endpoints — Message Endpoints).
   *
   * - Page defaults to 1, limit defaults to 50.
   * - Messages are returned newest-first (created_at DESC) using the
   *   idx_messages_chat_created index.
   * - Authorization is identical to sendMessage.
   */
  async getHistory(
    userId: string,
    chatId: string,
    page: number,
    limit: number,
  ): Promise<{ data: MessageContract[]; total: number }> {
    const chat = await this.chatsService.findById(chatId)
    if (!chat) {
      throw new NotFoundException({
        code: ERROR_CODES.NOT_FOUND,
        message: ERROR_MESSAGES.CHAT_NOT_FOUND,
      })
    }

    if (chat.userAId !== userId && chat.userBId !== userId) {
      throw new ForbiddenException({
        code: ERROR_CODES.FORBIDDEN,
        message: ERROR_MESSAGES.NOT_CHAT_PARTICIPANT,
      })
    }

    const [entities, total] = await this.messagesRepository.findAndCount({
      where: { chatId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['sender'],
    })

    return {
      data: entities.map((e) => this.toMessageDto(e)),
      total,
    }
  }

  /** Maps a persisted Message entity to the shared Message contract. */
  private toMessageDto(message: Message): MessageContract {
    return {
      id: message.id,
      chatId: message.chatId,
      senderId: message.sender.id,
      sender: this.authService.toUserDto(message.sender),
      content: message.content,
      messageType: message.messageType as MessageContract['messageType'],
      mediaUrl: message.mediaUrl,
      createdAt: message.createdAt.toISOString(),
    }
  }
}
