import { LedgerSkeleton } from '@/components/reports/ledger-skeleton'

/**
 * Route-level fallback for /reports/ledger.
 *
 * Previously this folder had no loading.tsx, so navigation fell back to the
 * generic reports skeleton (1 bar + 4 square cards), which does not match the
 * ledger's two wide tables and caused a visible layout jump.
 */
export default function Loading() {
  return (
    <div className="space-y-6 p-6">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-muted/40" aria-hidden />
      <div className="h-10 w-72 animate-pulse rounded-lg bg-muted/40" aria-hidden />
      <LedgerSkeleton />
    </div>
  )
}
