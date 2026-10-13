import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Message } from '../../messages/entities/message.entity'
import { User } from '../../auth/entities/user.entity'

/**
 * Attachment (Task 4.1 — PostgreSQL BYTEA image storage, replacing Cloudinary).
 * One attachment belongs to one message (via FK); a message may have at most
 * one attachment in the current UI, but the schema allows N:1 without redesign.
 */
@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid', name: 'message_id', nullable: true })
  messageId!: string | null

  @ManyToOne(() => Message, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message?: Message | null

  @Column({ type: 'uuid', name: 'sender_id', nullable: false })
  senderId!: string

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'sender_id' })
  sender!: User

  @Column({ type: 'varchar', length: 100, name: 'mime_type', nullable: false })
  mimeType!: string

  @Column({ type: 'integer', name: 'file_size_bytes', nullable: false })
  fileSizeBytes!: number

  @Column({ type: 'bytea', name: 'data', nullable: false })
  data!: Buffer

  @Column({ type: 'varchar', length: 255, name: 'original_name', nullable: true })
  originalName?: string | null

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'created_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date

  @UpdateDateColumn({
    type: 'timestamptz',
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date
}
