import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module'
import { ChatsModule } from '../chats/chats.module'
import { ContactsModule } from '../contacts/contacts.module'
import { User } from '../auth/entities/user.entity'
import { ChatGateway } from './websocket.gateway'
import { WebSocketService } from './websocket.service'

/**
 * WebSocket module (current-task.md Task 2.3 — Real-time Messaging;
 * Task 4.4 — Presence).
 *
 * Provides the Socket.IO gateway that handles authenticated connections,
 * authorized chat-room joins, real-time message broadcasting, and presence
 * tracking, plus the presence service that derives online/offline state from
 * the connection lifecycle and notifies contacts of status changes.
 *
 * Imports:
 *   - AuthModule: JwtService (globally registered) for token verification,
 *     and the User entity via TypeOrmModule.forFeature.
 *   - ChatsModule: ChatsService for chat-membership authorization.
 *   - ContactsModule: ContactsService to resolve a user's accepted contacts
 *     for presence broadcast.
 *
 * The gateway is exported so the MessagesModule can inject it for REST-triggered
 * broadcasts.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User]), AuthModule, ChatsModule, ContactsModule],
  providers: [ChatGateway, WebSocketService],
  exports: [ChatGateway],
})
export class WebSocketModule {}
