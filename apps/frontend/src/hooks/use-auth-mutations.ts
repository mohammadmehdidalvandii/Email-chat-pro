/**
 * Auth mutation hooks (register / verify-email / login / logout).
 *
 * Each hook wraps its API call in a TanStack Query mutation and updates the
 * auth store on the outcomes that change session state:
 *  - login success → store token + user
 *  - logout success → clear session
 * Register and verify-email do not start a session, so they only surface
 * success/error to the form.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  LoginInput,
  RegisterInput,
  VerifyEmailInput,
} from '@email-chat-pro/types'
import { loginApi, logoutApi, registerApi, verifyEmailApi } from '../lib/api/auth.api'
import { useAuthStore } from '../stores/auth.store'
import { usePresenceStore } from '../stores/presence.store'
import type { ApiRequestError } from '../lib/api/client'

/** POST /auth/register. */
export function useRegisterMutation() {
  return useMutation({
    mutationFn: (input: RegisterInput) => registerApi(input),
  })
}

/** POST /auth/verify-email. */
export function useVerifyEmailMutation() {
  return useMutation({
    mutationFn: (input: VerifyEmailInput) => verifyEmailApi(input),
  })
}

/** POST /auth/login — stores the returned JWT + user on success. */
export function useLoginMutation() {
  const setSession = useAuthStore((s) => s.setSession)
  return useMutation({
    mutationFn: (input: LoginInput) => loginApi(input),
    onSuccess: (data) => {
      setSession(data.token, data.user)
    },
  })
}

/**
 * POST /auth/logout — clears local session state and empties the query cache so
 * nothing from the previous account survives into the next login on this tab.
 */
export function useLogoutMutation() {
  const clearSession = useAuthStore((s) => s.clearSession)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => logoutApi(),
    onSettled: () => {
      clearSession()
      // Clearing the session first disables the session query (`enabled:
      // Boolean(token)`), so the cache wipe below cannot trigger a refetch of
      // the user we are logging out. Invalidating only SESSION_QUERY_KEY would
      // be a no-op and would leave conversations, contacts and search results
      // cached for up to their `staleTime` — visible to whoever logs in next.
      queryClient.clear()
      // Presence is keyed by user id and is socket-fed, so it belongs to the
      // session that just ended.
      usePresenceStore.getState().resetPresence()
    },
  })
}

/** Typed error surfaced to forms from every auth mutation. */
export type AuthMutationError = ApiRequestError
