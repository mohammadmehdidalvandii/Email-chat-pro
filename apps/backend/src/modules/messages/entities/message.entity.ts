import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { User } from '../../auth/entities/user.entity'

/**
 * Messages table (architecture.md §Data Model — Messages).
 *
 * Task 2.2 — message persistence. Each row is owned by exactly one chat and
 * one sender. The `sender` relation is the only way to load the User object;
 * senderId is derived from sender.id when building response DTOs so TypeORM
 * never maps two scalar columns for the same foreign key.
 *
 * `chatId` remains a scalar column (no @ManyToOne Chat relation) because chats
 * are not eagerly needed in the message read path — the chat context is already
 * known from the route parameter.
 */
@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid', name: 'chat_id' })
  chatId!: string

  @ManyToOne(() => User, { nullable: false, eager: false })
  @JoinColumn({ name: 'sender_id' })
  sender!: User

  @Column({ type: 'text' })
  content!: string

  @Column({ type: 'varchar', length: 20, name: 'message_type', default: 'text' })
  messageType!: string

  @Column({ type: 'varchar', length: 500, name: 'media_url', nullable: true })
  mediaUrl!: string | null

  @CreateDateColumn({
    type: 'timestamp',
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date

  @UpdateDateColumn({
    type: 'timestamp',
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date
}
