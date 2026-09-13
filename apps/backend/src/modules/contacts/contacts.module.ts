import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module'
import { User } from '../auth/entities/user.entity'
import { Chat } from '../chats/entities/chat.entity'
import { ContactsController } from './contacts.controller'
import { ContactsService } from './contacts.service'
import { ContactRequest } from './entities/contact-request.entity'

/**
 * Contacts module (Task 3.2 — Contact Requests).
 *
 * Owns the contact_requests data model and the request lifecycle (send /
 * incoming / accept / decline). Accepting atomically creates the one-to-one
 * chat, so the Chat entity is registered here and the Chat insert runs inside
 * the same transaction as the status update (ContactsService injects the
 * shared DataSource provided by TypeOrmModule.forRoot in AppModule). AuthModule
 * provides the shared User mapper (AuthService.toUserDto) and JwtAuthGuard.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ContactRequest, User, Chat]), AuthModule],
  controllers: [ContactsController],
  providers: [ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}
