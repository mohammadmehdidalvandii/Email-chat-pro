/**
 * Profile mutation hooks (TanStack Query mutations for server state changes).
 *
 * - useUpdateProfileMutation: PATCH /users/me — on success invalidates
 *   the profile query so the cache stays fresh.
 * - useDeleteAccountMutation: DELETE /users/me — on success clears the
 *   auth session and empties the query cache, then lets the
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
import { usePresenceStore } from '../stores/presence.store'
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
      // Clear auth state first so the session flow redirects to /login, then
      // empty the cache: the deleted account's conversations, contacts and
      // search results must not survive for whoever registers or logs in on
      // this tab next.
      clearSession()
      queryClient.clear()
      usePresenceStore.getState().resetPresence()
    },
  })
}
