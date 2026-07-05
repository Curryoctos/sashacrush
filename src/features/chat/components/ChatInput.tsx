import { useState, type FormEvent, type KeyboardEvent } from 'react'

const MAX_LENGTH = 1000
const COUNTER_THRESHOLD = 800

interface ChatInputProps {
  onSend: (body: string) => void | Promise<void>
  disabled?: boolean
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [value, setValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async () => {
    const trimmed = value.trim()
    if (!trimmed || disabled || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSend(trimmed)
      setValue('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submit()
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    void submit()
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-4">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <textarea
            value={value}
            onChange={(event) => setValue(event.target.value.slice(0, MAX_LENGTH))}
            onKeyDown={handleKeyDown}
            rows={2}
            disabled={disabled || isSubmitting}
            placeholder="Type a message…"
            className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50"
          />
          {value.length > COUNTER_THRESHOLD && (
            <p className="mt-1 text-right text-xs text-muted">
              {value.length}/{MAX_LENGTH}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={disabled || isSubmitting || !value.trim()}
          aria-label="Send message"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </form>
  )
}
