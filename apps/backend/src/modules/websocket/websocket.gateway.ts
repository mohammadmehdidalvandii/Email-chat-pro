import { InjectRepository } from '@nestjs/typeorm'
import { JwtService } from '@nestjs/jwt'
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway as WsGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets'
import { Logger } from '@nestjs/common'
import { Repository } from 'typeorm'
import type { Server, Socket } from 'socket.io'
import { ERROR_CODES, ERROR_MESSAGES } from '@email-chat-pro/constants'
import type { JoinChatPayload, LeaveChatPayload, MessageSentEvent } from '@email-chat-pro/types'
import { WS_CLIENT_EVENTS, WS_SERVER_EVENTS } from '@email-chat-pro/types'
import { User } from '../auth/entities/user.entity'
import { ChatsService } from '../chats/chats.service'
import type { JwtPayload } from '../auth/strategies/jwt.strategy'

/**
 * Chat-specific Socket.IO namespace (architecture.md §WebSocket Events).
 *
 * The `/chats` namespace handles real-time message delivery. Clients join
 * rooms identified by `chatId`; the server broadcasts `message:received`
 * events to all participants after a message is persisted via the REST API.
 *
 * Authentication: the client must provide a valid JWT in the handshake auth
 * object (`{ token: "..." }`). Unauthenticated connections are rejected
 * before the socket is accepted.
 *
 * Authorization: when joining a room the gateway verifies the authenticated
 * user is a participant of the specified chat (architecture.md — "Only users
 * in the conversation join the room").
 *
 * Message persistence: Task 2.3 uses REST as the source of truth. The gateway
 * broadcasts events after the REST controller persists via `broadcastToChat`.
 * Direct `message:send` from the WebSocket is NOT handled in Task 2.3.
 */
