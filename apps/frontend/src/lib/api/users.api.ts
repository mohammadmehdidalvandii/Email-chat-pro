/**
 * Users API calls (architecture.md §API Endpoints — User Endpoints).
 *
 * Each function maps to one backend user endpoint and returns the `data`
 * payload from the shared `ApiResponse<T>` envelope. Failures throw an
 * `ApiRequestError` via {@link apiRequest}.
 */
import type {
  DeleteAccountInput,
  DeleteAccountResponse,
  ProfileResponse,
  UpdateProfileInput,
} from '@email-chat-pro/types'
import { apiRequest } from './client'

/** GET /users/me — fetch the authenticated user's profile. */
export function fetchProfile(): Promise<ProfileResponse> {
  return apiRequest<ProfileResponse>({ method: 'GET', url: '/users/me' })
}

/** PATCH /users/me — update profile fields. */
export function updateProfileApi(
  input: UpdateProfileInput,
): Promise<ProfileResponse> {
  return apiRequest<ProfileResponse>({ method: 'PATCH', url: '/users/me', data: input })
}

/** DELETE /users/me — delete the account (requires password confirmation). */
export function deleteAccountApi(
  input: DeleteAccountInput,
): Promise<DeleteAccountResponse> {
  return apiRequest<DeleteAccountResponse>({ method: 'DELETE', url: '/users/me', data: input })
}

/** POST /users/me/avatar — upload or replace avatar (multipart/form-data, file field). */
export function uploadAvatarApi(formData: FormData): Promise<ProfileResponse> {
  return apiRequest<ProfileResponse>({
    method: 'POST',
    url: '/users/me/avatar',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/** DELETE /users/me/avatar — remove avatar. */
export function removeAvatarApi(): Promise<ProfileResponse> {
  return apiRequest<ProfileResponse>({ method: 'DELETE', url: '/users/me/avatar' })
}
