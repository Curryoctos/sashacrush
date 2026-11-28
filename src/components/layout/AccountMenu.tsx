import { useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronRight,
  Contrast,
  LogOut,
  MoreHorizontal,
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeProvider'
import { cn } from '@/lib/cn'
import {
  THEME_LABELS,
  type ThemePreference,
} from '@/lib/theme'

interface AccountMenuProps {
  portal: string
  email: string | null
  onSignOut?: () => void
}

function initialsFromEmail(email: string | null): string {
  if (!email) {
    return '?'
  }
  const local = email.split('@')[0] ?? email
  return local.slice(0, 1).toUpperCase()
}

function displayNameFromEmail(email: string | null): string {
  if (!email) {
    return 'Account'
  }
  const local = email.split('@')[0] ?? email
  return local.replace(/[._-]+/g, ' ')
}

export function AccountMenu({ portal, email, onSignOut }: AccountMenuProps) {
  const { preference, setPreference } = useTheme()
  const [open, setOpen] = useState(false)
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
        setAppearanceOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setAppearanceOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const name = displayNameFromEmail(email)
  const initial = initialsFromEmail(email)

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={cn(
          'flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition',
          'hover:bg-hover',
          open && 'bg-active',
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current)
          setAppearanceOpen(false)
        }}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-[12px] font-semibold text-ink-inverse"
          aria-hidden
        >
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium capitalize text-ink">
            {name}
          </span>
          <span className="block truncate text-[11px] text-muted">{portal}</span>
        </span>
        <MoreHorizontal className="h-4 w-4 shrink-0 text-muted" aria-hidden />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-2 w-64 overflow-visible rounded-xl border border-border bg-surface-elevated py-1 shadow-lg"
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate text-[13px] font-medium capitalize text-ink">
              {name}
            </p>
            <p className="truncate text-[12px] text-muted">{email ?? '—'}</p>
          </div>

          <div className="relative py-1">
            <button
              type="button"
              role="menuitem"
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-ink transition',
                'hover:bg-hover',
                appearanceOpen && 'bg-hover',
              )}
              onClick={() => setAppearanceOpen((current) => !current)}
              onMouseEnter={() => setAppearanceOpen(true)}
            >
              <Contrast className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
              <span className="flex-1">Appearance</span>
              <span className="text-[12px] text-muted">
                {THEME_LABELS[preference]}
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-muted" />
            </button>

            {appearanceOpen ? (
              <div
                role="menu"
                className="absolute bottom-0 left-full z-50 ml-1 w-44 overflow-hidden rounded-xl border border-border bg-surface-elevated py-1 shadow-lg"
              >
                {(['light', 'dark', 'system'] as ThemePreference[]).map(
                  (option) => (
                    <button
                      key={option}
                      type="button"
                      role="menuitemradio"
                      aria-checked={preference === option}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-ink transition hover:bg-hover"
                      onClick={() => {
                        setPreference(option)
                        setAppearanceOpen(false)
                        setOpen(false)
                      }}
                    >
                      <span className="flex-1">{THEME_LABELS[option]}</span>
                      {preference === option ? (
                        <Check className="h-3.5 w-3.5 text-ink" strokeWidth={2.5} />
                      ) : null}
                    </button>
                  ),
                )}
              </div>
            ) : null}
          </div>

          {onSignOut ? (
            <div className="border-t border-border py-1">
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-ink transition hover:bg-hover"
                onClick={() => {
                  setOpen(false)
                  onSignOut()
                }}
              >
                <LogOut className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                Log out
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
