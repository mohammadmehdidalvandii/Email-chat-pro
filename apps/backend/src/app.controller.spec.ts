import { Test } from '@nestjs/testing'
import { AppController } from './app.controller'
import { AppService } from './app.service'

describe('AppController', () => {
  let appController: AppController

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile()

    appController = moduleRef.get(AppController)
  })

  it('should return a successful API response with a status message, uptime, and environment', () => {
    const response = appController.getStatus()

    expect(response.success).toBe(true)
    expect(response.data?.message).toMatch(/Email-Chat-Pro API/)
    expect(response.data?.uptime).toBeGreaterThan(0)
    expect(response.data?.environment).toBeDefined()
  })
})
