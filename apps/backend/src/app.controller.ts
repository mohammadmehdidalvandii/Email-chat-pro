import { Controller, Get } from '@nestjs/common'
import type { ApiResponse } from '@email-chat-pro/types'
import { AppService } from './app.service'
import type { AppStatus } from './app.service'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getStatus(): ApiResponse<AppStatus> {
    return this.appService.getStatus()
  }
}
