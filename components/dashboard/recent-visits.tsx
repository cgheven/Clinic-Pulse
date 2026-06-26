import type { RecentVisit } from '@/app/actions/dashboard'
import { formatCurrencyPaisas, formatDate } from '@/lib/utils'

// =============================================================================
// Loading skeleton
// =============================================================================

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-32 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// Patient avatar (initials)
// =============================================================================

function PatientAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
      {initials}
    </div>
  )
}

// =============================================================================
// RecentVisits
// =============================================================================

interface RecentVisitsProps {
  data: RecentVisit[]
  loading?: boolean
}

export function RecentVisits({ data, loading = false }: RecentVisitsProps) {
  if (loading) return <TableSkeleton />

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-sm text-muted-foreground">No visits recorded today.</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border">
      {data.map((visit) => (
        <div
          key={visit.id}
          className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
        >
          <PatientAvatar name={visit.patient_name} />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {visit.patient_name}
            </p>
            <p className="text-xs text-muted-foreground">
              {visit.doctor_name ? `Dr. ${visit.doctor_name}` : 'No doctor assigned'}
            </p>
          </div>

          {/* Date */}
          <div className="hidden text-right sm:block">
            <p className="text-xs text-muted-foreground">
              {formatDate(visit.visit_date, 'dd MMM')}
            </p>
          </div>

          {/* Fee */}
          <p className="whitespace-nowrap text-sm font-medium text-foreground">
            {formatCurrencyPaisas(visit.fee_paisas)}
          </p>
        </div>
      ))}
    </div>
  )
}
