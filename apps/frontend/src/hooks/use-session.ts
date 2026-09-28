/**
 * Session query hook (rules.md §State Management — TanStack Query for server
 * state).
 *
 * On app load this validates the persisted JWT against GET /auth/session and
 * hydrates the auth store with the returned user. When there is no token, or
 * the token is rejected (401), the query is disabled / errors out and the user
 * remains null — the route guard then redirects to /login.
 */
import { useQuery } from '@tanstack/react-query'
import { fetchSession } from '../lib/api/session.api'
import { toApiRequestError } from '../lib/api/client'
import { useAuthStore } from '../stores/auth.store'

export const SESSION_QUERY_KEY = ['auth', 'session'] as const

/** The only status that invalidates the stored token. */
const UNAUTHORIZED_STATUS = 401

export function useSession() {
  const token = useAuthStore((s) => s.token)
  const setUser = useAuthStore((s) => s.setUser)
  const markSessionResolved = useAuthStore((s) => s.markSessionResolved)
  const clearSession = useAuthStore((s) => s.clearSession)

  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    // Both outcomes mark the check as finished so the route guard never hangs
    // on a rejected token. TanStack Query v5 removed `onSuccess`/`onError` from
    // `useQuery`, so this happens around the fetch rather than in callbacks.
    // Only a 401 clears the session — a transient network error must not log
    // the user out.
    queryFn: async () => {
      try {
        const { user } = await fetchSession()
        setUser(user)
        markSessionResolved()
        return user
      } catch (error) {
        markSessionResolved()
        if (toApiRequestError(error).status === UNAUTHORIZED_STATUS) {
          clearSession()
        }
        throw error
      }
    },
    // Only check the session when a token exists; an absent token means the
    // user is simply not logged in (not a server error to retry).
    enabled: Boolean(token),
    // A session is not refetched on window focus — it changes only on
    // login/logout, which are explicit mutations that update the store.
    refetchOnWindowFocus: false,
    retry: false,
  })
}
