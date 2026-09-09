import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import type { ConversationListItem, Message as MessageContract } from '@email-chat-pro/types'
import { In, Repository } from 'typeorm'
import { AuthService } from '../auth/auth.service'
import { User } from '../auth/entities/user.entity'
import { Message } from '../messages/entities/message.entity'
import { normalizeParticipants } from './chat-participants'
import { Chat } from './entities/chat.entity'

/**
 * Chats read-path service (Task 2.1 — Chat Foundation; Task 2.4 —
 * Conversation List).
 *
 * Query paths implemented here:
 *   - findByParticipants / findById: single-chat lookups (Task 2.1).
 *   - findUserConversations: the authenticated user's conversation list
 *     (Task 2.4) — all chats the user participates in, each resolved to the
 *     other participant, its most recent message, and a recent-activity sort
 *     key.
 *
 * The service does NOT create chats and does NOT touch messages beyond
 * reading the latest one per chat for the list preview. Chat creation
 * (explicit / implicit / from accepted contact) is a separate, later task.
 */
@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(Chat)
    private readonly chatsRepository: Repository<Chat>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
    private readonly authService: AuthService,
  ) {}

  /**
   * Finds the chat between two participants, normalizing the pair first so
   * that `findByParticipants(A, B)` and `findByParticipants(B, A)` return the
   * same row (architecture.md — "Lookup normalizes pair before querying").
   *
   * Returns null when no chat exists between the pair.
   */
  async findByParticipants(userAId: string, userBId: string): Promise<Chat | null> {
    const [ua, ub] = normalizeParticipants(userAId, userBId)
    return this.chatsRepository.findOne({ where: { userAId: ua, userBId: ub } })
  }

  /**
   * Finds a chat by its id (architecture.md §API Endpoints — Message
   * Endpoints). Used by MessagesService to verify chat existence and
   * membership before persisting or reading messages.
   */
  async findById(id: string): Promise<Chat | null> {
    return this.chatsRepository.findOne({ where: { id } })
  }

  /**
   * Returns the authenticated user's conversation list (features.md — Phase 2,
   * "Conversation List"; GET /chats).
   *
   * Every chat where the user is a participant is returned, sorted by recent
   * activity (last message time, or chat creation time when empty). Each item
   * resolves:
   *   - `contact` — the other participant (the authenticated user's
   *     counterpart), mapped to the shared User contract.
   *   - `lastMessage` — the chat's most recent message (or null).
   *   - `lastActivityAt` — the recent-activity sort key.
   *
   * The other participants and the latest messages are each fetched in a
   * single query (no N+1).
   */
  async findUserConversations(userId: string): Promise<ConversationListItem[]> {
    const chats = await this.chatsRepository.find({
      where: [{ userAId: userId }, { userBId: userId }],
    })

    if (chats.length === 0) {
      return []
    }

    const chatIds = chats.map((c) => c.id)
    const otherUserIds = chats.map((c) => (c.userAId === userId ? c.userBId : c.userAId))

    const [otherUsers, lastMessages] = await Promise.all([
      this.usersRepository.find({ where: { id: In(otherUserIds) } }),
      this.loadLatestMessages(chatIds),
    ])

    const userById = new Map(otherUsers.map((u) => [u.id, u]))
    const messageByChat = new Map(lastMessages.map((m) => [m.chatId, m]))

    return chats
      .map((chat) => {
        const otherId = chat.userAId === userId ? chat.userBId : chat.userAId
        const other = userById.get(otherId)
        // Every chat the user participates in has a counterpart participant;
        // both are guaranteed to be present in `otherUsers`.
        if (!other) {
          return null
        }
        const lastMessage = messageByChat.get(chat.id) ?? null
        return {
          id: chat.id,
          contact: this.authService.toUserDto(other),
          lastMessage: lastMessage ? this.toMessageDto(lastMessage) : null,
          lastActivityAt: lastMessage
            ? lastMessage.createdAt.toISOString()
            : chat.createdAt.toISOString(),
        }
      })
      .filter((item): item is ConversationListItem => item !== null)
      .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
  }

  /**
   * Loads, for each chat id, its single most recent message in one query.
   *
   * Uses Postgres `DISTINCT ON (chat_id)` ordered by `created_at DESC` within
   * each chat, which yields exactly one row per chat (the latest message),
   * backed by the `idx_messages_chat_created (chat_id, created_at DESC)`
   * index. The sender relation is loaded so the Message contract can be built.
   */
  private loadLatestMessages(chatIds: string[]): Promise<Message[]> {
    return this.messagesRepository
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.sender', 'sender')
      .where('m.chat_id IN (:...chatIds)', { chatIds })
      .orderBy('m.chat_id', 'ASC')
      .addOrderBy('m.created_at', 'DESC')
      .distinctOn(['m.chat_id'])
      .getMany()
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
