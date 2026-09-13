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
 * Contact requests table (architecture.md §Data Model — Contact Requests).
 *
 * Task 3.2 — a one-directional request from `sender` → `receiver`. At most one
 * request exists per directed pair (UNIQUE(sender_id, receiver_id) from the
 * CreateContactRequestsTable migration).
 *
 * Only the two User relations are mapped here: the shared ContactRequest
 * contract carries full `sender`/`receiver` user objects, and TypeORM cannot
 * own both a scalar column and a relation on the same database column (see the
 * Task 2.4 note on the chats entity), so the FK columns are exposed through the
 * relations and their ids are derived from the loaded relations when building
 * response DTOs.
 */
@Entity('contact_requests')
export class ContactRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @ManyToOne(() => User, { nullable: false, eager: false })
  @JoinColumn({ name: 'sender_id' })
  sender!: User

  @ManyToOne(() => User, { nullable: false, eager: false })
  @JoinColumn({ name: 'receiver_id' })
  receiver!: User

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: string

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
