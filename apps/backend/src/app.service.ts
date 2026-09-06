import { Injectable } from '@nestjs/common'
import type { ApiResponse } from '@email-chat-pro/types'

export interface AppStatus {
  message: string
}

@Injectable()
export class AppService {
  getStatus(): ApiResponse<AppStatus> {
    return {
      success: true,
      data: { message: 'Email-Chat-Pro API is running.' },
      timestamp: new Date().toISOString(),
    }
  }
}
