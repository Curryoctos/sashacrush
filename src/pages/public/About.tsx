import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

const STEPS = [
  {
    title: 'Browse a real project',
    body: 'Start with public listings — land, schools, agriculture, and more. Each project shows goal, raised amount, and location.',
  },
  {
    title: 'Contribute or settle a deal',
    body: 'Supporters contribute via card, mobile money, wire, or crypto. Staff settle land payouts with Stripe or Flutterwave — amounts are verified server-side.',
  },
  {
    title: 'Receipts, not promises',
    body: 'Every confirmed payment mints a numbered PDF receipt. Sellers download their own receipts; they never see wallets, methods, or admin identity.',
  },
  {
    title: 'Documents & field proof',
    body: 'E-sign packages, GPS-tagged site photos, and chat keep the Mubende-style deal moving — Admin, Agent, and Seller each see only what they should.',
  },
]

export function AboutPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="text-[13px] font-medium tracking-[0.12em] text-muted uppercase">
          How it works
        </p>
        <h1 className="max-w-2xl text-[28px] font-semibold tracking-tight text-ink sm:text-[34px]">
          From contribution to receipt — one clear path
        </h1>
        <p className="max-w-2xl text-[14px] leading-relaxed text-muted">
          SashaCrush is built for cross-border land and community funding in Uganda.
          The workflow below is the product: browse → fund → confirm → receipt → proof
          on the ground.
        </p>
      </header>

      <ol className="relative space-y-0 border-l border-border pl-6">
        {STEPS.map((step, index) => (
          <li key={step.title} className="relative pb-8 last:pb-0">
            <span
              className="absolute -left-[1.55rem] flex h-7 w-7 items-center justify-center rounded-full border border-border bg-canvas text-[12px] font-semibold text-ink"
              aria-hidden
            >
              {index + 1}
            </span>
            <h2 className="text-[16px] font-semibold tracking-tight text-ink">
              {step.title}
            </h2>
            <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-muted">
              {step.body}
            </p>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-2">
        <Link to="/projects">
          <Button>Browse projects</Button>
        </Link>
        <Link to="/login">
          <Button variant="secondary">Sign in</Button>
        </Link>
      </div>
    </div>
  )
}
