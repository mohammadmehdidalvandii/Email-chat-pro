'use client'
import { RequireAuth } from '../../components/auth/RequireAuth'
import { ConversationList } from '../../components/chats/ConversationList'

export default function ChatsPage() {
  return (
    <RequireAuth>
      <main className="flex min-h-screen flex-col bg-neutral-100 px-6 py-12">
        <div className="mx-auto w-full max-w-md">
          <h1 className="mb-6 text-2xl font-bold">Conversations</h1>
          <ConversationList />
        </div>
      </main>
    </RequireAuth>
  )
}
