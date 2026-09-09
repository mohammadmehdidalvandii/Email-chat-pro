import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module'
import { User } from '../auth/entities/user.entity'
import { Message } from '../messages/entities/message.entity'
import { ChatsController } from './chats.controller'
import { ChatsService } from './chats.service'
import { Chat } from './entities/chat.entity'

/**
 * Chats module (Task 2.1 — Chat Foundation; Task 2.4 — Conversation List).
 *
 * Owns the chats data model and its read-path queries. `GET /chats` (Task 2.4)
 * resolves each chat to its other participant (User) and latest message
 * (Message), so the module registers those repositories and imports AuthModule
 * for the shared User mapper. ChatsService is exported so downstream tasks
 * (message persistence) can reuse the participant-normalized lookup.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Chat, User, Message]), AuthModule],
  controllers: [ChatsController],
  providers: [ChatsService],
  exports: [ChatsService],
})
export class ChatsModule {}
