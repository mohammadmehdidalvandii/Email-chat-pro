'use client'
import { Suspense } from 'react'
import type { User } from '@email-chat-pro/types'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { RequireAuth } from '../../components/auth/RequireAuth'
import { UserSearchBar } from '../../components/contacts/UserSearchBar'
import { UserSearchResult } from '../../components/contacts/UserSearchResult'
import { useSearchUsers } from '../../hooks/use-search-query'
import { useSendContactRequestMutation } from '../../hooks/use-contact-mutations'

function SearchContent() {
  const { t } = useTranslation('contacts', { useSuspense: false })
  const params = useSearchParams()
  const q = params.get('q') || ''
  const { data, isLoading, isError } = useSearchUsers(q)
  const send = useSendContactRequestMutation()

  return (
    <main className="flex min-h-screen flex-col bg-neutral-100 px-6 py-12">
      <div className="mx-auto w-full max-w-md">
        <h1 className="mb-4 text-2xl font-bold">Find users</h1>
        <UserSearchBar />
        <div className="mt-6 flex flex-col gap-3">
          {isLoading && <p>Searching...</p>}
          {isError && <p className="text-red-600">Search failed</p>}
          {data && data.length === 0 && <p>{t('noResults')}</p>}
          {data?.map((user: User) => (
            <UserSearchResult
              key={user.id}
              user={user}
              onSendRequest={() => send.mutate({ receiverId: user.id })}
              isSending={send.isPending}
            />
          ))}
        </div>
      </div>
    </main>
  )
}

export default function SearchPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<div>Loading...</div>}>
        <SearchContent />
      </Suspense>
    </RequireAuth>
  )
}
