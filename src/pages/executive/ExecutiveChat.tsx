import { Link } from 'react-router-dom'
import { ChatWindow } from '@/features/chat/components/ChatWindow'

export function ExecutiveChatPage() {
  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-sm text-muted">
            <Link to="/executive/dashboard" className="text-brand-700 hover:underline">
              ← Executive Dashboard
            </Link>
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Executive Communications</h1>
        </div>

        <ChatWindow landId={null} channel="executive_channel" />
      </div>
    </div>
  )
}
