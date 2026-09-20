/**
 * Profile mutation hooks (TanStack Query mutations for server state changes).
 *
 * - useUpdateProfileMutation: PATCH /users/me — on success invalidates
 *   the profile query so the cache stays fresh.
 * - useDeleteAccountMutation: DELETE /users/me — on success clears the
 *   auth session, invalidates the profile query, and lets the
 *   calling page redirect via the session flow.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  DeleteAccountInput,
  DeleteAccountResponse,
  ProfileResponse,
  UpdateProfileInput,
} from '@email-chat-pro/types'
import { deleteAccountApi, updateProfileApi } from '../lib/api/users.api'
import { PROFILE_QUERY_KEY } from './use-profile-query'
import { useAuthStore } from '../stores/auth.store'
import type { ApiRequestError } from '../lib/api/client'

export type UpdateProfileError = ApiRequestError
export type DeleteAccountError = ApiRequestError

/** PATCH /users/me — update profile fields. */
export function useUpdateProfileMutation() {
  const queryClient = useQueryClient()
  return useMutation<ProfileResponse, ApiRequestError, UpdateProfileInput>({
    mutationFn: updateProfileApi,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY })
    },
  })
}

/** DELETE /users/me — delete account (requires password confirmation). */
export function useDeleteAccountMutation() {
  const queryClient = useQueryClient()
  const clearSession = useAuthStore((s) => s.clearSession)
  return useMutation<DeleteAccountResponse, ApiRequestError, DeleteAccountInput>({
    mutationFn: deleteAccountApi,
    onSuccess: () => {
      // Invalidate profile cache, then clear auth state so the session
      // flow redirects the user to /login.
      void queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY })
      clearSession()
    },
  })
}
