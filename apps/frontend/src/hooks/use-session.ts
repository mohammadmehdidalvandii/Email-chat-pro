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
import { useAuthStore } from '../stores/auth.store'

export const SESSION_QUERY_KEY = ['auth', 'session'] as const

export function useSession() {
  const token = useAuthStore((s) => s.token)
  const setUser = useAuthStore((s) => s.setUser)
  const markSessionResolved = useAuthStore((s) => s.markSessionResolved)

  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      const { user } = await fetchSession()
      setUser(user)
      return user
    },
    // Only check the session when a token exists; an absent token means the
    // user is simply not logged in (not a server error to retry).
    enabled: Boolean(token),
    // A session is not refetched on window focus — it changes only on
    // login/logout, which are explicit mutations that update the store.
    refetchOnWindowFocus: false,
    retry: false,
    meta: {
      // Ensure the store knows the initial check is done even on failure so
      // the route guard can decide without hanging on a 401.
      onSettled: markSessionResolved,
    },
  })
}
