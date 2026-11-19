import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

export interface DealJourneyStep {
  id: string
  label: string
  hint: string
  to: string
  done?: boolean
  current?: boolean
}

interface DealJourneyStripProps {
  steps: DealJourneyStep[]
}

/** Consistent deal workflow cue: messages → proof → documents → pay → receipt. */
export function DealJourneyStrip({ steps }: DealJourneyStripProps) {
  return (
    <nav
      aria-label="Deal workflow"
      className="overflow-x-auto border-y border-border bg-surface/60"
    >
      <ol className="mx-auto flex min-w-max max-w-5xl items-stretch gap-0 px-5 sm:px-8">
        {steps.map((step, index) => (
          <li key={step.id} className="flex min-w-[9.5rem] flex-1">
            <Link
              to={step.to}
              className={cn(
                'group flex w-full flex-col gap-0.5 border-b-2 px-3 py-3 transition',
                step.current
                  ? 'border-ink bg-canvas'
                  : 'border-transparent hover:bg-hover',
              )}
            >
              <span className="text-[11px] font-medium tracking-wide text-muted uppercase">
                Step {index + 1}
                {step.done ? ' · done' : ''}
              </span>
              <span
                className={cn(
                  'text-[13px] font-semibold tracking-tight',
                  step.current ? 'text-ink' : 'text-ink group-hover:text-ink',
                )}
              >
                {step.label}
              </span>
              <span className="text-[11px] leading-snug text-muted">{step.hint}</span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  )
}
