import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Req, UseGuards } from '@nestjs/common'
import type { ApiResponse, ProfileResponse } from '@email-chat-pro/types'
import type { Request } from 'express'
import { AuthService } from '../auth/auth.service'
import { User } from '../auth/entities/user.entity'
import { JwtAuthGuard } from '../auth/guards/jwt.guard'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { UsersService } from './users.service'

/** Request enriched with the authenticated user by the JWT strategy. */
type AuthenticatedRequest = Request & { user: User }

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
}
