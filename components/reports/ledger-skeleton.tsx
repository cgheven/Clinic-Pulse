/**
 * Fallback for the Daily Cash Ledger panel.
 *
 * Mirrors the real layout — a 4-card stat row followed by two wide table
 * panels — so nothing jumps when the aggregation resolves.
 */
export function LedgerSkeleton() {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[104px] animate-pulse rounded-xl border border-border bg-muted/40"
          />
        ))}
      </div>

      {Array.from({ length: 2 }).map((_, panel) => (
        <div
          key={panel}
          className="overflow-hidden rounded-xl border border-border bg-card"
          aria-hidden
        >
          <div className="h-9 animate-pulse border-b border-border bg-muted/30" />
          <div className="divide-y divide-border/50">
            {Array.from({ length: panel === 0 ? 5 : 3 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse bg-muted/20" />
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
