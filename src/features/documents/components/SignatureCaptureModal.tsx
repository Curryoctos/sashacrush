import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { PenLine, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  SignaturePad,
  clearSignaturePad,
} from '@/features/documents/components/SignaturePad'
import {
  canvasToPngBytes,
  isBlankCanvas,
  processSignatureUpload,
} from '@/features/documents/signatureImage'
import { cn } from '@/lib/cn'

type CaptureMode = 'draw' | 'upload'

interface SignatureCaptureModalProps {
  open: boolean
  documentTitle?: string | null
  busy?: boolean
  error?: string | null
  onCancel: () => void
  onConfirm: (signaturePng: Uint8Array) => void
}

export function SignatureCaptureModal({
  open,
  documentTitle,
  busy = false,
  error = null,
  onCancel,
  onConfirm,
}: SignatureCaptureModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const padWrapRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<CaptureMode>('draw')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pngBytes, setPngBytes] = useState<Uint8Array | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }
    setMode('draw')
    setPreviewUrl(null)
    setPngBytes(null)
    setLocalError(null)
    setProcessing(false)

    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.focus()
    })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy && !processing) {
        event.preventDefault()
        onCancel()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, busy, processing, onCancel])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  if (!open) {
    return null
  }

  const replacePreview = (url: string, bytes: Uint8Array) => {
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current)
      }
      return url
    })
    setPngBytes(bytes)
  }

  const handleClear = () => {
    const canvas = padWrapRef.current?.querySelector('canvas')
    if (canvas) {
      clearSignaturePad(canvas)
    }
    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current)
      }
      return null
    })
    setPngBytes(null)
    setLocalError(null)
  }

  const captureFromPad = async () => {
    const canvas = padWrapRef.current?.querySelector('canvas')
    if (!canvas) {
      throw new Error('Signature pad is not ready.')
    }
    if (isBlankCanvas(canvas)) {
      throw new Error('Please draw your signature before continuing.')
    }
    const bytes = await canvasToPngBytes(canvas)
    const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'image/png' }))
    replacePreview(url, bytes)
  }

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }
    setProcessing(true)
    setLocalError(null)
    try {
      const result = await processSignatureUpload(file)
      replacePreview(result.previewUrl, result.pngBytes)
    } catch (uploadError) {
      setLocalError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Could not process signature image.',
      )
    } finally {
      setProcessing(false)
    }
  }

  const handleConfirm = async () => {
    setLocalError(null)
    setProcessing(true)
    try {
      let bytes = pngBytes
      if (mode === 'draw' && !bytes) {
        await captureFromPad()
        const canvas = padWrapRef.current?.querySelector('canvas')
        if (!canvas) {
          throw new Error('Signature pad is not ready.')
        }
        bytes = await canvasToPngBytes(canvas)
      }
      if (!bytes || bytes.length === 0) {
        throw new Error(
          mode === 'upload'
            ? 'Upload a signature image first.'
            : 'Please draw your signature before continuing.',
        )
      }
      onConfirm(bytes)
    } catch (confirmError) {
      setLocalError(
        confirmError instanceof Error
          ? confirmError.message
          : 'Could not prepare signature.',
      )
    } finally {
      setProcessing(false)
    }
  }

  const displayError = localError ?? error

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/45 p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Dismiss signature dialog"
        className="absolute inset-0"
        onClick={() => {
          if (!busy && !processing) {
            onCancel()
          }
        }}
      />
      <Card
        ref={panelRef}
        padding="lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 w-full max-w-xl outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
      >
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Electronic signature
          </p>
          <h2 id={titleId} className="font-display text-xl font-semibold text-ink">
            Sign with your hand
          </h2>
          <p className="text-sm text-muted">
            {documentTitle
              ? `Apply a handwritten signature to “${documentTitle}”.`
              : 'Apply a handwritten signature to this document.'}{' '}
            Draw on screen or upload a photo — white paper is removed automatically.
          </p>
        </div>

        <div className="mt-5 flex gap-2 rounded-lg border border-border bg-surface p-1">
          <ModeTab
            active={mode === 'draw'}
            icon={<PenLine className="h-4 w-4" aria-hidden />}
            label="Draw on screen"
            disabled={busy || processing}
            onClick={() => {
              setMode('draw')
              setLocalError(null)
            }}
          />
          <ModeTab
            active={mode === 'upload'}
            icon={<Upload className="h-4 w-4" aria-hidden />}
            label="Upload signature"
            disabled={busy || processing}
            onClick={() => {
              setMode('upload')
              setLocalError(null)
            }}
          />
        </div>

        <div className="mt-4 space-y-3">
          {mode === 'draw' ? (
            <div ref={padWrapRef} className="space-y-2">
              <SignaturePad disabled={busy || processing} />
              <p className="text-xs text-muted">
                Sign in the box using your mouse, trackpad, or finger.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface px-4 py-8 text-center transition hover:border-brand-300 hover:bg-brand-50/40">
                <Upload className="h-5 w-5 text-brand-700" aria-hidden />
                <span className="text-sm font-medium text-ink">
                  {processing ? 'Cleaning background…' : 'Choose PNG or JPG'}
                </span>
                <span className="text-xs text-muted">
                  Dark ink on white paper works best
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  disabled={busy || processing}
                  onChange={(event) => void handleUpload(event)}
                />
              </label>
            </div>
          )}

          {previewUrl ? (
            <div className="rounded-lg border border-border bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                Preview
              </p>
              <img
                src={previewUrl}
                alt="Signature preview"
                className="mt-3 max-h-28 w-full object-contain"
              />
            </div>
          ) : null}
        </div>

        {displayError ? (
          <p className="ui-alert-danger mt-4" role="alert">
            {displayError}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={busy || processing}
          >
            Clear
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={busy || processing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={busy || processing}
            >
              {busy || processing ? 'Signing…' : 'Apply signature & sign'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

function ModeTab({
  active,
  icon,
  label,
  disabled,
  onClick,
}: {
  active: boolean
  icon: ReactNode
  label: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition',
        active
          ? 'bg-white text-ink shadow-sm'
          : 'text-muted hover:text-ink',
        disabled ? 'opacity-50' : '',
      )}
    >
      {icon}
      {label}
    </button>
  )
}
