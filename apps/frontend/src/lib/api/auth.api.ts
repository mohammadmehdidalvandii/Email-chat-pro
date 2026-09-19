/**
 * Auth API calls (architecture.md §API Endpoints — Auth).
 *
 * Each function maps to one backend auth endpoint and returns the `data`
 * payload from the shared `ApiResponse<T>` envelope. Failures throw an
 * `ApiRequestError` via {@link apiRequest}.
 */
import type {
  LoginInput,
  LoginResponse,
  LogoutResponse,
  RegisterInput,
  RegisterResponse,
  VerifyEmailInput,
  VerifyEmailResponse,
} from '@email-chat-pro/types'
import { apiRequest } from './client'

/** POST /auth/register — create an unverified account. */
export function registerApi(input: RegisterInput): Promise<RegisterResponse> {
  return apiRequest<RegisterResponse>({ method: 'POST', url: '/auth/register', data: input })
}

/** POST /auth/verify-email — confirm a registration token. */
export function verifyEmailApi(input: VerifyEmailInput): Promise<VerifyEmailResponse> {
  return apiRequest<VerifyEmailResponse>({
    method: 'POST',
    url: '/auth/verify-email',
    data: input,
  })
}

/** POST /auth/login — authenticate a verified user and receive a JWT. */
export function loginApi(input: LoginInput): Promise<LoginResponse> {
  return apiRequest<LoginResponse>({ method: 'POST', url: '/auth/login', data: input })
}

/** POST /auth/logout — end the session (backend clears its httpOnly cookie). */
export function logoutApi(): Promise<LogoutResponse> {
  return apiRequest<LogoutResponse>({ method: 'POST', url: '/auth/logout' })
}
