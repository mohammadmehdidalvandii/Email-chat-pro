import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

/**
 * Chats table (architecture.md §Data Model — Chats).
 *
 * Task 2.1 (Chat Foundation) — the one-to-one chat data model. Participants are
 * stored normalized so `user_a < user_b`; the UNIQUE + CHECK constraints are
 * enforced by the CreateChatsTable migration. Only the raw participant ids are
 * mapped here for the read path — the User relations (for the full Chat shape)
 * are loaded in a later task when the conversation-list endpoint needs them.
 */
@Entity('chats')
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'uuid', name: 'user_a' })
  userAId!: string

  @Column({ type: 'uuid', name: 'user_b' })
  userBId!: string

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
