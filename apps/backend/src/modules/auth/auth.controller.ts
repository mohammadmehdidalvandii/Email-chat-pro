import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import type {
  ApiResponse,
  LoginResponse,
  LogoutResponse,
  RegisterResponse,
  SessionResponse,
  VerifyEmailResponse,
} from '@email-chat-pro/types'
import type { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { VerifyEmailDto } from './dto/verify-email.dto'
import { User } from './entities/user.entity'
import { JwtAuthGuard } from './guards/jwt.guard'
import { AUTH_COOKIE_NAME } from './strategies/jwt.strategy'

/** Request enriched with the authenticated user by the JWT strategy. */
type AuthenticatedRequest = Request & { user: User }

/** Authentication endpoints (architecture.md §API Endpoints — Auth). */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<ApiResponse<RegisterResponse>> {
    const data = await this.authService.register(dto)
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<ApiResponse<VerifyEmailResponse>> {
    const data = await this.authService.verifyEmail(dto)
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * POST /auth/login — authenticates a verified user and starts a session.
   *
   * The signed JWT is returned in the body AND set as an httpOnly cookie so a
   * browser client is authenticated on subsequent requests without storing the
   * token in JavaScript (rules.md §Session Cookie — httpOnly).
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse<LoginResponse>> {
    const data = await this.authService.login(dto)
    res.cookie(AUTH_COOKIE_NAME, data.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    })
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }
  }

  /** POST /auth/logout — ends the session by clearing the httpOnly cookie. */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response): Promise<ApiResponse<LogoutResponse>> {
    const data = await this.authService.logout()
    res.clearCookie(AUTH_COOKIE_NAME, { path: '/' })
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * GET /auth/session — the minimal guarded endpoint that proves JWT
   * authentication works end to end (Task 1.3). Protected by JwtAuthGuard;
   * returns the authenticated user.
   */
  @Get('session')
  @UseGuards(JwtAuthGuard)
  async session(@Req() req: AuthenticatedRequest): Promise<ApiResponse<SessionResponse>> {
    return {
      success: true,
      data: { user: this.authService.toUserDto(req.user) },
      timestamp: new Date().toISOString(),
    }
  }
}
