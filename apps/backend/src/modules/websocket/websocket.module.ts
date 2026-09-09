import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module'
import { ChatsModule } from '../chats/chats.module'
import { User } from '../auth/entities/user.entity'
import { ChatGateway } from './websocket.gateway'

/**
 * WebSocket module (current-task.md Task 2.3 — Real-time Messaging).
 *
 * Provides the Socket.IO gateway that handles authenticated connections,
 * authorized chat-room joins, and real-time message broadcasting.
 *
 * Imports:
 *   - AuthModule: JwtService (globally registered) for token verification,
 *     and the User entity via TypeOrmModule.forFeature.
 *   - ChatsModule: ChatsService for chat-membership authorization.
 *
 * The gateway is exported so the MessagesModule can inject it for REST-triggered
 * broadcasts.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User]), AuthModule, ChatsModule],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class WebSocketModule {}
