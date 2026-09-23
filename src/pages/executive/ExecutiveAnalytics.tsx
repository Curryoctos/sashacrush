import { AnalyticsDashboardView } from '@/features/analytics/components/AnalyticsDashboardView'
import { useAuth } from '@/hooks/useAuth'

export function ExecutiveAnalyticsPage() {
  const { user } = useAuth()
  return <AnalyticsDashboardView portal="executive" userEmail={user?.email} />
}
