/**
 * Shared Suspense fallback for the /reports/* panels.
 *
 * Mirrors the shape of the report tables (a summary strip + a bordered table
 * panel) so the layout does not jump when the real data streams in.
 */
export function ReportSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-border bg-muted/40"
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="h-9 animate-pulse border-b border-border bg-muted/30" />
        <div className="divide-y divide-border/50">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-11 animate-pulse bg-muted/20" />
          ))}
        </div>
      </div>
    </div>
  )
}
