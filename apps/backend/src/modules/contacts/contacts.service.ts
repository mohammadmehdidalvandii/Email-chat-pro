import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ERROR_CODES, ERROR_MESSAGES } from '@email-chat-pro/constants'
import type {
  ContactRequest as ContactRequestContract,
  User as SharedUser,
} from '@email-chat-pro/types'
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm'
import { AuthService } from '../auth/auth.service'
import { User } from '../auth/entities/user.entity'
import { normalizeParticipants } from '../chats/chat-participants'
import { Chat } from '../chats/entities/chat.entity'
import { ContactRequest } from './entities/contact-request.entity'

/**
 * PostgreSQL error code for a unique constraint violation.
 * `contact_requests.sender_id + receiver_id` has a UNIQUE constraint — the
 * authoritative duplicate guard when two requests pass the pre-check
 * concurrently (the same guard used for users and chats).
 */
const PG_UNIQUE_VIOLATION = '23505'

/**
 * Contact-request lifecycle service (Task 3.2 — Contact Requests).
 *
 * Responsibilities:
 *   - sendRequest: create a new pending request, reject self-requests (400),
 *     unknown/inactive receivers (404), and true duplicates (409). A request
 *     that was previously DECLINED is reactivated to `pending` on re-send —
 *     the only self-consistent reading of architecture.md "Declined requests
 *     prevent future messages until new request sent" (the re-send IS the new
 *     request).
 *   - getIncomingRequests: the authenticated user's pending incoming requests.
 *   - respondToRequest: accept (atomically creates the normalized one-to-one
 *     chat) or decline. Accept and decline both run inside a single
 *     DataSource.transaction per CLAUDE.md §19 — the request status update and
 *     the chat creation must succeed or fail together.
 *
 *   - getContacts: the authenticated user's accepted contacts (Task 3.3).
 *   - areContacts: whether a pair shares an accepted contact relationship in
 *     either direction (Task 3.3 — consumed by MessagesService to gate message
 *     sending; the acceptance is mutual, so this works for both participants).
 */
