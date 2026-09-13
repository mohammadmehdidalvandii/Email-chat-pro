import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { ERROR_CODES, ERROR_MESSAGES } from '@email-chat-pro/constants'
import { DataSource, EntityManager, IsNull } from 'typeorm'
import { AuthService } from '../auth/auth.service'
import { User } from '../auth/entities/user.entity'
import { Chat } from '../chats/entities/chat.entity'
import { ContactsService } from './contacts.service'
import { ContactRequest } from './entities/contact-request.entity'

// @nestjs/jwt v12 ships ESM-only (type: module), which the CJS ts-jest pipeline
// cannot require. AuthService is imported at runtime by the service, so the
// issuer is mocked here; the real module is exercised by live verification.
jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}))

describe('ContactsService', () => {
  let service: ContactsService

  const contactRequestsRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  }

  const usersRepository = {
    findOne: jest.fn(),
  }

  const authService = {
    toUserDto: jest.fn(),
  }

  const manager: { update: jest.Mock; findOne: jest.Mock; create: jest.Mock; save: jest.Mock } = {
    update: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  }

  const dataSource = {
    transaction: jest.fn((cb: (m: EntityManager) => Promise<void>) => cb(manager as never)),
  }

  const baseUser: User = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'alice@example.com',
    passwordHash: 'hashed',
    isVerified: true,
    verificationTokenHash: null,
    verificationTokenExpiresAt: null,
    verifiedAt: null,
    username: 'alice',
    fullName: 'Alice',
    bio: null,
    avatarUrl: null,
    profileCompleted: true,
    lastSeenAt: new Date('2026-01-01T00:00:00Z'),
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
  }

  const userB: User = {
    ...baseUser,
    id: '22222222-2222-2222-2222-222222222222',
    email: 'bob@example.com',
    username: 'bob',
    fullName: 'Bob',
  }

  function makeRequest(status: string): ContactRequest {
    return {
      id: 'request-1',
      sender: baseUser,
      receiver: userB,
      status,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    }
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      providers: [
        ContactsService,
        { provide: getRepositoryToken(ContactRequest), useValue: contactRequestsRepository },
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: AuthService, useValue: authService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile()

    service = moduleRef.get(ContactsService)
    authService.toUserDto.mockImplementation((u: User) => ({ id: u.id, username: u.username }))
  })

  describe('sendRequest', () => {
    it('rejects a self-request with 400 and does not look up the receiver', async () => {
      await expect(service.sendRequest(baseUser, baseUser.id)).rejects.toThrow(BadRequestException)
      await expect(service.sendRequest(baseUser, baseUser.id)).rejects.toMatchObject({
        response: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: ERROR_MESSAGES.CONTACT_REQUEST_SELF_NOT_ALLOWED,
        },
      })
      expect(usersRepository.findOne).not.toHaveBeenCalled()
      expect(contactRequestsRepository.findOne).not.toHaveBeenCalled()
    })

    it('rejects an unknown/inactive receiver with 404', async () => {
      usersRepository.findOne.mockResolvedValue(null)

      await expect(service.sendRequest(baseUser, userB.id)).rejects.toThrow(NotFoundException)
      await expect(service.sendRequest(baseUser, userB.id)).rejects.toMatchObject({
        response: {
          code: ERROR_CODES.NOT_FOUND,
          message: ERROR_MESSAGES.CONTACT_REQUEST_RECEIVER_NOT_FOUND,
        },
      })
    })

    it('looks the receiver up as active and non-deleted', async () => {
      usersRepository.findOne.mockResolvedValue(userB)
      contactRequestsRepository.findOne.mockResolvedValue(null)
      contactRequestsRepository.create.mockImplementation((e) => ({
        ...e,
        id: 'request-1',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      }))
      contactRequestsRepository.save.mockImplementation((e) => e)

      await service.sendRequest(baseUser, userB.id)

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: userB.id, isActive: true, deletedAt: IsNull() },
      })
      expect(contactRequestsRepository.findOne).toHaveBeenCalledWith({
        where: { sender: { id: baseUser.id }, receiver: { id: userB.id } },
        relations: ['sender', 'receiver'],
      })
    })

    it('rejects a duplicate pending request with 409', async () => {
      usersRepository.findOne.mockResolvedValue(userB)
      contactRequestsRepository.findOne.mockResolvedValue(makeRequest('pending'))

      await expect(service.sendRequest(baseUser, userB.id)).rejects.toThrow(ConflictException)
      await expect(service.sendRequest(baseUser, userB.id)).rejects.toMatchObject({
        response: {
          code: ERROR_CODES.CONFLICT,
          message: ERROR_MESSAGES.CONTACT_REQUEST_DUPLICATE,
        },
      })
      expect(contactRequestsRepository.save).not.toHaveBeenCalled()
    })

    it('rejects a duplicate accepted request with 409', async () => {
      usersRepository.findOne.mockResolvedValue(userB)
      contactRequestsRepository.findOne.mockResolvedValue(makeRequest('accepted'))

      await expect(service.sendRequest(baseUser, userB.id)).rejects.toThrow(ConflictException)
      expect(contactRequestsRepository.save).not.toHaveBeenCalled()
    })

    it('reactivates a previously declined request to pending', async () => {
      usersRepository.findOne.mockResolvedValue(userB)
      const declined = makeRequest('declined')
      contactRequestsRepository.findOne.mockResolvedValue(declined)
      contactRequestsRepository.save.mockImplementation((e) => e)

      const result = await service.sendRequest(baseUser, userB.id)

      expect(contactRequestsRepository.save).toHaveBeenCalledTimes(1)
      expect(contactRequestsRepository.save).toHaveBeenCalledWith(declined)
      expect(declined.status).toBe('pending')
      expect(result.status).toBe('pending')
      expect(result.senderId).toBe(baseUser.id)
      expect(result.receiverId).toBe(userB.id)
    })

    it('creates and saves a new pending request, mapping it to the contract', async () => {
      usersRepository.findOne.mockResolvedValue(userB)
      contactRequestsRepository.findOne.mockResolvedValue(null)
      contactRequestsRepository.create.mockImplementation((e) => ({
        ...e,
        id: 'request-1',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      }))
      contactRequestsRepository.save.mockImplementation((e) => e)

      const result = await service.sendRequest(baseUser, userB.id)

      expect(contactRequestsRepository.create).toHaveBeenCalledWith({
        sender: baseUser,
        receiver: userB,
        status: 'pending',
      })
      expect(contactRequestsRepository.save).toHaveBeenCalledTimes(1)
      expect(result).toMatchObject({
        id: 'request-1',
        senderId: baseUser.id,
        receiverId: userB.id,
        status: 'pending',
      })
      expect(result.sender).toEqual({ id: baseUser.id, username: 'alice' })
      expect(result.receiver).toEqual({ id: userB.id, username: 'bob' })
      expect(typeof result.createdAt).toBe('string')
      expect(typeof result.updatedAt).toBe('string')
    })

    it('maps an insert unique-violation race to 409', async () => {
      usersRepository.findOne.mockResolvedValue(userB)
      contactRequestsRepository.findOne.mockResolvedValue(null)
      contactRequestsRepository.create.mockImplementation((e) => e)
      contactRequestsRepository.save.mockRejectedValue({ code: '23505' })

      await expect(service.sendRequest(baseUser, userB.id)).rejects.toThrow(ConflictException)
      await expect(service.sendRequest(baseUser, userB.id)).rejects.toMatchObject({
        response: {
          code: ERROR_CODES.CONFLICT,
          message: ERROR_MESSAGES.CONTACT_REQUEST_DUPLICATE,
        },
      })
    })

    it('rethrows non-unique save errors', async () => {
      usersRepository.findOne.mockResolvedValue(userB)
      contactRequestsRepository.findOne.mockResolvedValue(null)
      contactRequestsRepository.save.mockRejectedValue(new Error('boom'))

      await expect(service.sendRequest(baseUser, userB.id)).rejects.toThrow('boom')
    })
  })

  describe('getIncomingRequests', () => {
    it('returns only pending requests where the caller is the receiver, newest first', async () => {
      const older = makeRequest('pending')
      const newer = { ...makeRequest('pending'), id: 'request-2' }
      older.createdAt = new Date('2026-01-02T00:00:00Z')
      newer.createdAt = new Date('2026-01-03T00:00:00Z')
      contactRequestsRepository.find.mockResolvedValue([newer, older])

      const result = await service.getIncomingRequests(userB.id)

      expect(contactRequestsRepository.find).toHaveBeenCalledWith({
        where: { receiver: { id: userB.id }, status: 'pending' },
        relations: ['sender', 'receiver'],
        order: { createdAt: 'DESC' },
      })
      expect(result.map((r) => r.id)).toEqual(['request-2', 'request-1'])
      expect(result[0].status).toBe('pending')
    })

    it('returns an empty array when there are no incoming requests', async () => {
      contactRequestsRepository.find.mockResolvedValue([])

      const result = await service.getIncomingRequests(userB.id)

      expect(result).toEqual([])
    })
  })

  describe('respondToRequest', () => {
    it('rejects an unknown request id with 404', async () => {
      contactRequestsRepository.findOne.mockResolvedValue(null)

      await expect(service.respondToRequest(userB.id, 'request-1', 'accepted')).rejects.toThrow(
        NotFoundException,
      )
      await expect(
        service.respondToRequest(userB.id, 'request-1', 'accepted'),
      ).rejects.toMatchObject({
        response: {
          code: ERROR_CODES.NOT_FOUND,
          message: ERROR_MESSAGES.CONTACT_REQUEST_NOT_FOUND,
        },
      })
      expect(dataSource.transaction).not.toHaveBeenCalled()
    })

    it('rejects a response from someone who is not the receiver with 403', async () => {
      contactRequestsRepository.findOne.mockResolvedValue(makeRequest('pending'))

      await expect(service.respondToRequest(baseUser.id, 'request-1', 'accepted')).rejects.toThrow(
        ForbiddenException,
      )
      await expect(
        service.respondToRequest(baseUser.id, 'request-1', 'accepted'),
      ).rejects.toMatchObject({
        response: {
          code: ERROR_CODES.FORBIDDEN,
          message: ERROR_MESSAGES.CONTACT_REQUEST_NOT_RECEIVER,
        },
      })
      expect(dataSource.transaction).not.toHaveBeenCalled()
    })

    it('rejects responding to an already-responded request with 409', async () => {
      contactRequestsRepository.findOne.mockResolvedValue(makeRequest('accepted'))

      await expect(service.respondToRequest(userB.id, 'request-1', 'accepted')).rejects.toThrow(
        ConflictException,
      )
      await expect(
        service.respondToRequest(userB.id, 'request-1', 'accepted'),
      ).rejects.toMatchObject({
        response: {
          code: ERROR_CODES.CONFLICT,
          message: ERROR_MESSAGES.CONTACT_REQUEST_ALREADY_RESPONDED,
        },
      })
      expect(dataSource.transaction).not.toHaveBeenCalled()
    })

    it('accepts inside a transaction: updates status and creates the normalized chat', async () => {
      contactRequestsRepository.findOne.mockResolvedValue(makeRequest('pending'))
      manager.findOne.mockResolvedValue(null)
      manager.create.mockImplementation((_e, p) => ({ ...p, id: 'chat-new' }))
      manager.save.mockResolvedValue(true)

      const result = await service.respondToRequest(userB.id, 'request-1', 'accepted')

      expect(dataSource.transaction).toHaveBeenCalledTimes(1)
      expect(manager.update).toHaveBeenCalledWith(ContactRequest, 'request-1', {
        status: 'accepted',
        updatedAt: expect.any(Date),
      })
      // Normalized pair: userA (alice) < userB (bob), as the request is stored.
      expect(manager.findOne).toHaveBeenCalledWith(Chat, {
        where: { userAId: baseUser.id, userBId: userB.id },
      })
      expect(manager.create).toHaveBeenCalledWith(Chat, {
        userAId: baseUser.id,
        userBId: userB.id,
      })
      expect(manager.save).toHaveBeenCalledTimes(1)
      expect(result.status).toBe('accepted')
      expect(result.senderId).toBe(baseUser.id)
      expect(result.receiverId).toBe(userB.id)
    })

    it('normalizes the participant pair when the request direction is reversed', async () => {
      // sender = userB (2222...), receiver = baseUser (1111...) -> stored chat
      // must still use user_a = 1111... < user_b = 2222....
      const reversed = { ...makeRequest('pending'), sender: userB, receiver: baseUser }
      contactRequestsRepository.findOne.mockResolvedValue(reversed)
      manager.findOne.mockResolvedValue(null)
      manager.create.mockImplementation((_e, p) => ({ ...p, id: 'chat-new' }))

      await service.respondToRequest(baseUser.id, 'request-1', 'accepted')

      expect(manager.findOne).toHaveBeenCalledWith(Chat, {
        where: { userAId: baseUser.id, userBId: userB.id },
      })
      expect(manager.create).toHaveBeenCalledWith(Chat, {
        userAId: baseUser.id,
        userBId: userB.id,
      })
    })

    it('reuses an existing chat instead of creating a duplicate', async () => {
      contactRequestsRepository.findOne.mockResolvedValue(makeRequest('pending'))
      manager.findOne.mockResolvedValue({ id: 'chat-existing' })

      await service.respondToRequest(userB.id, 'request-1', 'accepted')

      expect(manager.create).not.toHaveBeenCalled()
      expect(manager.save).not.toHaveBeenCalled()
      expect(dataSource.transaction).toHaveBeenCalledTimes(1)
    })

    it('absorbs an isolated chat-insert race (23505) and still commits', async () => {
      contactRequestsRepository.findOne.mockResolvedValue(makeRequest('pending'))
      manager.findOne.mockResolvedValue(null)
      manager.create.mockImplementation((_e, p) => ({ ...p, id: 'chat-new' }))
      manager.save.mockRejectedValue({ code: '23505' })

      const result = await service.respondToRequest(userB.id, 'request-1', 'accepted')

      expect(manager.save).toHaveBeenCalledTimes(1)
      expect(result.status).toBe('accepted')
    })

    it('declines without creating a chat', async () => {
      contactRequestsRepository.findOne.mockResolvedValue(makeRequest('pending'))

      const result = await service.respondToRequest(userB.id, 'request-1', 'declined')

      expect(manager.update).toHaveBeenCalledWith(ContactRequest, 'request-1', {
        status: 'declined',
        updatedAt: expect.any(Date),
      })
      expect(manager.findOne).not.toHaveBeenCalled()
      expect(manager.create).not.toHaveBeenCalled()
      expect(manager.save).not.toHaveBeenCalled()
      expect(result.status).toBe('declined')
    })
  })
})
