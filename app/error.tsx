'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw, LayoutDashboard } from 'lucide-react'

/**
 * Route-level error boundary.
 *
 * The app had none, which meant any rejected promise inside a
 * `startTransition(async ...)` — of which there are ~29 call sites — took the
 * entire page down with a blank screen and no way back. A server action that
 * fails at the transport layer (offline, 502, a stale deployment id after a
 * redeploy) rejects rather than returning an ActionResult, so this is the
 * common case, not an exotic one.
 *
 * Keeping it minimal and dependency-free on purpose: this renders when
 * something has already gone wrong.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surfaces in the browser console and in Vercel's function logs.
    console.error('Route error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>

        <h2 className="text-base font-bold text-foreground">Something went wrong</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          This page hit an unexpected error. Your data has not been changed.
        </p>

        {/* The digest is the only safe identifier to show — the raw message can
            carry internal detail. It's what correlates a user report to a log. */}
        {error.digest && (
          <p className="mt-3 font-mono text-[11px] text-muted-foreground/50">
            Reference: {error.digest}
          </p>
        )}

        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
