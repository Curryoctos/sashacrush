import { PageBackLink, PageHeader } from '@/components/ui/PageHeader'
import { ChatWindow } from '@/features/chat/components/ChatWindow'

export function ExecutiveChatPage() {
  return (
    <div className="ui-page max-w-4xl">
      <div>
        <PageBackLink to="/executive/dashboard" label="Executive Dashboard" />
        <PageHeader
          className="mt-3"
          title="Executive Communications"
          description="Isolated channel for admin and executive discussion. Sellers cannot see this channel."
        />
      </div>

      <ChatWindow landId={null} channel="executive_channel" />
    </div>
  )
}
