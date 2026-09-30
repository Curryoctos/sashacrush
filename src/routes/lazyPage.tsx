import { Suspense, type ReactNode } from 'react'

/** Wrap a lazy route element so the portal shell stays mounted while chunks load. */
export function page(element: ReactNode) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center px-4">
          <p className="text-sm font-semibold text-muted">Loading…</p>
        </div>
      }
    >
      {element}
    </Suspense>
  )
}
