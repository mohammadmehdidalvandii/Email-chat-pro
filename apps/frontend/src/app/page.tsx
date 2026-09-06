import { API_BASE_PATH } from '@email-chat-pro/constants'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 text-white">
      <h1 className="text-4xl font-bold tracking-tight">Email-Chat-Pro</h1>
      <p className="text-neutral-400">Project foundation is ready.</p>
      <code className="rounded bg-neutral-800 px-2 py-1 text-sm text-neutral-300">
        API: {API_BASE_PATH}
      </code>
    </main>
  )
}