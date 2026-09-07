import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import { ERROR_CODES, ERROR_MESSAGES } from '@email-chat-pro/constants'
import type { RegisterResponse } from '@email-chat-pro/types'
import { RegisterDto } from './dto/register.dto'
import { User } from './entities/user.entity'

/** bcrypt salt rounds defined in architecture.md §Password Validation. */
const BCRYPT_SALT_ROUNDS = 10

/**
 * PostgreSQL error code for a unique constraint violation.
 * `users.email` has a UNIQUE constraint; this is the authoritative duplicate
 * guard in case two requests pass the pre-check concurrently.
 */
const PG_UNIQUE_VIOLATION = '23505'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * Creates a new account in the unverified/pending state.
   *
   * - email is normalized to lowercase so the same mailbox cannot be registered
   *   twice under different casing (enforced by the DB UNIQUE constraint on the
   *   stored value).
   * - password is hashed with bcryptjs (salt rounds 10) and never stored in
   *   plaintext.
   */
  async register(dto: RegisterDto): Promise<RegisterResponse> {
    const email = dto.email.toLowerCase()

    const existing = await this.usersRepository.findOne({ where: { email } })
    if (existing) {
      throw new ConflictException({
        code: ERROR_CODES.CONFLICT,
        message: ERROR_MESSAGES.EMAIL_ALREADY_REGISTERED,
      })
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS)
    const user = this.usersRepository.create({
      email,
      passwordHash,
      isVerified: false,
    })

    try {
      const saved = await this.usersRepository.save(user)
      return {
        id: saved.id,
        email: saved.email,
        message: 'Registration successful',
      }
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException({
          code: ERROR_CODES.CONFLICT,
          message: ERROR_MESSAGES.EMAIL_ALREADY_REGISTERED,
        })
      }
      throw new InternalServerErrorException({
        code: ERROR_CODES.INTERNAL_ERROR,
        message: ERROR_MESSAGES.INTERNAL,
      })
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
