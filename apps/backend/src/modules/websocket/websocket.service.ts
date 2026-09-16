import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { WS_SERVER_EVENTS } from '@email-chat-pro/types'
import type { PresenceChangedEvent } from '@email-chat-pro/types'
import type { Server } from 'socket.io'
import { Repository } from 'typeorm'
import { User } from '../auth/entities/user.entity'
import { ContactsService } from '../contacts/contacts.service'

/**
 * Presence tracking for the `/chats` namespace (Task 4.4 — Presence).
 *
 * Online state is derived from the real-time connection state (features.md —
 * "Online state is derived from the real-time connection state. Offline state
 * is detected when the user disconnects."). A user is online while at least one
 * authenticated socket is connected; a user may hold several sockets (multiple
 * devices), so state is tracked per `userId → Set<socketId>`.
 *
 * On the first connection (offline → online) and on the last disconnection
 * (online → offline) the service:
 *   - persists `users.last_seen_at` (the column already exists since Task 1.4),
 *   - broadcasts a `presence:changed` event to the user's accepted contacts so
 *     their UI can react (architecture.md §presence:changed).
 *
 * The socket.io `Server` reference is attached by the gateway in `afterInit`
 * because only the gateway wires the namespace decorator.
 */
@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name)

  /** userId → socket ids currently connected for that user. */
  private readonly onlineSockets = new Map<string, Set<string>>()

  private server: Server | null = null

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly contactsService: ContactsService,
  ) {}

  /** Attaches the socket.io server instance (called by the gateway in afterInit). */
  attachServer(server: Server): void {
    this.server = server
  }

  /** Whether the user currently has at least one connected socket. */
  isOnline(userId: string): boolean {
    const sockets = this.onlineSockets.get(userId)
    return sockets !== undefined && sockets.size > 0
  }

  /**
   * Registers a connected socket for an authenticated user.
   *
   * When this is the user's first socket (offline → online), records
   * `last_seen_at` and broadcasts `presence:changed { online }` to their
   * contacts. Additional sockets (other devices) only extend the socket set.
   */
  async registerOnline(user: User, socketId: string): Promise<void> {
    let sockets = this.onlineSockets.get(user.id)
    const becameOnline = sockets === undefined || sockets.size === 0

    if (sockets === undefined) {
      sockets = new Set<string>()
      this.onlineSockets.set(user.id, sockets)
    }
    sockets.add(socketId)

    if (!becameOnline) {
      return
    }

    const lastSeenAt = new Date()
    await this.usersRepository.update(user.id, { lastSeenAt })
    this.logger.log(`User ${user.id} is now online`)
    await this.emitToContacts(user.id, {
      userId: user.id,
      status: 'online',
      lastSeenAt: lastSeenAt.toISOString(),
    })
  }

  /**
   * Unregisters a disconnected socket.
   *
   * When the user's last socket disconnects (online → offline), records the
   * disconnect instant in `last_seen_at` and broadcasts
   * `presence:changed { offline, lastSeenAt }` to their contacts.
   */
  async unregisterOnline(userId: string, socketId: string): Promise<void> {
    const sockets = this.onlineSockets.get(userId)
    if (sockets === undefined) {
      return
    }
    sockets.delete(socketId)

    if (sockets.size > 0) {
      return
    }

    this.onlineSockets.delete(userId)

    const lastSeenAt = new Date()
    await this.usersRepository.update(userId, { lastSeenAt })
    this.logger.log(`User ${userId} is now offline`)
    await this.emitToContacts(userId, {
      userId,
      status: 'offline',
      lastSeenAt: lastSeenAt.toISOString(),
    })
  }

  /**
   * Sends a presence event to every online socket of the user's accepted
   * contacts (contacts with no active socket receive nothing). The changed
   * user does not receive their own presence event.
   */
  private async emitToContacts(userId: string, event: PresenceChangedEvent): Promise<void> {
    const server = this.server
    if (server === null) {
      return
    }
    const contacts = await this.contactsService.getContacts(userId)
    for (const contact of contacts) {
      const sockets = this.onlineSockets.get(contact.id)
      if (sockets === undefined) {
        continue
      }
      for (const socketId of sockets) {
        server.to(socketId).emit(WS_SERVER_EVENTS.PRESENCE_CHANGED, event)
      }
    }
  }
}
