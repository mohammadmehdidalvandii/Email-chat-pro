import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from '../auth/auth.module'
import { Chat } from '../chats/entities/chat.entity'
import { Attachment } from './entities/attachment.entity'
import { FilesController } from './files.controller'
import { AttachmentsController } from './attachments.controller'
import { FilesService } from './files.service'

/**
 * Files module (Task 4.1 — POST /files/upload, GET /attachments/:id).
 * Now owns both upload and retrieval endpoints. Uses TypeORM for PostgreSQL
 * BYTEA storage (Attachment entity). Auth via JwtAuthGuard.
 */
@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Attachment, Chat])],
  controllers: [FilesController, AttachmentsController],
  providers: [FilesService],
})
export class FilesModule {}
