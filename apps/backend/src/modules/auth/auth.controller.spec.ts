import type { Request, Response } from 'express'
import { Test } from '@nestjs/testing'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { User } from './entities/user.entity'
import { AUTH_COOKIE_NAME } from './strategies/jwt.strategy'

// @nestjs/jwt v12 ships ESM-only (type: module), which the CJS ts-jest pipeline
// cannot require. Unit tests mock the token issuer; the real module is
// exercised by live/integration verification.
jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}))

/** Minimal authenticated request shaped like the route handler's req. */
const makeRequest = (user: unknown): Request & { user: User } =>
  ({ user }) as unknown as Request & { user: User }

describe('AuthController', () => {
  let controller: AuthController

  const authService = {
    register: jest.fn(),
    verifyEmail: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    toUserDto: jest.fn(),
  }

  const cookieSpies = () => {
    const cookies: Record<string, unknown> = {}
    return {
      res: {
        cookie: jest.fn((name: string, value: unknown): void => {
          cookies[name] = value
        }),
        clearCookie: jest.fn((name: string): void => {
          delete cookies[name]
        }),
      },
      cookies,
    }
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

  describe('login', () => {
    it('wraps the login result and stores the JWT as an httpOnly cookie', async () => {
      const authUser = {
        id: 'uuid-1',
        email: 'user@example.com',
        isVerified: true,
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      }
      authService.login.mockResolvedValue({
        token: 'signed.jwt.token',
        user: authUser,
      })
      const { res, cookies } = cookieSpies()

      const dto = { email: 'user@example.com', password: 'SecurePass123!' }
      const response = await controller.login(dto, res as unknown as Response)

      expect(response.success).toBe(true)
      expect(response.data).toEqual({ token: 'signed.jwt.token', user: authUser })
      expect(response.timestamp).toEqual(expect.any(String))
      expect(res.cookie).toHaveBeenCalledWith(
        AUTH_COOKIE_NAME,
        'signed.jwt.token',
        expect.objectContaining({ httpOnly: true, path: '/' }),
      )
      expect(cookies[AUTH_COOKIE_NAME]).toBe('signed.jwt.token')
    })
  })

  describe('logout', () => {
    it('wraps the logout result and clears the auth cookie', async () => {
      authService.logout.mockResolvedValue({ message: 'Logged out' })
      const { res, cookies } = cookieSpies()

      const response = await controller.logout(res as unknown as Response)

      expect(authService.logout).toHaveBeenCalled()
      expect(response.success).toBe(true)
      expect(response.data).toEqual({ message: 'Logged out' })
      expect(res.clearCookie).toHaveBeenCalledWith(AUTH_COOKIE_NAME, { path: '/' })
      expect(cookies[AUTH_COOKIE_NAME]).toBeUndefined()
    })
  })

  describe('session', () => {
    it('returns the authenticated user in the ApiResponse envelope', async () => {
      const authenticatedUser = {
        id: 'uuid-1',
        email: 'user@example.com',
        isVerified: true,
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      }
      authService.toUserDto.mockReturnValue(authenticatedUser)

      const response = await controller.session(makeRequest(authenticatedUser))

      expect(authService.toUserDto).toHaveBeenCalledWith(authenticatedUser)
      expect(response.success).toBe(true)
      expect(response.data).toEqual({ user: authenticatedUser })
      expect(response.timestamp).toEqual(expect.any(String))
    })
  })
})
