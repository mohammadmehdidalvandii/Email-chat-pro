'use client'
import type { ContactRequest, User } from "@email-chat-pro/types"
import { useTranslation } from 'react-i18next'
import { RequireAuth } from '../../components/auth/RequireAuth'
import { ContactRequestItem } from '../../components/contacts/ContactRequestItem'
import { ContactItem } from '../../components/contacts/ContactItem'
import { useContacts, useIncomingRequests } from '../../hooks/use-contact-query'
import { useRespondToRequestMutation } from '../../hooks/use-contact-mutations'

function ContactsContent() {
  const { t } = useTranslation('contacts', { useSuspense: false })
  const { data: contacts } = useContacts()
  const { data: incoming } = useIncomingRequests()
  const respond = useRespondToRequestMutation()

  return (
    <main className="flex min-h-screen flex-col bg-neutral-100 px-6 py-12">
      <div className="mx-auto w-full max-w-md">
        <h1 className="mb-6 text-2xl font-bold">Contacts</h1>

        <h2 className="mb-3 font-semibold">{t('incomingRequests')}</h2>
        <div className="mb-6 flex flex-col gap-2">
          {incoming?.length === 0 && <p className="text-sm text-neutral-500">{t('noIncoming')}</p>}
          {incoming?.map((req: ContactRequest) => (
            <ContactRequestItem
              key={req.id}
              request={req}
              onAccept={() => respond.mutate({ requestId: req.id, input: { status: 'accepted' } })}
              onDecline={() => respond.mutate({ requestId: req.id, input: { status: 'declined' } })}
              isProcessing={respond.isPending}
            />
          ))}
        </div>

        <h2 className="mb-3 font-semibold">{t('acceptedContacts')}</h2>
        <div className="flex flex-col gap-2">
          {contacts?.length === 0 && <p className="text-sm text-neutral-500">{t('noContacts')}</p>}
          {contacts?.map((user: User) => (
            <ContactItem key={user.id} user={user} />
          ))}
        </div>
      </div>
    </main>
  )
}

export default function ContactsPage() {
  return <RequireAuth><ContactsContent /></RequireAuth>
}
