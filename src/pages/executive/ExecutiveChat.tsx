import { PageHeader } from '@/components/ui/PageHeader'
import { ChatWindow } from '@/features/chat/components/ChatWindow'

export function ExecutiveChatPage() {
  return (
    <div className="ui-page">
      <PageHeader
        backTo="/executive/dashboard"
        backLabel="Dashboard"
        title="Executive Communications"
        description="Isolated channel for admin and executive discussion. Sellers cannot see this channel."
      />

      <ChatWindow landId={null} channel="executive_channel" />
    </div>
  )
}
