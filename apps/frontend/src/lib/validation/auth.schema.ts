/**
 * Zod validation schemas for the auth forms (rules.md §Validation — Zod).
 *
 * The rules and lengths mirror the shared constants in
 * `@email-chat-pro/constants` (validation.constants.ts / error.constants.ts)
 * — the same source the backend DTOs reference — so client-side feedback and
 * server-side validation stay aligned. Backend validation remains
 * authoritative; these schemas are for immediate client-side feedback only.
 *
 * Messages are `validation:` translation keys rather than literals, resolved
 * through the shared {@link validationMessage} helper (architecture.md §i18n —
 * no raw English in user-facing UI). The key travels as the Zod message and is
 * translated when the form renders it, so switching language re-labels the
 * existing errors without re-running validation.
 */
import {
  EMAIL_MAX_LENGTH,
  EMAIL_MIN_LENGTH,
  EMAIL_REGEX,
  PASSWORD_REGEX,
  VERIFICATION_TOKEN_LENGTH,
} from '@email-chat-pro/constants'
import { z } from 'zod'
import { validationMessage } from '../../i18n/validation'

/** Builds a Zod message that is a `validation` namespace key. */
const msg = (key: string) => ({ message: `validation:${key}` })

/** Email field shared by the register and login forms. */
const emailField = z
  .string()
  .min(1, msg('emailRequired').message)
  .min(EMAIL_MIN_LENGTH, msg('emailInvalid').message)
  .max(EMAIL_MAX_LENGTH, msg('emailTooLong').message)
  .regex(EMAIL_REGEX, msg('emailInvalid').message)

/** Password field shared by the register and login forms. */
const passwordField = z
  .string()
  .min(1, msg('passwordRequired').message)
  .regex(PASSWORD_REGEX, msg('passwordWeak').message)

/** Registration form schema (POST /auth/register). */
export const registerSchema = z
  .object({
    email: emailField,
    password: passwordField,
    /** Confirmation must match the password exactly. */
    confirmPassword: z.string().min(1, msg('confirmPasswordRequired').message),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: msg('passwordsDoNotMatch').message,
    path: ['confirmPassword'],
  })

/** Login form schema (POST /auth/login). */
export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, msg('passwordRequired').message),
})

/** Email verification form schema (POST /auth/verify-email). */
export const verifyEmailSchema = z.object({
  token: z
    .string()
    .min(1, msg('tokenRequired').message)
    .length(VERIFICATION_TOKEN_LENGTH, msg('tokenInvalid').message)
    .regex(/^[a-f0-9]+$/i, msg('tokenInvalid').message),
})

export type RegisterFormValues = z.infer<typeof registerSchema>
export type LoginFormValues = z.infer<typeof loginSchema>
export type VerifyEmailFormValues = z.infer<typeof verifyEmailSchema>
