import { Test } from '@nestjs/testing'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'

describe('AuthController', () => {
  let controller: AuthController

  const authService = {
    register: jest.fn(),
    verifyEmail: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile()

    controller = moduleRef.get(AuthController)
  })

  describe('register', () => {
    it('wraps the registered account in the standardized ApiResponse envelope', async () => {
      authService.register.mockResolvedValue({
        id: 'uuid-1',
        email: 'user@example.com',
        message: 'Registration successful',
      })

      const dto: RegisterDto = {
        email: 'user@example.com',
        password: 'SecurePass123!',
      }
      const response = await controller.register(dto)

      expect(response.success).toBe(true)
      expect(response.data).toEqual({
        id: 'uuid-1',
        email: 'user@example.com',
        message: 'Registration successful',
      })
      expect(response.timestamp).toEqual(expect.any(String))
      expect(response.error).toBeUndefined()
    })
  })

  describe('verifyEmail', () => {
    it('wraps the verification result in the standardized ApiResponse envelope', async () => {
      authService.verifyEmail.mockResolvedValue({ message: 'Email verified successfully' })

      const token = 'a'.repeat(64)
      const response = await controller.verifyEmail({ token })

      expect(authService.verifyEmail).toHaveBeenCalledWith({ token })
      expect(response.success).toBe(true)
      expect(response.data).toEqual({ message: 'Email verified successfully' })
      expect(response.timestamp).toEqual(expect.any(String))
      expect(response.error).toBeUndefined()
    })
  })
})
