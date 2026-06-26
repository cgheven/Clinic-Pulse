// Route-level loading UI — Next.js App Router wraps this in a Suspense boundary
// automatically, so it shows while the async dashboard page resolves.

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex flex-col gap-1">
        <div className="h-7 w-36 rounded-lg bg-muted" />
        <div className="h-4 w-56 rounded bg-muted" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-3.5 w-28 rounded bg-muted" />
                <div className="h-7 w-36 rounded bg-muted" />
                <div className="h-3 w-24 rounded bg-muted" />
              </div>
              <div className="h-10 w-10 rounded-lg bg-muted" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts row skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="space-y-2 mb-4">
              <div className="h-4 w-40 rounded bg-muted" />
              <div className="h-3 w-28 rounded bg-muted" />
            </div>
            <div className="h-48 rounded-lg bg-muted" />
          </div>
        ))}
      </div>

      {/* Recent visits skeleton */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="space-y-2 mb-4">
          <div className="h-4 w-40 rounded bg-muted" />
          <div className="h-3 w-28 rounded bg-muted" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 py-2">
              <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 rounded bg-muted" />
                <div className="h-3 w-24 rounded bg-muted" />
              </div>
              <div className="h-3 w-16 rounded bg-muted" />
              <div className="h-3 w-20 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>

      {/* Alerts row skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="space-y-2 mb-4">
              <div className="h-4 w-40 rounded bg-muted" />
              <div className="h-3 w-28 rounded bg-muted" />
            </div>
            <div className="space-y-2.5">
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2.5"
                >
                  <div className="h-6 w-6 rounded bg-muted shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-36 rounded bg-muted" />
                    <div className="h-3 w-24 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
