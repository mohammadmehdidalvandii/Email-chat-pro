'use client'

/**
 * Contacts page (features.md §Phase 3 — Contacts).
 *
 * Two backend-backed sections: incoming contact requests the user can accept or
 * decline, and the accepted contacts, each linking to its conversation when one
 * exists. Both queries expose their own loading, error, and empty state so the
 * user always knows whether the data is missing or merely empty.
 */
import { useTranslation } from 'react-i18next'
import { RequireAuth } from '../../components/auth/RequireAuth'
import { AppShell } from '../../components/Layout/AppShell'
import { ContactRequestItem } from '../../components/contacts/ContactRequestItem'
import { ContactItem } from '../../components/contacts/ContactItem'
import { useContacts, useIncomingRequests } from '../../hooks/use-contact-query'
import { useRespondToRequestMutation } from '../../hooks/use-contact-mutations'
import { toApiRequestError } from '../../lib/api/client'
import { translateApiError } from '../../i18n/errors'

function ContactsContent() {
  const { t } = useTranslation(['contacts', 'common'], { useSuspense: false })
  const contactsQuery = useContacts()
  const requestsQuery = useIncomingRequests()
  const respond = useRespondToRequestMutation()

  const actionError = respond.error
    ? translateApiError(toApiRequestError(respond.error).code, t('contacts:actionFailed'))
    : null

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">{t('contacts:title')}</h1>

      {actionError && (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {actionError}
        </p>
      )}

      <section className="mb-8">
        <h2 className="mb-3 font-semibold">{t('contacts:incomingRequests')}</h2>
        {requestsQuery.isLoading ? (
          <p className="text-sm text-neutral-500">{t('common:loading')}</p>
        ) : requestsQuery.isError ? (
          <QueryError
            message={translateApiError(
              toApiRequestError(requestsQuery.error).code,
              t('contacts:loadError'),
            )}
            onRetry={() => void requestsQuery.refetch()}
            retryLabel={t('common:retry')}
          />
        ) : !requestsQuery.data?.length ? (
          <p className="text-sm text-neutral-500">{t('contacts:noIncoming')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {requestsQuery.data.map((request) => (
              <li key={request.id}>
                <ContactRequestItem
                  request={request}
                  onAccept={() =>
                    respond.mutate({ requestId: request.id, input: { status: 'accepted' } })
                  }
                  onDecline={() =>
                    respond.mutate({ requestId: request.id, input: { status: 'declined' } })
                  }
                  isProcessing={respond.isPending}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold">{t('contacts:acceptedContacts')}</h2>
        {contactsQuery.isLoading ? (
          <p className="text-sm text-neutral-500">{t('common:loading')}</p>
        ) : contactsQuery.isError ? (
          <QueryError
            message={translateApiError(
              toApiRequestError(contactsQuery.error).code,
              t('contacts:loadError'),
            )}
            onRetry={() => void contactsQuery.refetch()}
            retryLabel={t('common:retry')}
          />
        ) : !contactsQuery.data?.length ? (
          <p className="text-sm text-neutral-500">{t('contacts:noContacts')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {contactsQuery.data.map((user) => (
              <li key={user.id}>
                <ContactItem user={user} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

/** Inline error with a retry affordance, used by both sections. */
function QueryError({
  message,
  onRetry,
  retryLabel,
}: {
  message: string
  onRetry: () => void
  retryLabel: string
}) {
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-sm text-red-600" role="alert">
        {message}
      </p>
      <button type="button" onClick={onRetry} className="text-sm text-neutral-700 underline underline-offset-4">
        {retryLabel}
      </button>
    </div>
  )
}

export default function ContactsPage() {
  return (
    <RequireAuth>
      <AppShell>
        <ContactsContent />
      </AppShell>
    </RequireAuth>
  )
}
