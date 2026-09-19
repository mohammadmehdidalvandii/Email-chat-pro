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
import { SESSION_QUERY_KEY } from './use-session'
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
 * POST /auth/logout — clears local session state and invalidates the cached
 * session query so the next load re-checks with the backend.
 */
export function useLogoutMutation() {
  const clearSession = useAuthStore((s) => s.clearSession)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => logoutApi(),
    onSettled: () => {
      clearSession()
      void queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
    },
  })
}

/** Typed error surfaced to forms from every auth mutation. */
export type AuthMutationError = ApiRequestError
