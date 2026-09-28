/**
 * Profile validation schemas (rules.md §Validation — Zod).
 *
 * All fields are optional so a partial update is allowed; individual fields
 * are validated only when provided. Rules and lengths mirror the shared
 * constants in `@email-chat-pro/constants` (validation.constants.ts) — the same
 * source the backend DTOs reference — so client-side feedback and server-side
 * validation stay aligned. Backend validation remains authoritative.
 *
 * As in the auth schemas, messages are `validation:` keys translated at render
 * time by {@link validationMessage} rather than English literals.
 */
import {
  BIO_MAX_LENGTH,
  FULL_NAME_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_REGEX,
} from '@email-chat-pro/constants'
import { z } from 'zod'
import { validationMessage } from '../../i18n/validation'

/** Builds a Zod message that is a `validation` namespace key. */
const msg = (key: string) => ({ message: `validation:${key}` })

/** Username field — validated when provided. */
const usernameField = z
  .string()
  .min(1, msg('usernameRequired').message)
  .min(USERNAME_MIN_LENGTH, msg('usernameTooShort').message)
  .max(USERNAME_MAX_LENGTH, msg('usernameTooLong').message)
  .regex(USERNAME_REGEX, msg('usernameInvalid').message)
  .optional()
  .transform((val) => (val === undefined || val === '' ? undefined : val))

/** Full name field — validated when provided. */
const fullNameField = z
  .string()
  .max(FULL_NAME_MAX_LENGTH, msg('fullNameTooLong').message)
  .optional()
  .transform((val) => (val === '' ? undefined : val))

/** Bio field — validated when provided. */
const bioField = z
  .string()
  .max(BIO_MAX_LENGTH, msg('bioTooLong').message)
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
