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
    searchUsers: jest.fn(),
    setAvatar: jest.fn(),
    removeAvatar: jest.fn(),
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

  describe('uploadAvatar', () => {
    it('sets the avatar on the authenticated caller and returns the updated profile', async () => {
      const authenticatedUser = { id: 'uuid-1', email: 'user@example.com', avatarUrl: null }
      const updated = { ...authenticatedUser, avatarUrl: '/api/v1/attachments/abc' }
      const file = { buffer: Buffer.from('png') } as Express.Multer.File

      usersService.setAvatar.mockResolvedValue(updated)
      authService.toUserDto.mockReturnValue(updated)

      const response = await controller.uploadAvatar(makeRequest(authenticatedUser), file)

      // The target user is ALWAYS req.user — the verified JWT principal — and
      // there is no client-supplied user id, so a caller cannot upload onto
      // another account's avatar (the JWT guard blocks unauthenticated calls).
      expect(usersService.setAvatar).toHaveBeenCalledWith(authenticatedUser, file)
      expect(authService.toUserDto).toHaveBeenCalledWith(updated)
      expect(response.success).toBe(true)
      expect(response.data).toEqual(updated)
      expect(response.timestamp).toEqual(expect.any(String))
      expect(response.error).toBeUndefined()
    })

    it('is guarded so an unauthenticated caller can never reach the service', () => {
      // Route is decorated with JwtAuthGuard (see controller source); without an
      // authenticated principal there is no req.user to act on, so the handler
      // cannot target a user. This documents the authorization boundary.
      const meta = Reflect.getMetadata('__guards__', UsersController.prototype.uploadAvatar) ?? []
      expect(meta.some((guard: unknown) => (guard as { name?: string })?.name === 'JwtAuthGuard')).toBe(true)
    })
  })

  describe('removeAvatar', () => {
    it('removes the avatar from the authenticated caller and returns the updated profile', async () => {
      const authenticatedUser = { id: 'uuid-1', email: 'user@example.com', avatarUrl: '/api/v1/attachments/abc' }
      const updated = { ...authenticatedUser, avatarUrl: null }

      usersService.removeAvatar.mockResolvedValue(updated)
      authService.toUserDto.mockReturnValue(updated)

      const response = await controller.removeAvatar(makeRequest(authenticatedUser))

      // Only the caller's own avatar is cleared; the user comes from req.user.
      expect(usersService.removeAvatar).toHaveBeenCalledWith(authenticatedUser)
      expect(authService.toUserDto).toHaveBeenCalledWith(updated)
      expect(response.success).toBe(true)
      expect(response.data).toEqual(updated)
      expect(response.timestamp).toEqual(expect.any(String))
      expect(response.error).toBeUndefined()
    })

    it('is guarded so an unauthenticated caller can never reach the service', () => {
      const meta = Reflect.getMetadata('__guards__', UsersController.prototype.removeAvatar) ?? []
      expect(meta.some((guard: unknown) => (guard as { name?: string })?.name === 'JwtAuthGuard')).toBe(true)
    })
  })

  describe('searchUsers', () => {
    it('searches and returns matching users mapped to the shared contract', async () => {
      const matched = { id: 'uuid-2', username: 'alice', fullName: 'Alice' }
      usersService.searchUsers.mockResolvedValue([matched])
      authService.toUserDto.mockReturnValue(matched)

      const response = await controller.searchUsers(makeRequest({ id: 'uuid-1' }), 'ali', 10)

      // The caller's id is threaded through so the service can exclude them.
      expect(usersService.searchUsers).toHaveBeenCalledWith('ali', 10, 'uuid-1')
      expect(authService.toUserDto).toHaveBeenCalledWith(matched)
      expect(response.success).toBe(true)
      expect(response.data).toEqual([matched])
      expect(response.timestamp).toEqual(expect.any(String))
      expect(response.error).toBeUndefined()
    })
  })
})
