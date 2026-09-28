'use client'

/**
 * User search page (features.md §Phase 3 — User Search).
 *
 * The backend's search does not exclude the authenticated user, so the
 * signed-in user is filtered out of the results here rather than sending a
 * request to oneself. The endpoint is throttled (50/hour), so the input is
 * debounced by `UserSearchBar` and a 429 is reported with the backend's own
 * `RATE_LIMIT_EXCEEDED` code rather than a generic failure.
 */
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { RequireAuth } from '../../components/auth/RequireAuth'
import { AppShell } from '../../components/Layout/AppShell'
import { UserSearchBar } from '../../components/contacts/UserSearchBar'
import { UserSearchResult } from '../../components/contacts/UserSearchResult'
import { useSearchUsers } from '../../hooks/use-search-query'
import { useSendContactRequestMutation } from '../../hooks/use-contact-mutations'
import { useAuthStore } from '../../stores/auth.store'
import { toApiRequestError } from '../../lib/api/client'
import { translateApiError } from '../../i18n/errors'

/** HTTP 429 — the search endpoint's throttle limit was reached. */
const RATE_LIMIT_STATUS = 429

function SearchContent() {
  const { t } = useTranslation(['contacts', 'common'], { useSuspense: false })
  const params = useSearchParams()
  const q = params.get('q') ?? ''
  const currentUserId = useAuthStore((s) => s.user?.id)
  const { data, isLoading, isError, error, refetch } = useSearchUsers(q)
  const send = useSendContactRequestMutation()
  // Users this tab has already sent a request to in this session.
  const [requestedIds, setRequestedIds] = useState<string[]>([])

  const results = (data ?? []).filter((user) => user.id !== currentUserId)
  const sendError = send.error
  const sendErrorMessage = sendError
    ? translateApiError(toApiRequestError(sendError).code, t('contacts:actionFailed'))
    : null
  const rateLimited =
    isError && toApiRequestError(error).status === RATE_LIMIT_STATUS

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">{t('contacts:title')}</h1>
      <UserSearchBar />

      <div className="mt-6 flex flex-col gap-3">
        {q.trim().length === 0 && (
          <p className="text-sm text-neutral-500">{t('contacts:searchPrompt')}</p>
        )}

        {q.trim().length > 0 && isLoading && (
          <p className="text-sm text-neutral-500">{t('contacts:searching')}</p>
        )}

        {sendErrorMessage && (
          <p className="text-sm text-red-600" role="alert">
            {sendErrorMessage}
          </p>
        )}

        {isError && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-red-600" role="alert">
              {rateLimited
                ? translateApiError(toApiRequestError(error).code)
                : translateApiError(toApiRequestError(error).code, t('contacts:searchFailed'))}
            </p>
            {!rateLimited && (
              <button
                type="button"
                onClick={() => void refetch()}
                className="text-sm text-neutral-700 underline underline-offset-4"
              >
                {t('common:retry')}
              </button>
            )}
          </div>
        )}

        {!isError && !isLoading && q.trim().length > 0 && results.length === 0 && (
          <p className="text-sm text-neutral-500">{t('contacts:noResults')}</p>
        )}

        <ul className="flex flex-col gap-2">
          {results.map((user) => (
            <li key={user.id}>
              <UserSearchResult
                user={user}
                isSending={send.isPending}
                isRequested={requestedIds.includes(user.id)}
                onSendRequest={() =>
                  send.mutate(
                    { receiverId: user.id },
                    { onSuccess: () => setRequestedIds((ids) => [...ids, user.id]) },
                  )
                }
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function SearchPage() {
  const { t } = useTranslation('common', { useSuspense: false })
  return (
    <RequireAuth>
      <AppShell>
        <Suspense fallback={<p className="text-sm text-neutral-500">{t('loading')}</p>}>
          <SearchContent />
        </Suspense>
      </AppShell>
    </RequireAuth>
  )
}
