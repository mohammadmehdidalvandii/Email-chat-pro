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
 * verification adds the verification columns; Task 1.4 adds the profile
 * columns (username, full_name, bio, avatar_url, profile_completed,
 * last_seen_at). Username uniqueness is case-insensitive (functional unique
 * index on LOWER(username) created by the Task 1.4 migration).
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

  /** Unique case-insensitive handle (validation + index enforced by the Task 1.4 migration). */
  @Column({ type: 'varchar', length: 64, name: 'username', nullable: true })
  username!: string | null

  /** User-provided display name. */
  @Column({ type: 'varchar', length: 100, name: 'full_name', nullable: true })
  fullName!: string | null

  /** Short free-text biography. */
  @Column({ type: 'text', name: 'bio', nullable: true })
  bio!: string | null

  /** URL of the user's avatar. */
  @Column({ type: 'varchar', length: 500, name: 'avatar_url', nullable: true })
  avatarUrl!: string | null

  /** Whether the user has completed their profile setup. */
  @Column({ type: 'boolean', name: 'profile_completed', default: false })
  profileCompleted!: boolean

  /** When the user was last seen online. */
  @Column({
    type: 'timestamp',
    name: 'last_seen_at',
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastSeenAt!: Date

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
