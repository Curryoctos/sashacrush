import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Copy, UserPlus, X } from 'lucide-react'
import {
  anonymousDisplayName,
  contributionGoalPercent,
  validateContributeAmount,
} from '@/features/projects/contributeHelpers'
import {
  initiateProjectContribution,
  type ProjectContributionMethod,
} from '@/features/projects/initiateProjectContribution'
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

function toApiMethod(method: PayMethod): ProjectContributionMethod {
  return method === 'card' ? 'stripe' : method
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
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [reference, setReference] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [followError, setFollowError] = useState<string | null>(null)
  const [followDone, setFollowDone] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    setStep(1)
    setCustom(false)
    setAmount(Math.max(50, Number(project.min_contribution_usd ?? 10)))
    setAmountError(null)
    setMethod(null)
    setReference(null)
    setStatusMessage(null)
    setSubmitError(null)
    setFollowError(null)
    setFollowDone(false)
    setShareCopied(false)
    setBusy(false)
    if (user?.email) {
      setEmail(user.email)
      setFullName(user.email.split('@')[0] ?? '')
    }
    void fetchUsdToUgxRate().then(setRate)
  }, [open, project.min_contribution_usd, user?.email])

  const ugxAmount = useMemo(() => amount * rate, [amount, rate])
  const pct = contributionGoalPercent(
    amount,
    Number(project.funding_goal_usd ?? 0),
  )
  const contactEmail = user?.email ?? email

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
    if (method === 'mobile_money' && !phone.trim()) {
      setSubmitError('Enter a mobile money phone number.')
      return
    }

    const contributorName = anonymousDisplayName(
      anonymous,
      fullName.trim() || user?.email || 'Contributor',
    )
    const contributorEmail = contactEmail.trim()
    if (!contributorEmail || !contributorEmail.includes('@')) {
      setSubmitError('A valid email is required for the contribution receipt.')
      return
    }

    setBusy(true)
    setSubmitError(null)
    try {
      const result = await initiateProjectContribution({
        projectId: project.id,
        amountUsd: amount,
        method: toApiMethod(method),
        contributorName,
        contributorEmail,
        contributorCountry: country,
        isAnonymous: anonymous,
        payerPhone: method === 'mobile_money' ? phone.trim() : undefined,
        mobileMoneyNetwork: method === 'mobile_money' ? network : undefined,
      })

      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl)
        return
      }

      setReference(result.reference)
      setStatusMessage(
        result.message ??
          'Contribution recorded as pending. Funding updates after confirmation.',
      )
      setStep(4)
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Could not start contribution.',
      )
    } finally {
      setBusy(false)
    }
  }

  const followProject = async () => {
    if (!user) {
      setFollowError('Sign in to follow this project.')
      return
    }
    setFollowError(null)
    const { error } = await supabase.from('project_participants').upsert(
      {
        project_id: project.id,
        user_id: user.id,
        role: 'follower',
        notes: anonymous ? 'Anonymous contribution interest' : null,
      },
      { onConflict: 'project_id,user_id' },
    )
    if (error) {
      setFollowError(error.message)
      return
    }
    setFollowDone(true)
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
            {step === 4 ? 'Contribution submitted' : `Contribute · ${project.title}`}
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
                  ['card', 'Card or Apple Pay', 'via Stripe Checkout'],
                  ['mobile_money', 'Mobile Money', 'MTN or Airtel Uganda — pending admin confirm'],
                  ['wire', 'Wire Transfer', 'Recorded with a unique reference'],
                  ['crypto', 'Crypto', 'Recorded for admin reconciliation'],
                ] as const
              ).map(([id, title, subtitle]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setMethod(id)
                    setSubmitError(null)
                  }}
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
                  You will be redirected to Stripe Checkout. Funding updates after
                  the payment webhook confirms.
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
              {method === 'crypto' ? (
                <p className="rounded-lg bg-surface px-3 py-2 text-[12px] text-muted">
                  Submit to receive a reference for reconciliation. Approx.{' '}
                  {formatUgx(ugxAmount)} at current rate.
                </p>
              ) : null}

              {submitError ? (
                <p className="text-[13px] text-danger" role="alert">
                  {submitError}
                </p>
              ) : null}

              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={() => setStep(user ? 1 : 2)}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  disabled={
                    !method ||
                    busy ||
                    (method === 'mobile_money' && !phone.trim())
                  }
                  onClick={() => void confirmPayment()}
                >
                  {busy
                    ? 'Working…'
                    : method === 'card'
                      ? 'Continue to Stripe'
                      : 'Submit contribution'}
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
              {reference ? (
                <p className="text-2xl font-semibold tracking-tight text-ink">
                  {reference}
                </p>
              ) : null}
              <p className="text-[13px] text-muted">
                {statusMessage ??
                  'Contribution is pending confirmation. Raised totals update when confirmed.'}
              </p>
              <p className="text-[12px] text-muted">
                We will use {contactEmail || 'your email'} for follow-up if needed.
              </p>
              {followError ? (
                <p className="text-[13px] text-danger" role="alert">
                  {followError}
                </p>
              ) : null}
              <div className="flex w-full flex-col gap-2 pt-2">
                {user ? (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => void followProject()}
                    disabled={followDone}
                  >
                    <UserPlus className="h-4 w-4" />
                    {followDone ? 'Following' : 'Follow Project'}
                  </Button>
                ) : null}
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
