import Link from 'next/link'
import { ArrowRight, AlertTriangle } from 'lucide-react'
import type { RecentVisit } from '@/app/actions/dashboard'
import { formatCurrencyPaisas } from '@/lib/utils'

interface RecentVisitsPanelProps {
  data: RecentVisit[]
}

export function RecentVisitsPanel({ data }: RecentVisitsPanelProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recent OPD Visits
        </span>
        <Link
          href="/opd/visits"
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
        >
          All visits
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {data.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          No visits recorded today.
        </p>
      ) : (
        <div className="divide-y divide-border/50">
          {data.map((visit) => {
            const isDue = (visit as { payment_status?: string }).payment_status === 'due'
            const initials = visit.patient_name
              .split(' ')
              .slice(0, 2)
              .map((n) => n[0]?.toUpperCase() ?? '')
              .join('')
            return (
              <div key={visit.id} className={`flex items-center gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 ${isDue ? 'bg-amber-500/5' : 'hover:bg-muted/20'} transition-colors`}>
                {/* Avatar */}
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {initials}
                </div>
                {/* Name + doctor */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-foreground">
                    {visit.patient_name}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {visit.doctor_name ? `Dr. ${visit.doctor_name}` : '—'}
                  </p>
                </div>
                {/* Amount + due */}
                <div className="shrink-0 text-right">
                  <p className={`whitespace-nowrap text-[13px] font-bold tabular-nums ${isDue ? 'text-amber-600' : 'text-foreground'}`}>
                    {formatCurrencyPaisas(visit.fee_paisas)}
                  </p>
                  {isDue && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Due
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