@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(ContactRequest)
    private readonly contactRequestsRepository: Repository<ContactRequest>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly authService: AuthService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Creates a new pending contact request from the authenticated user to
   * `receiverId` (POST /contacts/requests).
   *
   * Validation (architecture.md §Contact Request Validation):
   *   - sender cannot request itself            → 400
   *   - receiver must exist, be active (deleted
   *     users are excluded)                     → 404
   *   - an existing pending or accepted request
   *     for the directed pair                   → 409 (duplicate)
   *   - an existing DECLINED request            → reactivated to `pending`
   *     (the re-send is the new request)
   *   - 23505 unique-violation race on insert   → 409 (duplicate)
   */
  async sendRequest(sender: User, receiverId: string): Promise<ContactRequestContract> {
    if (receiverId === sender.id) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: ERROR_MESSAGES.CONTACT_REQUEST_SELF_NOT_ALLOWED,
      })
    }

    const receiver = await this.usersRepository.findOne({
      where: { id: receiverId, isActive: true, deletedAt: IsNull() },
    })
    if (!receiver) {
      throw new NotFoundException({
        code: ERROR_CODES.NOT_FOUND,
        message: ERROR_MESSAGES.CONTACT_REQUEST_RECEIVER_NOT_FOUND,
      })
    }

    const existing = await this.contactRequestsRepository.findOne({
      where: { sender: { id: sender.id }, receiver: { id: receiverId } },
      relations: ['sender', 'receiver'],
    })
    if (existing) {
      if (existing.status !== 'declined') {
        throw new ConflictException({
          code: ERROR_CODES.CONFLICT,
          message: ERROR_MESSAGES.CONTACT_REQUEST_DUPLICATE,
        })
      }
      existing.status = 'pending'
      const saved = await this.contactRequestsRepository.save(existing)
      return this.toContactRequestDto(saved)
    }

    const request = this.contactRequestsRepository.create({
      sender,
      receiver,
      status: 'pending',
    })
    try {
      const saved = await this.contactRequestsRepository.save(request)
      return this.toContactRequestDto(saved)
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException({
          code: ERROR_CODES.CONFLICT,
          message: ERROR_MESSAGES.CONTACT_REQUEST_DUPLICATE,
        })
      }
      throw error
    }
  }

  /**
   * Returns the authenticated user's pending incoming requests
   * (GET /contacts/requests/incoming), newest first (features.md — "view
   * pending"). Only requests where the caller is the receiver are returned;
   * the sender is resolved to a full User contract for identification.
   */
  async getIncomingRequests(userId: string): Promise<ContactRequestContract[]> {
    const requests = await this.contactRequestsRepository.find({
      where: { receiver: { id: userId }, status: 'pending' },
      relations: ['sender', 'receiver'],
      order: { createdAt: 'DESC' },
    })
    return requests.map((request) => this.toContactRequestDto(request))
  }

  /**
   * Responds to a pending incoming request (PATCH /contacts/requests/:requestId).
   *
   * Authorization / state checks:
   *   - request does not exist    → 404
   *   - caller is not the receiver → 403 (a sender may not respond to its own
   *     request)
   *   - request already responded → 409 (status is no longer `pending`)
   *
   * Accepting and declining both run inside a single transaction (CLAUDE.md
   * §19 — multiple related DB operations must succeed or fail together):
   *   - the request status is updated to `accepted` / `declined`, and
   *   - on `accepted`, a one-to-one chat is created for the (normalized)
   *     participant pair, deduplicated against any existing chat. Isolated
   *     insert races are absorbed by catching the unique violation and using
   *     the already-existing chat.
   */
  async respondToRequest(
    userId: string,
    requestId: string,
    status: 'accepted' | 'declined',
  ): Promise<ContactRequestContract> {
    const request = await this.contactRequestsRepository.findOne({
      where: { id: requestId },
      relations: ['sender', 'receiver'],
    })
    if (!request) {
      throw new NotFoundException({
        code: ERROR_CODES.NOT_FOUND,
        message: ERROR_MESSAGES.CONTACT_REQUEST_NOT_FOUND,
      })
    }
    if (request.receiver.id !== userId) {
      throw new ForbiddenException({
        code: ERROR_CODES.FORBIDDEN,
        message: ERROR_MESSAGES.CONTACT_REQUEST_NOT_RECEIVER,
      })
    }
    if (request.status !== 'pending') {
      throw new ConflictException({
        code: ERROR_CODES.CONFLICT,
        message: ERROR_MESSAGES.CONTACT_REQUEST_ALREADY_RESPONDED,
      })
    }

    const now = new Date()
    await this.dataSource.transaction(async (manager) => {
      await manager.update(ContactRequest, requestId, { status, updatedAt: now })
      if (status === 'accepted') {
        await this.createChatForPair(manager, request.sender.id, request.receiver.id)
      }
    })

    request.status = status
    request.updatedAt = now
    return this.toContactRequestDto(request)
  }

  /**
   * Returns the authenticated user's accepted contacts (GET /contacts;
   * features.md — "Contact List"; architecture.md — Contact Endpoints).
   *
   * An acceptance establishes a **mutual** relationship: `contact_requests`
   * is one-directional (sender → receiver), but both the user who accepted and
   * the user they accepted see each other as a contact. The query therefore
   * loads accepted requests in either direction (where the user is the
   * receiver OR the sender) and returns the *other* participant of each row,
   * deduplicated when a pair has accepted requests in both directions.
   * Contacts are sorted by username for a stable, deterministic list.
   */
  async getContacts(userId: string): Promise<SharedUser[]> {
    const requests = await this.contactRequestsRepository.find({
      where: [
        { receiver: { id: userId }, status: 'accepted' },
        { sender: { id: userId }, status: 'accepted' },
      ],
      relations: ['sender', 'receiver'],
    })

    const seen = new Set<string>()
    const contacts: SharedUser[] = []
    for (const request of requests) {
      const other = request.sender.id === userId ? request.receiver : request.sender
      if (seen.has(other.id)) {
        continue
      }
      seen.add(other.id)
      contacts.push(this.authService.toUserDto(other))
    }
    return contacts.sort((a, b) => (a.username ?? '').localeCompare(b.username ?? ''))
  }

  /**
   * Verifies whether two users share an ACCEPTED contact relationship in
   * either direction (features.md — "Messaging Access Control"; Task 3.3.
   * Used by MessagesService to gate message sending).
   *
   * `contact_requests` is one-directional (sender → receiver), but acceptance
   * is mutual — the chat created on accept is usable by both participants —
   * so the check passes when an accepted request exists in either direction.
   */
  async areContacts(userAId: string, userBId: string): Promise<boolean> {
    if (userAId === userBId) {
      return false
    }
    const existing = await this.contactRequestsRepository.findOne({
      where: [
        { sender: { id: userAId }, receiver: { id: userBId }, status: 'accepted' },
        { sender: { id: userBId }, receiver: { id: userAId }, status: 'accepted' },
      ],
    })
    return existing !== null
  }

  /**
   * Creates the one-to-one chat for a normalized participant pair inside the
   * running transaction, unless one already exists. A `23505` race (two
   * accepts of the same request) is absorbed — the chat already exists — and
   * the transaction continues so the status update still commits.
   */
  private async createChatForPair(
    manager: EntityManager,
    userAId: string,
    userBId: string,
  ): Promise<void> {
    const [ua, ub] = normalizeParticipants(userAId, userBId)
    const existing = await manager.findOne(Chat, { where: { userAId: ua, userBId: ub } })
    if (existing) {
      return
    }
    try {
      await manager.save(manager.create(Chat, { userAId: ua, userBId: ub }))
    } catch (error) {
      if (!this.isUniqueViolation(error)) {
        throw error
      }
    }
  }

  /** Maps a persisted ContactRequest entity (with relations) to the shared contract. */
  private toContactRequestDto(request: ContactRequest): ContactRequestContract {
    return {
      id: request.id,
      senderId: request.sender.id,
      sender: this.authService.toUserDto(request.sender),
      receiverId: request.receiver.id,
      receiver: this.authService.toUserDto(request.receiver),
      status: request.status as ContactRequestContract['status'],
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === PG_UNIQUE_VIOLATION
    )
  }
}
