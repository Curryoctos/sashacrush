import { PageBackLink, PageHeader } from '@/components/ui/PageHeader'
import { ChatWindow } from '@/features/chat/components/ChatWindow'

export function ExecutiveChatPage() {
  return (
    <div className="ui-page max-w-4xl">
      <div>
        <PageBackLink to="/executive/dashboard" label="Executive Dashboard" />
        <PageHeader className="mt-3" title="Executive Communications" />
      </div>

      <ChatWindow landId={null} channel="executive_channel" />
    </div>
  )
}
