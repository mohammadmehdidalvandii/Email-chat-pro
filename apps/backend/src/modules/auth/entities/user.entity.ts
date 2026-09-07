import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

/**
 * Users table (architecture.md §Data Model — Users).
 *
 * Task 1.1 registration creates accounts with email + password; Task 1.2 email
 * verification adds the verification columns. Profile columns (username,
 * full_name, bio, avatar_url, profile_completed, last_seen_at) are deferred to
 * the Profile Setup task (Task 1.4) per the approved project decision.
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash!: string

  @Column({ type: 'boolean', name: 'is_verified', default: false })
  isVerified!: boolean

  /** SHA-256 hash of the plaintext email verification token (plaintext never stored). */
  @Column({ type: 'varchar', length: 64, name: 'verification_token_hash', nullable: true })
  verificationTokenHash!: string | null

  /** When the verification token stops being accepted. */
  @Column({ type: 'timestamp', name: 'verification_token_expires_at', nullable: true })
  verificationTokenExpiresAt!: Date | null

  /** When the email address was successfully verified. */
  @Column({ type: 'timestamp', name: 'verified_at', nullable: true })
  verifiedAt!: Date | null

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean

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

  @DeleteDateColumn({ type: 'timestamp', name: 'deleted_at', nullable: true })
  deletedAt!: Date | null
}
