import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module'
import { ChatsModule } from '../chats/chats.module'
import { Message } from './entities/message.entity'
import { MessagesController } from './messages.controller'
import { MessagesService } from './messages.service'

/**
 * Message persistence module (current-task.md Task 2.2).
 *
 * Owns the `/chats/:chatId/messages` endpoints. Imports AuthModule for the
 * JwtAuthGuard and AuthService.toUserDto mapping, and ChatsModule for the
 * ChatsService used during authorization checks.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Message]), AuthModule, ChatsModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
