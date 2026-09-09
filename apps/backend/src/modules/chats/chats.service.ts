import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { normalizeParticipants } from './chat-participants'
import { Chat } from './entities/chat.entity'

/**
 * Chats read-path foundation (Task 2.1 — Chat Foundation).
 *
 * Only the query path required by the data model is implemented here. The
 * service does NOT create chats and does NOT touch messages — chat creation
 * (explicit / implicit / from accepted contact) and message persistence are
 * separate, later tasks.
 */
@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(Chat)
    private readonly chatsRepository: Repository<Chat>,
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
}
