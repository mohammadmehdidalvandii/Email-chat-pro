import type { User } from '@email-chat-pro/types'

interface ContactItemProps { user: User }

export function ContactItem({ user }: ContactItemProps) {
  return (
    <div className="rounded border border-neutral-200 bg-white p-4">
      <p className="font-medium">{user.username}</p>
      <p className="text-sm text-neutral-500">{user.email}</p>
      {user.fullName && <p className="text-sm text-neutral-500">{user.fullName}</p>}
    </div>
  )
}
