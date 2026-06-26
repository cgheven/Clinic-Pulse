import { CheckCircle2, Clock, XCircle, RotateCcw } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { RecentVisit } from '@/app/actions/dashboard'
import { formatCurrencyPaisas, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

// =============================================================================
// Status badge config
// =============================================================================

type StatusConfig = {
  label: string
  icon: LucideIcon
  className: string
}

const STATUS_MAP: Record<string, StatusConfig> = {
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    className: 'text-success bg-success/10',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'text-warning bg-warning/10',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    className: 'text-destructive bg-destructive/10',
  },
  refunded: {
    label: 'Refunded',
    icon: RotateCcw,
    className: 'text-info bg-info/10',
  },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.pending
  const Icon = cfg.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        cfg.className
      )}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  )
}

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
          <div className="h-5 w-16 rounded-full bg-muted" />
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
              {visit.patient_no}
              {visit.doctor_name ? ` · Dr. ${visit.doctor_name}` : ''}
            </p>
          </div>

          {/* Date + time */}
          <div className="hidden text-right sm:block">
            <p className="text-xs text-muted-foreground">
              {formatDate(visit.visit_date, 'dd MMM')}
            </p>
            <p className="text-xs text-muted-foreground">
              {visit.visit_time?.slice(0, 5) ?? '—'}
            </p>
          </div>

          {/* Fee */}
          <p className="hidden whitespace-nowrap text-sm font-medium text-foreground sm:block">
            {formatCurrencyPaisas(visit.net_fee)}
          </p>

          {/* Status */}
          <StatusBadge status={visit.payment_status} />
        </div>
      ))}
    </div>
  )
}
