import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Throttle } from '@nestjs/throttler'
import { memoryStorage } from 'multer'
import type {
  ApiResponse,
  DeleteAccountResponse,
  ProfileResponse,
  UserSearchResponse,
} from '@email-chat-pro/types'
import type { Request } from 'express'
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  IMAGE_MAX_SIZE_BYTES,
  IMAGE_MIME_TYPES,
  SEARCH_LIMIT_DEFAULT,
} from '@email-chat-pro/constants'
import { endpointThrottles } from '../../config/rate-limit.config'
import { AuthService } from '../auth/auth.service'
import { User } from '../auth/entities/user.entity'
import { JwtAuthGuard } from '../auth/guards/jwt.guard'
import { FileSizeExceptionFilter } from '../files/filters/file-size.exception.filter'
import { DeleteAccountDto } from './dto/delete-account.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { UsersService } from './users.service'

/** Request enriched with the authenticated user by the JWT strategy. */
type AuthenticatedRequest = Request & { user: User }

/** MIME types the avatar route accepts (images only — SVG is rejected). */
const AVATAR_MIME_TYPES = new Set<string>(IMAGE_MIME_TYPES)

/**
 * Multer fileFilter for the avatar route — a cheap MIME pre-check before the
 * authoritative magic-byte inspection in FilesService. The client-supplied mime
 * type alone is never trusted; it only rejects clearly-wrong uploads early.
 */
function avatarFileFilter(
  _req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  if (AVATAR_MIME_TYPES.has(file.mimetype)) {
    callback(null, true)
  } else {
    callback(
      new BadRequestException({
        code: ERROR_CODES.FILE_TYPE_INVALID,
        message: ERROR_MESSAGES.FILE_TYPE_INVALID,
      }),
      false,
    )
  }
}

/**
 * User endpoints (architecture.md §API Endpoints — User Endpoints).
 * Both endpoints are protected by JwtAuthGuard; `req.user` is the
 * authenticated entity attached by the JWT strategy.
 */
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  /** GET /users/me — returns the authenticated user's profile (Task 1.4). */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getMe(@Req() req: AuthenticatedRequest): Promise<ApiResponse<ProfileResponse>> {
    return {
      success: true,
      data: this.authService.toUserDto(req.user),
      timestamp: new Date().toISOString(),
    }
  }

  /** PATCH /users/me — updates the authenticated user's profile (Task 1.4). */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateMe(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ): Promise<ApiResponse<ProfileResponse>> {
    const updated = await this.usersService.updateProfile(req.user, dto)
    return {
      success: true,
      data: this.authService.toUserDto(updated),
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * POST /users/me/avatar — uploads or replaces the authenticated user's avatar.
   *
   * Multipart/form-data field: `file` (required), an image.
   *
   * The target user is ALWAYS `req.user` (the verified JWT principal); there is
   * no client-supplied user id, so an authenticated user cannot upload to
   * another user's profile. The image is validated server-side by
   * FilesService.uploadImage (magic bytes + dimensions + size) and stored as an
   * attachment row (`messageId: null`); `users.avatar_url` points at it.
   *
   * Response 200 with the shared ApiResponse envelope carrying the updated
   * ProfileResponse (so the frontend refreshes its profile cache directly).
   */
  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @UseFilters(FileSizeExceptionFilter)
  @Throttle(endpointThrottles.UPLOAD_FILE)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: IMAGE_MAX_SIZE_BYTES },
      fileFilter: avatarFileFilter,
    }),
  )
  @HttpCode(HttpStatus.OK)
  async uploadAvatar(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<ApiResponse<ProfileResponse>> {
    const updated = await this.usersService.setAvatar(req.user, file)
    return {
      success: true,
      data: this.authService.toUserDto(updated),
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * DELETE /users/me/avatar — removes the authenticated user's avatar.
   *
   * Only the caller's own avatar is cleared (the user comes from `req.user`).
   * The attachment row is deleted best-effort to avoid an orphaned blob; a
   * storage cleanup failure never leaves the profile inconsistent (avatar_url is
   * cleared first via UsersService, and the row deletion is independent).
   */
  @Delete('me/avatar')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async removeAvatar(
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiResponse<ProfileResponse>> {
    const updated = await this.usersService.removeAvatar(req.user)
    return {
      success: true,
      data: this.authService.toUserDto(updated),
      timestamp: new Date().toISOString(),
    }
  }

  /** DELETE /users/me — deletes (anonymizes) the authenticated account (Task 1.5). */
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteMe(
    @Req() req: AuthenticatedRequest,
    @Body() dto: DeleteAccountDto,
  ): Promise<ApiResponse<DeleteAccountResponse>> {
    await this.usersService.deleteAccount(req.user, dto)
    return {
      success: true,
      data: { message: ERROR_MESSAGES.ACCOUNT_DELETED },
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * GET /users/search — searches active users by username (partial) or email
   * (exact) (architecture.md §API Endpoints — User Endpoints; Task 3.1).
   *
   * Query params:
   *   - q: the search query (username or email)
   *   - limit: default 10, max 50
   *
   * Protected by JwtAuthGuard; the authenticated user is excluded from the
   * results so a search never returns the caller.
   */
  @Get('search')
  @UseGuards(JwtAuthGuard)
  @Throttle(endpointThrottles.SEARCH_USERS)
  @HttpCode(HttpStatus.OK)
  async searchUsers(
    @Req() req: AuthenticatedRequest,
    @Query('q') q: string | undefined,
    @Query('limit', new DefaultValuePipe(SEARCH_LIMIT_DEFAULT), ParseIntPipe) limit: number,
  ): Promise<ApiResponse<UserSearchResponse>> {
    const users = await this.usersService.searchUsers(q, limit, req.user.id)
    return {
      success: true,
      data: users.map((user) => this.authService.toUserDto(user)),
      timestamp: new Date().toISOString(),
    }
  }
}
