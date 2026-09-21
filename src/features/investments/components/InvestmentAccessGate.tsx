import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, Circle, Eye, FileSignature, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { DocumentPreviewModal } from '@/features/documents/components/DocumentPreviewModal'
import { SignatureCaptureModal } from '@/features/documents/components/SignatureCaptureModal'
import { useDocuments } from '@/features/documents/useDocuments'
import {
  INVESTMENT_TERMS_SECTIONS,
  INVESTMENT_TERMS_TITLE,
} from '@/features/investments/terms'
import { useInvestmentAccessGate } from '@/features/investments/useInvestmentAccessGate'
import { notifySuccess } from '@/features/notifications/useNotifications'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/cn'
import { formatSupabaseError } from '@/lib/supabase-errors'
import type { Document } from '@/types'

interface InvestmentAccessGateProps {
  children: ReactNode
}

function StepIcon({ done, active }: { done: boolean; active: boolean }) {
  if (done) {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success-soft text-success">
        <Check className="h-4 w-4" aria-hidden />
      </span>
    )
  }
  return (
    <span
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-full border',
        active ? 'border-ink text-ink' : 'border-border text-muted',
      )}
    >
      <Circle className="h-3.5 w-3.5" aria-hidden />
    </span>
  )
}

export function InvestmentAccessGate({ children }: InvestmentAccessGateProps) {
  const { user } = useAuth()
  const gate = useInvestmentAccessGate()
  const { signDocument, getPreviewUrl } = useDocuments(user?.id ?? null, {
    scope: 'investor',
  })

  const [acceptedCheckbox, setAcceptedCheckbox] = useState(false)
  const [acceptError, setAcceptError] = useState<string | null>(null)
  const [pendingSign, setPendingSign] = useState<Document | null>(null)
  const [signError, setSignError] = useState<string | null>(null)
  const [isSigning, setIsSigning] = useState(false)
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  if (gate.isLoading) {
    return <p className="text-sm text-muted">Checking contribution access…</p>
  }

  if (gate.error) {
    return (
      <p className="ui-alert-danger" role="alert">
        {formatSupabaseError(gate.error as Error)}
      </p>
    )
  }

  if (gate.canContribute) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-muted">
          <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
          <span>Terms accepted · Agreements complete · Contribution portal open</span>
        </div>
        {children}
      </div>
    )
  }

  const handleAccept = async () => {
    setAcceptError(null)
    if (!acceptedCheckbox) {
      setAcceptError('Confirm that you have read and accept the terms.')
      return
    }
    try {
      await gate.acceptTerms()
      notifySuccess('Terms accepted. Continue with any pending agreements.')
    } catch (error) {
      setAcceptError(
        error instanceof Error ? formatSupabaseError(error) : 'Could not save consent.',
      )
    }
  }

  const openPreview = async (doc: Document) => {
    setPreviewError(null)
    try {
      const url = await getPreviewUrl(doc)
      setPreviewDocument(doc)
      setPreviewUrl(url)
    } catch (error) {
      setPreviewError(
        error instanceof Error ? formatSupabaseError(error) : 'Could not preview agreement.',
      )
    }
  }

  return (
    <Card>
      <CardHeader
        title="Before you contribute"
        description="A short checklist unlocks the payment portal. Accept the terms, then sign any outstanding agreements."
      />

      <ol className="mt-5 space-y-5">
        <li className="flex gap-3">
          <StepIcon done={gate.termsAccepted} active={!gate.termsAccepted} />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-ink">1. {INVESTMENT_TERMS_TITLE}</h3>
              {gate.termsAccepted ? (
                <Badge tone="success">Accepted</Badge>
              ) : (
                <Badge tone="warning">Required</Badge>
              )}
            </div>

            {!gate.termsAccepted ? (
              <>
                <div className="max-h-56 space-y-3 overflow-y-auto rounded-lg border border-border bg-surface p-3 text-sm">
                  {INVESTMENT_TERMS_SECTIONS.map((section) => (
                    <section key={section.heading}>
                      <h4 className="font-medium text-ink">{section.heading}</h4>
                      <p className="mt-1 text-muted">{section.body}</p>
                    </section>
                  ))}
                  <p className="text-xs text-muted">Version {gate.termsVersion}</p>
                </div>

                <label className="flex cursor-pointer items-start gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={acceptedCheckbox}
                    onChange={(event) => setAcceptedCheckbox(event.target.checked)}
                  />
                  <span>
                    I have read and accept the investment terms and conditions for the company
                    capital pool.
                  </span>
                </label>

                {acceptError ? (
                  <p className="ui-alert-danger" role="alert">
                    {acceptError}
                  </p>
                ) : null}

                <Button
                  type="button"
                  disabled={gate.isAccepting}
                  onClick={() => void handleAccept()}
                >
                  {gate.isAccepting ? 'Saving…' : 'Accept & continue'}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted">
                Accepted
                {gate.termsAcceptedAt
                  ? ` · ${new Date(gate.termsAcceptedAt).toLocaleString()}`
                  : ''}
              </p>
            )}
          </div>
        </li>

        <li className="flex gap-3">
          <StepIcon
            done={gate.termsAccepted && gate.pendingCount === 0}
            active={gate.termsAccepted && gate.pendingCount > 0}
          />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-ink">2. Sign investment agreements</h3>
              {gate.termsAccepted && gate.pendingCount === 0 ? (
                <Badge tone="success">Complete</Badge>
              ) : gate.pendingCount > 0 ? (
                <Badge tone="warning">{gate.pendingCount} awaiting signature</Badge>
              ) : (
                <Badge tone="neutral">After terms</Badge>
              )}
            </div>

            {!gate.termsAccepted ? (
              <p className="text-sm text-muted">
                Accept the terms first. Any agreements awaiting your signature will appear here.
              </p>
            ) : gate.pendingCount === 0 ? (
              <p className="text-sm text-muted">No agreements waiting — you are clear to contribute.</p>
            ) : (
              <ul className="space-y-2">
                {gate.pendingAgreements.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {doc.title ?? 'Investment agreement'}
                      </p>
                      <p className="text-xs text-muted">Hand signature required</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => void openPreview(doc)}
                      >
                        <Eye className="h-4 w-4" aria-hidden />
                        Preview
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setSignError(null)
                          setPendingSign(doc)
                        }}
                      >
                        <FileSignature className="h-4 w-4" aria-hidden />
                        Sign now
                      </Button>
                    </div>
                  </li>
                ))}
                <li>
                  <Link
                    to="/executive/documents"
                    className="text-xs font-medium text-ink underline"
                  >
                    Open all agreements
                  </Link>
                </li>
              </ul>
            )}

            {previewError ? (
              <p className="ui-alert-danger" role="alert">
                {previewError}
              </p>
            ) : null}
          </div>
        </li>

        <li className="flex gap-3">
          <StepIcon done={false} active={false} />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-ink">3. Contribution portal</h3>
            <p className="mt-1 text-sm text-muted">
              Unlocks automatically when the steps above are complete.
            </p>
          </div>
        </li>
      </ol>

      <SignatureCaptureModal
        open={Boolean(pendingSign)}
        documentTitle={pendingSign?.title}
        busy={isSigning}
        error={signError}
        onCancel={() => {
          setPendingSign(null)
          setSignError(null)
        }}
        onConfirm={(pngBytes) => {
          if (!pendingSign) {
            return
          }
          void (async () => {
            setIsSigning(true)
            setSignError(null)
            try {
              await signDocument(pendingSign.id, { pngBytes })
              setPendingSign(null)
              await gate.refreshGate()
              notifySuccess('Agreement signed.')
            } catch (err) {
              setSignError(
                err instanceof Error ? formatSupabaseError(err) : 'Could not sign document.',
              )
            } finally {
              setIsSigning(false)
            }
          })()
        }}
      />

      {previewDocument && previewUrl ? (
        <DocumentPreviewModal
          title={previewDocument.title ?? 'Agreement preview'}
          previewUrl={previewUrl}
          filePath={previewDocument.file_path ?? ''}
          onClose={() => {
            setPreviewDocument(null)
            setPreviewUrl(null)
          }}
        />
      ) : null}
    </Card>
  )
}
