import { Link } from 'react-router-dom'
import { ChatWindow } from '@/features/chat/components/ChatWindow'
import { SellerLandSelector } from '@/features/seller/components/SellerLandSelector'
import { useSellerLands } from '@/features/seller/useSellerLands'

export function SellerChatPage() {
  const {
    lands,
    selectedLand,
    selectedLandId,
    setSelectedLandId,
    isLoading,
    error,
  } = useSellerLands()

  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-sm text-muted">
            <Link to="/seller/dashboard" className="text-brand-700 hover:underline">
              ← Seller Dashboard
            </Link>
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Messages</h1>
          {selectedLand?.title && (
            <p className="mt-1 text-sm text-muted">Regarding: {selectedLand.title}</p>
          )}
        </div>

        {lands.length > 1 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <SellerLandSelector
              lands={lands}
              selectedLandId={selectedLandId}
              onSelect={setSelectedLandId}
            />
          </div>
        )}

        {isLoading && <p className="text-sm text-muted">Loading your conversation…</p>}

        {error && (
          <p className="text-sm text-red-700" role="alert">
            Could not load your property. Please try again.
          </p>
        )}

        {!isLoading && !error && !selectedLandId && (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-muted">
            No land record is assigned to your account yet. Messages will be available once
            admin assigns a property to you.
          </p>
        )}

        {!isLoading && selectedLandId && (
          <ChatWindow landId={selectedLandId} channel="seller_channel" />
        )}
      </div>
    </div>
  )
}
