import { AnalyticsDashboardView } from '@/features/analytics/components/AnalyticsDashboardView'
import { useAuth } from '@/hooks/useAuth'

export function AgentAnalyticsPage() {
  const { user } = useAuth()
  return <AnalyticsDashboardView portal="agent" userEmail={user?.email} />
}
