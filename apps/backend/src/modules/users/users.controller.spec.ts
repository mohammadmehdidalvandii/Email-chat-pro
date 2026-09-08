import type { Request } from 'express'
import { Test } from '@nestjs/testing'
import { ERROR_MESSAGES } from '@email-chat-pro/constants'
import { AuthService } from '../auth/auth.service'
import { User } from '../auth/entities/user.entity'
import { DeleteAccountDto } from './dto/delete-account.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

// @nestjs/jwt v12 ships ESM-only (type: module), which the CJS ts-jest pipeline
// cannot require. AuthService is imported at runtime by the controller, so the
// issuer is mocked here; the real module is exercised by live verification.
jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}))

/** Minimal authenticated request shaped like the route handler's req. */
const makeRequest = (user: unknown): Request & { user: User } =>
  ({ user }) as unknown as Request & { user: User }

describe('UsersController', () => {
  let controller: UsersController

  const usersService = {
    updateProfile: jest.fn(),
    deleteAccount: jest.fn(),
  }
  const authService = {
    toUserDto: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: AuthService, useValue: authService },
      ],
    }).compile()

    controller = moduleRef.get(UsersController)
  })

  describe('getMe', () => {
    it('returns the authenticated user in the ApiResponse envelope', async () => {
      const authenticatedUser = { id: 'uuid-1', email: 'user@example.com' }
      authService.toUserDto.mockReturnValue(authenticatedUser)

      const response = await controller.getMe(makeRequest(authenticatedUser))

      expect(authService.toUserDto).toHaveBeenCalledWith(authenticatedUser)
      expect(response.success).toBe(true)
      expect(response.data).toEqual(authenticatedUser)
      expect(response.timestamp).toEqual(expect.any(String))
      expect(response.error).toBeUndefined()
    })
  })

  describe('updateMe', () => {
    it('updates the profile and returns the updated user in the envelope', async () => {
      const authenticatedUser = { id: 'uuid-1', email: 'user@example.com' }
      const updated = { id: 'uuid-1', email: 'user@example.com', username: 'alice' }
      const dto: UpdateProfileDto = { username: 'alice' }

      usersService.updateProfile.mockResolvedValue(updated)
      authService.toUserDto.mockReturnValue(updated)

      const response = await controller.updateMe(makeRequest(authenticatedUser), dto)

      expect(usersService.updateProfile).toHaveBeenCalledWith(authenticatedUser, dto)
      expect(authService.toUserDto).toHaveBeenCalledWith(updated)
      expect(response.success).toBe(true)
      expect(response.data).toEqual(updated)
      expect(response.timestamp).toEqual(expect.any(String))
      expect(response.error).toBeUndefined()
    })
  })

  describe('deleteMe', () => {
    it('deletes the account and returns the success message in the envelope', async () => {
      const authenticatedUser = { id: 'uuid-1', email: 'user@example.com' }
      const dto: DeleteAccountDto = { password: 'SecurePass123!' }

      usersService.deleteAccount.mockResolvedValue(undefined)

      const response = await controller.deleteMe(makeRequest(authenticatedUser), dto)

      expect(usersService.deleteAccount).toHaveBeenCalledWith(authenticatedUser, dto)
      expect(response.success).toBe(true)
      expect(response.data).toEqual({ message: ERROR_MESSAGES.ACCOUNT_DELETED })
      expect(response.timestamp).toEqual(expect.any(String))
      expect(response.error).toBeUndefined()
    })
  })
})
