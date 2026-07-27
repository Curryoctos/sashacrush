import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { ArrowLeft, Camera, FileText, MessageSquare, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  DealCards,
  FolderCards,
  HierarchyNav,
} from '@/components/hierarchy/Hierarchy'
import { useSellerUnreadCount } from '@/features/chat/useSellerUnreadCount'
import { useLandHierarchyNav } from '@/hooks/useLandHierarchyNav'
import { useAuth } from '@/hooks/useAuth'
import { formatSupabaseError } from '@/lib/supabase-errors'
import { supabase } from '@/lib/supabase'
import type { LandRecord } from '@/types/database'

const SELLER_LAND_COLUMNS = 'id, title, status'

export function SellerDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: unreadCount = 0 } = useSellerUnreadCount()

  const { data, isLoading, error } = useQuery({
    queryKey: ['land-records', 'seller', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<LandRecord[]> => {
      const { data: records, error: queryError } = await supabase
        .from('land_records')
        .select(SELLER_LAND_COLUMNS)
        .eq('seller_id', user!.id)
        .order('created_at', { ascending: false })

      if (queryError) {
        throw queryError
      }

      return (records ?? []) as LandRecord[]
    },
  })

  const lands = data ?? []
  const { selectedLand, setNavigation } = useLandHierarchyNav(lands)

  const dealCards = useMemo(
    () =>
      lands.map((land) => ({
        id: land.id,
        title: land.title,
        hint: unreadCount > 0 ? 'New activity' : 'Open folders',
      })),
    [lands, unreadCount],
  )

  return (
    <div className="ui-page max-w-4xl">
      <PageHeader
        eyebrow="Seller portal"
        title="Your workspace"
        description={
          user?.email
            ? `Signed in as ${user.email}. Open a deal, then a folder.`
            : 'Open a deal, then a folder.'
        }
      />

      {isLoading && <p className="text-sm text-muted">Loading workspace…</p>}

      {error && (
        <p className="ui-alert-danger" role="alert">
          {formatSupabaseError(error as Error)}
        </p>
      )}

      {!isLoading && !error && !selectedLand && (
        <DealCards
          deals={dealCards}
          onSelect={(id) => setNavigation(id, null)}
          emptyTitle="No land record assigned yet"
          emptyDescription="Your deals appear here once admin assigns a property."
          prompt="Select a deal to open its folders."
        />
      )}

      {selectedLand && (
        <div className="space-y-5">
          <HierarchyNav
            crumbs={[
              { label: 'Workspace', onClick: () => setNavigation(null, null) },
              { label: selectedLand.title },
            ]}
          />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="ui-section-title">{selectedLand.title}</h2>
              <p className="ui-section-desc">Choose a folder</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setNavigation(null, null)}>
              <ArrowLeft className="h-4 w-4" />
              Workspace
            </Button>
          </div>

          <FolderCards
            folders={[
              {
                id: 'messages',
                title: 'Messages',
                description: 'Talk with the SashaCrush team',
                icon: <MessageSquare className="h-5 w-5" />,
                count: unreadCount > 0 ? unreadCount : undefined,
                onSelect: () => navigate(`/seller/chat?land=${selectedLand.id}`),
              },
              {
                id: 'documents',
                title: 'Documents',
                description: 'Review and sign deal documents',
                icon: <FileText className="h-5 w-5" />,
                onSelect: () => navigate(`/seller/documents?land=${selectedLand.id}`),
              },
              {
                id: 'receipts',
                title: 'Receipts',
                description: 'Download payment receipts',
                icon: <Receipt className="h-5 w-5" />,
                onSelect: () => navigate(`/seller/receipts?land=${selectedLand.id}`),
              },
              {
                id: 'photos',
                title: 'Photos',
                description: 'Property photo gallery',
                icon: <Camera className="h-5 w-5" />,
                onSelect: () => navigate(`/seller/photos?land=${selectedLand.id}`),
              },
            ]}
          />
        </div>
      )}
    </div>
  )
}
