/**
 * Profile query hook (rules.md §State Management — TanStack Query for server state).
 *
 * Fetches the authenticated user's profile via GET /users/me. Disabled
 * until a session is confirmed (token present) — the auth store drives
 * authentication, and RequireAuth gates the page.
 */
import { useQuery } from '@tanstack/react-query'
import { fetchProfile } from '../lib/api/users.api'
import { useAuthStore } from '../stores/auth.store'

export const PROFILE_QUERY_KEY = ['profile'] as const

export function useProfile() {
  const token = useAuthStore((s) => s.token)

  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: fetchProfile,
    enabled: Boolean(token),
    refetchOnWindowFocus: false,
    retry: false,
  })
}
