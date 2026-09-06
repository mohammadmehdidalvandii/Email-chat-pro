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

  it('should return a successful API response with a status message', () => {
    const response = appController.getStatus()

    expect(response.success).toBe(true)
    expect(response.data?.message).toMatch(/Email-Chat-Pro API/)
  })
})
