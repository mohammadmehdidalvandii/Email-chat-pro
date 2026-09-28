'use client'

/**
 * /dashboard — the authenticated home page.
 *
 * Everything shown comes from endpoints the backend already exposes: the
 * conversation list (`GET /chats`), the contact list (`GET /contacts`), and the
 * incoming contact requests (`GET /contacts/requests/incoming`). There are no
 * aggregate/statistics endpoints, so the counts here are the lengths of those
 * lists — no invented numbers and no extra requests.
 */
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { AppShell } from '../../components/Layout/AppShell'
import { RequireAuth } from '../../components/auth/RequireAuth'
import { ConversationList } from '../../components/chats/ConversationList'
import { useConversations } from '../../hooks/use-chat-query'
import { useContacts, useIncomingRequests } from '../../hooks/use-contact-query'
import { useAuthStore } from '../../stores/auth.store'
import { Button } from '../../components/ui/button'
import { formatNumber } from '../../i18n/formatting'

/** How many recent conversations the dashboard previews. */
const RECENT_LIMIT = 3

function DashboardContent() {
  const { t } = useTranslation(['dashboard', 'common', 'chat'], { useSuspense: false })
  const user = useAuthStore((s) => s.user)
  const conversations = useConversations()
  const contacts = useContacts()
  const requests = useIncomingRequests()

  const displayName = user?.fullName?.trim() || user?.username?.trim()

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight">
          {displayName ? t('dashboard:greeting', { name: displayName }) : t('dashboard:greetingGeneric')}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">{t('dashboard:subtitle')}</p>

        {/* The backend reports `profileCompleted`; a missing username is what
            stops other users from finding this account. */}
        {user && !user.profileCompleted && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-4">
            <p className="text-sm text-neutral-700">{t('dashboard:profileIncomplete')}</p>
            <Link href="/settings/profile">
              <Button size="sm">{t('dashboard:completeProfile')}</Button>
            </Link>
          </div>
        )}

        <dl className="mt-6 grid grid-cols-3 gap-3">
          <Stat
            label={t('dashboard:statConversations')}
            value={conversations.data?.length}
            loading={conversations.isLoading}
          />
          <Stat label={t('dashboard:statContacts')} value={contacts.data?.length} loading={contacts.isLoading} />
          <Stat
            label={t('dashboard:statPending')}
            value={requests.data?.filter((request) => request.status === 'pending').length}
            loading={requests.isLoading}
          />
        </dl>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">{t('dashboard:recentConversations')}</h2>
            <Link
              href="/search"
              className="text-sm text-neutral-700 underline underline-offset-4"
            >
              {t('dashboard:findUsers')}
            </Link>
          </div>
          {conversations.isError ? (
            <p className="text-sm text-red-600" role="alert">
              {t('chat:chatError')}
            </p>
          ) : !conversations.data?.length && !conversations.isLoading ? (
            <p className="text-sm text-neutral-500">{t('dashboard:noRecentConversations')}</p>
          ) : (
            <ConversationList limit={RECENT_LIMIT} />
          )}
        </section>
      </div>
    </AppShell>
  )
}

/** One count tile; shows a dash until its query resolves. */
function Stat({
  label,
  value,
  loading,
}: {
  label: string
  value: number | undefined
  loading: boolean
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold">
        {loading ? '—' : formatNumber(value ?? 0)}
      </dd>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  )
}
