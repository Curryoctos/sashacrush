import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DocumentList } from '@/features/documents/components/DocumentList'
import { DocumentUpload } from '@/features/documents/components/DocumentUpload'
import { useDocuments } from '@/features/documents/useDocuments'
import { notifyInfo } from '@/features/notifications/useNotifications'
import { useAuth } from '@/hooks/useAuth'
import { formatSupabaseError } from '@/lib/supabase-errors'
import { supabase } from '@/lib/supabase'
import type { Document, LandRecord } from '@/types'

const LAND_COLUMNS = 'id, title, seller_id'

export function AdminDocumentsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedLandId, setSelectedLandId] = useState<string>('')
  const [pendingDocument, setPendingDocument] = useState<Document | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)

  const landsQuery = useQuery({
    queryKey: ['land-records', 'admin-documents'],
    queryFn: async (): Promise<LandRecord[]> => {
      const { data, error } = await supabase
        .from('land_records')
        .select(LAND_COLUMNS)
        .eq('status', 'active')
        .order('title')

      if (error) {
        throw error
      }

      return (data ?? []) as LandRecord[]
    },
  })

  const activeLandId = selectedLandId || landsQuery.data?.[0]?.id || ''
  const { sendForSigning } = useDocuments(activeLandId || null)

  const selectedLand = landsQuery.data?.find((land) => land.id === activeLandId)
  const assignedSellerId = selectedLand?.seller_id ?? null

  const handleUpload = () => {
    void queryClient.invalidateQueries({ queryKey: ['documents', activeLandId] })
  }

  const confirmSend = async () => {
    if (!pendingDocument || !assignedSellerId) {
      setSendError('This land record has no seller assigned.')
      return
    }

    setIsSending(true)
    setSendError(null)

    try {
      await sendForSigning(pendingDocument.id, assignedSellerId)
      setPendingDocument(null)
      notifyInfo('Document sent for signing')
      void queryClient.invalidateQueries({ queryKey: ['documents', activeLandId] })
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Could not send document.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-ink">Documents</h1>
              <p className="mt-1 text-sm text-muted">Signed in as {user?.email}</p>
            </div>
            <Link
              to="/admin/dashboard"
              className="text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              Back to dashboard
            </Link>
          </div>

          <div className="mt-6">
            <label htmlFor="land-select" className="block text-sm font-medium text-ink">
              Land record
            </label>
            <select
              id="land-select"
              value={activeLandId}
              onChange={(event) => setSelectedLandId(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {(landsQuery.data ?? []).map((land) => (
                <option key={land.id} value={land.id}>
                  {land.title}
                </option>
              ))}
            </select>
            {landsQuery.error && (
              <p className="mt-2 text-sm text-red-700" role="alert">
                {formatSupabaseError(landsQuery.error as Error)}
              </p>
            )}
          </div>
        </div>

        {activeLandId && (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-lg font-semibold text-ink">Upload</h2>
              <div className="mt-4">
                <DocumentUpload landId={activeLandId} onUpload={handleUpload} />
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-lg font-semibold text-ink">All documents</h2>
              <div className="mt-4">
                <DocumentList
                  landId={activeLandId}
                  onSendForSigning={(document) => {
                    setSendError(null)
                    setPendingDocument(document)
                  }}
                />
              </div>
            </section>
          </>
        )}

        {pendingDocument && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="send-modal-title"
          >
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
              <h2 id="send-modal-title" className="text-lg font-semibold text-ink">
                Send to seller for signature?
              </h2>
              <p className="mt-2 text-sm text-muted">
                {pendingDocument.title ?? 'This document'} will be assigned to the seller on{' '}
                {selectedLand?.title ?? 'this land record'}.
              </p>
              {sendError && (
                <p className="mt-3 text-sm text-red-700" role="alert">
                  {sendError}
                </p>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPendingDocument(null)
                    setSendError(null)
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-ink hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void confirmSend()}
                  disabled={isSending || !assignedSellerId}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {isSending ? 'Sending…' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
