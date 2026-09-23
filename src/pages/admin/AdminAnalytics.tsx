import { AnalyticsDashboardView } from '@/features/analytics/components/AnalyticsDashboardView'
import { useAuth } from '@/hooks/useAuth'

export function AdminAnalyticsPage() {
  const { user } = useAuth()
  return <AnalyticsDashboardView portal="admin" userEmail={user?.email} />
}
