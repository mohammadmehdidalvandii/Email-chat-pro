import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ChatsService } from './chats.service'
import { Chat } from './entities/chat.entity'

/**
 * Chats module (Task 2.1 — Chat Foundation).
 *
 * Owns the chats data model and its read-path query. No controller yet — the
 * GET /chats conversation-list endpoint (Task 2.4) will add it. ChatsService is
 * exported so downstream tasks (message persistence, conversation list) can
 * reuse the participant-normalized lookup.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Chat])],
  providers: [ChatsService],
  exports: [ChatsService],
})
export class ChatsModule {}
