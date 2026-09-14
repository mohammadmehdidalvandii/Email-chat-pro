import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { FilesController } from './files.controller'
import { FilesService } from './files.service'

/**
 * Files module (Task 4.1 — POST /files/upload).
 *
 * Owns the `/files` endpoints. Imports AuthModule so the upload route is
 * protected by JwtAuthGuard. No entities are registered: uploaded media is
 * stored in Cloudinary and referenced by URL (mediaUrl on messages), so the
 * module has no database footprint.
 */
@Module({
  imports: [AuthModule],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
