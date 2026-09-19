import { Injectable } from '@nestjs/common'
import type { ApiResponse } from '@email-chat-pro/types'

export interface AppStatus {
  message: string
  uptime: number
  environment: string
}

@Injectable()
export class AppService {
  getStatus(): ApiResponse<AppStatus> {
    return {
      success: true,
      data: {
        message: 'Email-Chat-Pro API is running.',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV ?? 'development',
      },
      timestamp: new Date().toISOString(),
    }
  }
}
