/**
 * Zod validation schemas for the auth forms (rules.md §Validation — Zod).
 *
 * The rules and messages mirror the shared constants in
 * `@email-chat-pro/constants` (validation.constants.ts / error.constants.ts)
 * — the same source the backend DTOs reference — so client-side feedback and
 * server-side validation stay aligned. Backend validation remains
 * authoritative; these schemas are for immediate client-side feedback only.
 */
import {
  EMAIL_MAX_LENGTH,
  EMAIL_MIN_LENGTH,
  EMAIL_REGEX,
  ERROR_MESSAGES,
  PASSWORD_REGEX,
  VERIFICATION_TOKEN_LENGTH,
} from '@email-chat-pro/constants'
import { z } from 'zod'

/** Email field shared by the register and login forms. */
const emailField = z
  .string()
  .min(1, ERROR_MESSAGES.EMAIL_REQUIRED)
  .min(EMAIL_MIN_LENGTH, ERROR_MESSAGES.EMAIL_INVALID)
  .max(EMAIL_MAX_LENGTH, ERROR_MESSAGES.EMAIL_INVALID)
  .regex(EMAIL_REGEX, ERROR_MESSAGES.EMAIL_INVALID)

/** Password field shared by the register and login forms. */
const passwordField = z
  .string()
  .min(1, ERROR_MESSAGES.PASSWORD_REQUIRED)
  .regex(PASSWORD_REGEX, ERROR_MESSAGES.PASSWORD_WEAK)

/** Registration form schema (POST /auth/register). */
export const registerSchema = z.object({
  email: emailField,
  password: passwordField,
  /** Confirmation must match the password exactly. */
  confirmPassword: z.string().min(1, 'Please confirm your password'),
})
.refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

/** Login form schema (POST /auth/login). */
export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, ERROR_MESSAGES.PASSWORD_REQUIRED),
})

/** Email verification form schema (POST /auth/verify-email). */
export const verifyEmailSchema = z.object({
  token: z
    .string()
    .min(1, ERROR_MESSAGES.VERIFICATION_TOKEN_REQUIRED)
    .length(VERIFICATION_TOKEN_LENGTH, ERROR_MESSAGES.VERIFICATION_TOKEN_INVALID)
    .regex(/^[a-f0-9]+$/i, ERROR_MESSAGES.VERIFICATION_TOKEN_INVALID),
})

export type RegisterFormValues = z.infer<typeof registerSchema>
export type LoginFormValues = z.infer<typeof loginSchema>
export type VerifyEmailFormValues = z.infer<typeof verifyEmailSchema>
