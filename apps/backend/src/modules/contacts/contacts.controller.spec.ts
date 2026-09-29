import { Test } from '@nestjs/testing'
import { THROTTLER_LIMIT, THROTTLER_TTL } from '@nestjs/throttler/dist/throttler.constants'
import { endpointThrottles } from '../../config/rate-limit.config'
import { User } from '../auth/entities/user.entity'
import { ContactsController } from './contacts.controller'
import { ContactsService } from './contacts.service'

// @nestjs/jwt v12 ships ESM-only (type: module); the CJS jest transformer
// cannot handle it. This mock short-circuits the ESM import chain (the
// controller's JwtAuthGuard import reaches @nestjs/jwt transitively).
jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}))

describe('ContactsController', () => {
  let controller: ContactsController

  const contactsService = {
    sendRequest: jest.fn(),
    getIncomingRequests: jest.fn(),
    respondToRequest: jest.fn(),
    getContacts: jest.fn(),
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

  const requestContract = {
    id: 'request-1',
    senderId: baseUser.id,
    sender: { id: baseUser.id },
    receiverId: '22222222-2222-2222-2222-222222222222',
    receiver: { id: '22222222-2222-2222-2222-222222222222' },
    status: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      controllers: [ContactsController],
      providers: [{ provide: ContactsService, useValue: contactsService }],
    }).compile()

    controller = moduleRef.get(ContactsController)
  })

  it('POST requests delegates sendRequest with the authenticated user and wraps the result', async () => {
    contactsService.sendRequest.mockResolvedValue(requestContract)

    const result = await controller.sendRequest({ user: baseUser } as never, {
      receiverId: requestContract.receiverId,
    })

    expect(contactsService.sendRequest).toHaveBeenCalledWith(baseUser, requestContract.receiverId)
    expect(result.success).toBe(true)
    expect(result.data).toEqual(requestContract)
    expect(typeof result.timestamp).toBe('string')
  })

  it('GET requests/incoming delegates getIncomingRequests with the caller id', async () => {
    contactsService.getIncomingRequests.mockResolvedValue([requestContract])

    const result = await controller.getIncomingRequests({ user: baseUser } as never)

    expect(contactsService.getIncomingRequests).toHaveBeenCalledWith(baseUser.id)
    expect(result.success).toBe(true)
    expect(result.data).toEqual([requestContract])
  })

  it('PATCH requests/:requestId delegates respondToRequest with the caller as receiver', async () => {
    contactsService.respondToRequest.mockResolvedValue({ ...requestContract, status: 'accepted' })

    const result = await controller.respondToRequest(
      { user: baseUser } as never,
      requestContract.id,
      { status: 'accepted' },
    )

    expect(contactsService.respondToRequest).toHaveBeenCalledWith(
      baseUser.id,
      requestContract.id,
      'accepted',
    )
    expect(result.success).toBe(true)
    expect(result.data).toMatchObject({ status: 'accepted' })
  })

  it('GET contacts delegates getContacts with the caller id and wraps the contacts', async () => {
    const contacts = [{ id: '22222222-2222-2222-2222-222222222222', username: 'bob' }]
    contactsService.getContacts.mockResolvedValue(contacts)

    const result = await controller.getContacts({ user: baseUser } as never)

    expect(contactsService.getContacts).toHaveBeenCalledWith(baseUser.id)
    expect(result.success).toBe(true)
    expect(result.data).toEqual(contacts)
    expect(typeof result.timestamp).toBe('string')
  })

  // P1-5: contact requests previously had no per-endpoint limit.
  describe('rate limiting', () => {
    /** The values @Throttle wrote onto the route handler, keyed 'default'. */
    const appliedThrottle = () => {
      const handler = ContactsController.prototype.sendRequest
      return {
        limit: Reflect.getMetadata(`${THROTTLER_LIMIT}default`, handler),
        ttl: Reflect.getMetadata(`${THROTTLER_TTL}default`, handler),
      }
    }

    it('applies the configured contact-request limit to POST contacts/requests', () => {
      expect(appliedThrottle()).toEqual(endpointThrottles.CONTACT_REQUEST.default)
    })

    it('bounds the endpoint with a real, non-empty limit', () => {
      const { limit, ttl } = appliedThrottle()

      expect(limit).toBeGreaterThan(0)
      expect(ttl).toBeGreaterThan(0)
    })
  })
})
