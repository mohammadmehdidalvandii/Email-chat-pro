/**
 * Profile validation schemas (rules.md §Validation — Zod).
 *
 * All fields are optional so a partial update is allowed; individual fields
 * are validated only when provided. Rules mirror the shared constants in
 * `@email-chat-pro/constants` (validation.constants.ts) — the same source
 * the backend DTOs reference — so client-side feedback and server-side
 * validation stay aligned. Backend validation remains authoritative.
 */
import {
  BIO_MAX_LENGTH,
  ERROR_MESSAGES,
  FULL_NAME_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_REGEX,
} from '@email-chat-pro/constants'
import { z } from 'zod'

/** Username field — validated when provided. */
const usernameField = z
  .string()
  .min(1, ERROR_MESSAGES.USERNAME_REQUIRED)
  .min(USERNAME_MIN_LENGTH, ERROR_MESSAGES.USERNAME_TOO_SHORT)
  .max(USERNAME_MAX_LENGTH, ERROR_MESSAGES.USERNAME_TOO_LONG)
  .regex(USERNAME_REGEX, ERROR_MESSAGES.USERNAME_INVALID)
  .optional()
  .transform((val) => (val === undefined || val === '' ? undefined : val))

/** Full name field — validated when provided. */
const fullNameField = z
  .string()
  .max(FULL_NAME_MAX_LENGTH, ERROR_MESSAGES.FULL_NAME_TOO_LONG)
  .optional()
  .transform((val) => (val === '' ? undefined : val))

/** Bio field — validated when provided. */
const bioField = z
  .string()
  .max(BIO_MAX_LENGTH, ERROR_MESSAGES.BIO_TOO_LONG)
  .optional()
  .transform((val) => (val === '' ? undefined : val))

/** Profile update form schema (PATCH /users/me). All fields optional. */
export const profileSchema = z.object({
  username: usernameField,
  fullName: fullNameField,
  bio: bioField,
})

export type ProfileFormValues = z.infer<typeof profileSchema>

// Phase 3 — contact request validation (shared constants, no new rules needed)
export const contactSchema = z.object({
  receiverId: z.string().uuid(),
})
export const respondSchema = z.object({
  status: z.enum(['accepted', 'declined']),
})
