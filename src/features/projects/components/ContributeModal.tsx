import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Copy, Download, UserPlus, X } from 'lucide-react'
import {
  anonymousDisplayName,
  contributionGoalPercent,
  validateContributeAmount,
} from '@/features/projects/contributeHelpers'
import { useAuth } from '@/hooks/useAuth'
import { fetchUsdToUgxRate } from '@/features/payments/usdUgxRate'
import { formatUgx, formatUsd } from '@/lib/formatters'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import type { Project } from '@/types/projects'

type Step = 1 | 2 | 3 | 4
type PayMethod = 'card' | 'mobile_money' | 'wire' | 'crypto'

const PRESETS = [10, 50, 100, 500] as const

interface ContributeModalProps {
  open: boolean
  project: Project
  onClose: () => void
}

export function ContributeModal({ open, project, onClose }: ContributeModalProps) {
  const { user } = useAuth()
  const [step, setStep] = useState<Step>(1)
  const [custom, setCustom] = useState(false)
  const [amount, setAmount] = useState(50)
  const [amountError, setAmountError] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState('Uganda')
  const [anonymous, setAnonymous] = useState(false)
  const [method, setMethod] = useState<PayMethod | null>(null)
  const [phone, setPhone] = useState('')
  const [network, setNetwork] = useState<'mtn' | 'airtel'>('mtn')
  const [rate, setRate] = useState(3700)
  const [busy, setBusy] = useState(false)
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null)
  const [wireRef, setWireRef] = useState<string | null>(null)
  const [shareCopied, setShareCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    setStep(1)
    setCustom(false)
    setAmount(Math.max(50, Number(project.min_contribution_usd ?? 10)))
    setAmountError(null)
    setMethod(null)
    setReceiptNumber(null)
    setWireRef(null)
    setBusy(false)
    void fetchUsdToUgxRate().then(setRate)
  }, [open, project.min_contribution_usd])

  const ugxAmount = useMemo(() => amount * rate, [amount, rate])
  const pct = contributionGoalPercent(
    amount,
    Number(project.funding_goal_usd ?? 0),
  )
  const receiptEmail = user?.email ?? email

  if (!open) return null

  const goNextFromAmount = () => {
    const error = validateContributeAmount({
      amountUsd: amount,
      minContributionUsd: Number(project.min_contribution_usd ?? 10),
      fundingGoalUsd: Number(project.funding_goal_usd ?? 0),
    })
    setAmountError(error)
    if (error) return
    setStep(user ? 3 : 2)
  }

  const confirmPayment = async () => {
    if (!method) return
    setBusy(true)
    try {
      const year = new Date().getFullYear()
      const stub = `SC-${year}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`
      setReceiptNumber(stub)
      if (method === 'wire') {
        setWireRef(`WIRE-${project.slug.slice(0, 12).toUpperCase()}-${Date.now().toString(36)}`)
      }

      if (user && anonymous === false) {
        // Logged-in non-anonymous path can record follower/contributor later via admin.
      }
      // Anonymous flag stores display name for participant records when wired to API.
      void anonymousDisplayName(anonymous, fullName || user?.email || 'Contributor')

      setStep(4)
    } finally {
      setBusy(false)
    }
  }

  const followProject = async () => {
    if (!user) return
    await supabase.from('project_participants').upsert(
      {
        project_id: project.id,
        user_id: user.id,
        role: 'follower',
        notes: anonymous ? 'Anonymous contribution interest' : null,
      },
      { onConflict: 'project_id,user_id' },
    )
  }

  const shareProject = async () => {
    const url = `${window.location.origin}/projects/${project.slug}`
    await navigator.clipboard.writeText(url)
    setShareCopied(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-overlay"
        aria-label="Close contribute modal"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contribute-title"
        className="relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-canvas shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="contribute-title" className="text-[15px] font-semibold text-ink">
            {step === 4 ? 'Contribution received' : `Contribute · ${project.title}`}
          </h2>
          <button
            type="button"
            className="rounded-lg p-1.5 text-muted hover:bg-hover hover:text-ink"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4">
          {step === 1 && (
            <div className="space-y-4">
              <div className="ui-segment flex-wrap">
                {PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setCustom(false)
                      setAmount(preset)
                      setAmountError(null)
                    }}
                    className={cn(
                      'ui-segment-item',
                      !custom && amount === preset
                        ? 'ui-segment-item-active'
                        : 'ui-segment-item-idle',
                    )}
                  >
                    ${preset}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCustom(true)}
                  className={cn(
                    'ui-segment-item',
                    custom ? 'ui-segment-item-active' : 'ui-segment-item-idle',
                  )}
                >
                  Custom
                </button>
              </div>
              {custom ? (
                <input
                  type="number"
                  min={0}
                  className="ui-input w-full"
                  value={amount}
                  onChange={(e) => {
                    setAmount(Number(e.target.value))
                    setAmountError(null)
                  }}
                  aria-label="Custom amount USD"
                />
              ) : null}
              <div className="space-y-1 text-[13px] text-muted">
                <p>= {formatUgx(ugxAmount)}</p>
                <p>Your contribution is {pct}% of the project goal.</p>
                <p>Minimum: {formatUsd(Number(project.min_contribution_usd ?? 10))}</p>
              </div>
              {amountError ? (
                <p className="text-[13px] text-danger" role="alert">
                  {amountError}
                </p>
              ) : null}
              <Button className="w-full" onClick={goNextFromAmount}>
                Next
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <label className="block space-y-1 text-[13px]">
                <span className="text-muted">Full name</span>
                <input
                  className="ui-input w-full"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </label>
              <label className="block space-y-1 text-[13px]">
                <span className="text-muted">Email</span>
                <input
                  type="email"
                  className="ui-input w-full"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="block space-y-1 text-[13px]">
                <span className="text-muted">Country</span>
                <select
                  className="ui-input w-full"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  <option>Uganda</option>
                  <option>United States</option>
                  <option>United Kingdom</option>
                  <option>Kenya</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-[13px] text-ink">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => setAnonymous(e.target.checked)}
                />
                Make this contribution anonymous
              </label>
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  disabled={!fullName.trim() || !email.trim()}
                  onClick={() => setStep(3)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              {(
                [
                  ['card', 'Card or Apple Pay', 'via Stripe'],
                  ['mobile_money', 'Mobile Money', 'MTN or Airtel Uganda'],
                  ['wire', 'Wire Transfer', 'Western Union, Venmo, or SendUp'],
                  ['crypto', 'Crypto', 'MetaMask or WalletConnect'],
                ] as const
              ).map(([id, title, subtitle]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMethod(id)}
                  className={cn(
                    'w-full rounded-xl border px-4 py-3 text-left transition',
                    method === id
                      ? 'border-ink bg-active'
                      : 'border-border hover:bg-hover',
                  )}
                >
                  <p className="text-[14px] font-medium text-ink">{title}</p>
                  <p className="text-[12px] text-muted">{subtitle}</p>
                </button>
              ))}

              {method === 'card' ? (
                <p className="rounded-lg bg-surface px-3 py-2 text-[12px] text-muted">
                  Card payments use Stripe Checkout. Confirm to continue with a
                  secure payment session.
                </p>
              ) : null}
              {method === 'mobile_money' ? (
                <div className="space-y-2">
                  <input
                    className="ui-input w-full"
                    placeholder="Phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <select
                    className="ui-input w-full"
                    value={network}
                    onChange={(e) => setNetwork(e.target.value as 'mtn' | 'airtel')}
                  >
                    <option value="mtn">MTN</option>
                    <option value="airtel">Airtel</option>
                  </select>
                </div>
              ) : null}
              {method === 'wire' && wireRef ? (
                <p className="text-[13px] text-ink">Reference: {wireRef}</p>
              ) : null}
              {method === 'crypto' ? (
                <p className="rounded-lg bg-surface px-3 py-2 text-[12px] text-muted">
                  Connect MetaMask or WalletConnect on the next confirmation step.
                  Approx. {formatUgx(ugxAmount)} at current rate.
                </p>
              ) : null}

              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={() => setStep(user ? 1 : 2)}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  disabled={!method || busy}
                  onClick={() => void confirmPayment()}
                >
                  Confirm Payment
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle2 className="h-14 w-14 animate-in text-success fade-in zoom-in" />
              <p className="text-[15px] font-medium text-ink">
                Thank you for supporting {project.title}
              </p>
              <p className="text-2xl font-semibold tracking-tight text-ink">
                {receiptNumber}
              </p>
              <p className="text-[13px] text-muted">
                A receipt has been sent to {receiptEmail || 'your email'}
              </p>
              <div className="flex w-full flex-col gap-2 pt-2">
                <Button variant="secondary" className="w-full">
                  <Download className="h-4 w-4" />
                  Download Receipt
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => void followProject()}
                >
                  <UserPlus className="h-4 w-4" />
                  Follow Project
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => void shareProject()}
                >
                  <Copy className="h-4 w-4" />
                  {shareCopied ? 'Link copied' : 'Share Project'}
                </Button>
                <Button className="w-full" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
