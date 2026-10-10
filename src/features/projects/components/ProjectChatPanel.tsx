import { ChatWindow } from '@/features/chat/components/ChatWindow'

interface ProjectChatPanelProps {
  projectId: string
}

/** Staff conversation scoped to a funding project. */
export function ProjectChatPanel({ projectId }: ProjectChatPanelProps) {
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted">
        Messages for this project only — separate from land-deal seller channels.
      </p>
      <ChatWindow
        landId={null}
        projectId={projectId}
        channel="seller_channel"
      />
    </div>
  )
}
