import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import type { ApiResponse, RegisterResponse } from '@email-chat-pro/types'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'

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
}
