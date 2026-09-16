import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { WS_SERVER_EVENTS } from '@email-chat-pro/types'
import type { User as SharedUser } from '@email-chat-pro/types'
import type { Server } from 'socket.io'
import { User } from '../auth/entities/user.entity'
import { ContactsService } from '../contacts/contacts.service'
import { WebSocketService } from './websocket.service'

// @nestjs/jwt v12 ships ESM-only (type: module), which the CJS ts-jest pipeline
// cannot require. WebSocketService imports ContactsService, which imports
// AuthService (the JWT issuer), so the issuer is mocked here; the real module
// is exercised by live verification.
jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}))

describe('WebSocketService', () => {
  let service: WebSocketService
  const usersRepository = {
    update: jest.fn(),
  }

  const contactsService = {
    getContacts: jest.fn(),
  }

  const server = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
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

  const CONTACT_A = '22222222-2222-2222-2222-222222222222'
  const CONTACT_B = '33333333-3333-3333-3333-333333333333'

  beforeEach(async () => {
    jest.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      providers: [
        WebSocketService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: ContactsService, useValue: contactsService },
      ],
    }).compile()

    service = moduleRef.get(WebSocketService)
    service.attachServer(server as unknown as Server)
    // Start each test with a clean presence map.
    service['onlineSockets'].clear()
    usersRepository.update.mockResolvedValue(undefined)
    contactsService.getContacts.mockResolvedValue([])
  })

  describe('registerOnline', () => {
    it('marks the user online and broadcasts online to online contacts on the first socket', async () => {
      service['onlineSockets'].set(CONTACT_A, new Set(['socket-a']))
      contactsService.getContacts.mockResolvedValue([
        { id: CONTACT_A },
        { id: CONTACT_B },
      ] as SharedUser[])

      await service.registerOnline(baseUser, 'socket-1')

      expect(service.isOnline(baseUser.id)).toBe(true)
      expect(usersRepository.update).toHaveBeenCalledWith(baseUser.id, {
        lastSeenAt: expect.any(Date),
      })
      // Only the online contact's socket receives the event.
      expect(server.to).toHaveBeenCalledTimes(1)
      expect(server.to).toHaveBeenCalledWith('socket-a')
      expect(server.emit).toHaveBeenCalledWith(WS_SERVER_EVENTS.PRESENCE_CHANGED, {
        userId: baseUser.id,
        status: 'online',
        lastSeenAt: expect.any(String),
      })
    })

    it('does not re-broadcast or write last_seen_at for an additional device', async () => {
      await service.registerOnline(baseUser, 'socket-1')
      jest.clearAllMocks()
      contactsService.getContacts.mockResolvedValue([])

      await service.registerOnline(baseUser, 'socket-2')

      expect(usersRepository.update).not.toHaveBeenCalled()
      expect(server.emit).not.toHaveBeenCalled()
      expect(service.isOnline(baseUser.id)).toBe(true)
    })
  })

  describe('unregisterOnline', () => {
    it('keeps the user online while another socket remains connected', async () => {
      await service.registerOnline(baseUser, 'socket-1')
      await service.registerOnline(baseUser, 'socket-2')
      jest.clearAllMocks()
      contactsService.getContacts.mockResolvedValue([])

      await service.unregisterOnline(baseUser.id, 'socket-1')

      expect(service.isOnline(baseUser.id)).toBe(true)
      expect(usersRepository.update).not.toHaveBeenCalled()
      expect(server.emit).not.toHaveBeenCalled()
    })

    it('records last_seen_at and broadcasts offline to online contacts on the last socket', async () => {
      service['onlineSockets'].set(CONTACT_A, new Set(['socket-a']))
      await service.registerOnline(baseUser, 'socket-1')
      jest.clearAllMocks()
      contactsService.getContacts.mockResolvedValue([{ id: CONTACT_A }] as SharedUser[])

      await service.unregisterOnline(baseUser.id, 'socket-1')

      expect(service.isOnline(baseUser.id)).toBe(false)
      expect(usersRepository.update).toHaveBeenCalledWith(baseUser.id, {
        lastSeenAt: expect.any(Date),
      })
      expect(server.to).toHaveBeenCalledWith('socket-a')
      expect(server.emit).toHaveBeenCalledWith(WS_SERVER_EVENTS.PRESENCE_CHANGED, {
        userId: baseUser.id,
        status: 'offline',
        lastSeenAt: expect.any(String),
      })
    })

    it('is a no-op for a user with no registered sockets', async () => {
      await service.unregisterOnline('nobody', 'socket-1')

      expect(usersRepository.update).not.toHaveBeenCalled()
      expect(server.emit).not.toHaveBeenCalled()
    })
  })

  describe('broadcast safety', () => {
    it('swallows the broadcast when no server is attached but still records last_seen_at', async () => {
      service['server'] = null

      await service.registerOnline(baseUser, 'socket-1')

      expect(usersRepository.update).toHaveBeenCalledWith(baseUser.id, {
        lastSeenAt: expect.any(Date),
      })
      expect(server.emit).not.toHaveBeenCalled()
    })

    it('does not emit to the changing user themselves (a user is not their own contact)', async () => {
      service['onlineSockets'].set(baseUser.id, new Set(['socket-mine']))
      contactsService.getContacts.mockResolvedValue([])

      await service.registerOnline({ ...baseUser, id: baseUser.id }, 'socket-2')

      // The user's own socket exists but is not a contact, so it must not
      // receive its own presence event.
      expect(server.emit).not.toHaveBeenCalled()
    })
  })
})