@WsGateway({
  namespace: '/chats',
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server

  private readonly logger = new Logger(ChatGateway.name)

  /** Maps socket.id → authenticated User for fast lookups. */
  private readonly connectedUsers = new Map<string, User>()

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly chatsService: ChatsService,
  ) {}

  afterInit(): void {
    this.logger.log('WebSocket gateway initialized — namespace /chats')
  }

  /**
   * Handles new socket connections.
   *
   * Extracts the JWT from `socket.handshake.auth.token` and validates it.
   * Invalid or missing tokens cause immediate disconnection — the client
   * receives a `connect_error` event with the standard error envelope.
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = client.handshake.auth?.token as string | undefined
      if (!token) {
        this.logger.warn(`Connection rejected — no token provided [${client.id}]`)
        client.emit(WS_SERVER_EVENTS.ERROR, {
          code: ERROR_CODES.UNAUTHORIZED,
          message: ERROR_MESSAGES.WS_UNAUTHORIZED,
        })
        client.disconnect(true)
        return
      }

      const payload = this.jwtService.verify<JwtPayload>(token)
      const user = await this.usersRepository.findOne({ where: { id: payload.sub } })

      if (!user || !user.isActive) {
        this.logger.warn(`Connection rejected — invalid user [${client.id}]`)
        client.emit(WS_SERVER_EVENTS.ERROR, {
          code: ERROR_CODES.UNAUTHORIZED,
          message: ERROR_MESSAGES.WS_UNAUTHORIZED,
        })
        client.disconnect(true)
        return
      }

      this.connectedUsers.set(client.id, user)
      this.logger.log(`Client connected — ${user.id} [${client.id}]`)
    } catch {
      this.logger.warn(`Connection rejected — invalid token [${client.id}]`)
      client.emit(WS_SERVER_EVENTS.ERROR, {
        code: ERROR_CODES.UNAUTHORIZED,
        message: ERROR_MESSAGES.WS_UNAUTHORIZED,
      })
      client.disconnect(true)
    }
  }

  /**
   * Cleans up the connected-users map when a client disconnects.
   */
  handleDisconnect(client: Socket): void {
    this.connectedUsers.delete(client.id)
    this.logger.log(`Client disconnected [${client.id}]`)
  }

  /**
   * Resolves the authenticated user for a socket, or `null` when unauthenticated.
   *
   * Prefers the in-memory `connectedUsers` map (populated by `handleConnection`).
   * Because `handleConnection` performs an async DB lookup, a client may emit
   * `chat:join` before that lookup completes (connect → join race). To keep
   * join authorization correct regardless of timing, this falls back to
   * re-verifying the handshake token and looking the user up from the database
   * when the map entry is not yet populated.
   */
  private async resolveUser(client: Socket): Promise<User | null> {
    const cached = this.connectedUsers.get(client.id)
    if (cached) {
      return cached
    }

    try {
      const token = client.handshake.auth?.token as string | undefined
      if (!token) {
        return null
      }
      const payload = this.jwtService.verify<JwtPayload>(token)
      const user = await this.usersRepository.findOne({ where: { id: payload.sub } })
      if (!user || !user.isActive) {
        return null
      }
      this.connectedUsers.set(client.id, user)
      return user
    } catch {
      return null
    }
  }

  /**
   * Handles `chat:join` — the client requests to join a chat room.
   *
   * Authorization: the server verifies the user is a participant of the
   * specified chat (architecture.md — "Only users in the conversation join
   * the room"). Non-participants receive an error event and are not added.
   */
  @SubscribeMessage(WS_CLIENT_EVENTS.JOIN_CHAT)
  async handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinChatPayload,
  ): Promise<{ event: string; data: unknown }> {
    const user = await this.resolveUser(client)
    if (!user) {
      return {
        event: WS_SERVER_EVENTS.ERROR,
        data: { code: ERROR_CODES.UNAUTHORIZED, message: ERROR_MESSAGES.WS_UNAUTHORIZED },
      }
    }

    const chat = await this.chatsService.findById(payload.chatId)
    if (!chat) {
      return {
        event: WS_SERVER_EVENTS.ERROR,
        data: { code: ERROR_CODES.NOT_FOUND, message: ERROR_MESSAGES.CHAT_NOT_FOUND },
      }
    }

    if (chat.userAId !== user.id && chat.userBId !== user.id) {
      return {
        event: WS_SERVER_EVENTS.ERROR,
        data: { code: ERROR_CODES.FORBIDDEN, message: ERROR_MESSAGES.WS_CHAT_UNAUTHORIZED },
      }
    }

    const room = `chat:${payload.chatId}`
    await client.join(room)
    this.logger.log(`User ${user.id} joined room ${room} [${client.id}]`)

    return { event: WS_SERVER_EVENTS.CHAT_JOINED, data: { chatId: payload.chatId } }
  }

  /**
   * Handles `chat:leave` — the client leaves a chat room.
   */
  @SubscribeMessage(WS_CLIENT_EVENTS.LEAVE_CHAT)
  async handleLeaveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LeaveChatPayload,
  ): Promise<{ event: string; data: unknown }> {
    const room = `chat:${payload.chatId}`
    await client.leave(room)
    this.logger.log(`Client left room ${room} [${client.id}]`)

    return { event: WS_SERVER_EVENTS.CHAT_LEFT, data: { chatId: payload.chatId } }
  }

  /**
   * Broadcasts a persisted message to all participants in the chat room.
   *
   * Called by MessagesService (via REST persistence) after a message is
   * successfully saved. This is the real-time delivery mechanism for
   * Task 2.3 — REST persists, Socket.IO broadcasts.
   *
   * If no clients are in the room the broadcast is silently a no-op.
   */
  broadcastToChat(chatId: string, event: MessageSentEvent): void {
    const room = `chat:${chatId}`
    this.server.to(room).emit(WS_SERVER_EVENTS.MESSAGE_RECEIVED, event)
    this.logger.log(`Broadcast ${WS_SERVER_EVENTS.MESSAGE_RECEIVED} to room ${room}`)
  }
}
