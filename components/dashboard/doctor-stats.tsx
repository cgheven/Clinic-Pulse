import { Stethoscope } from 'lucide-react'
import type { DoctorStat } from '@/app/actions/dashboard'
import { formatCurrencyPaisas } from '@/lib/utils'

interface DoctorStatsPanelProps {
  data: DoctorStat[]
}

export function DoctorStatsPanel({ data }: DoctorStatsPanelProps) {
  if (data.length === 0) return null

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border bg-muted/20 px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Doctor Performance — Today
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 border-b border-border/50 px-4 py-1.5 sm:grid-cols-[1fr_80px_100px_110px]">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">Doctor</span>
        <span className="text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">Visits</span>
        <span className="hidden text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60 sm:block">Collected</span>
        <span className="text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">Earned</span>
      </div>

      <div className="divide-y divide-border/50">
        {data.map((d) => {
          const initials = d.doctor_name
            .split(' ')
            .slice(0, 2)
            .map((n) => n[0]?.toUpperCase() ?? '')
            .join('')

          const earnedLabel =
            d.earning_model === 'commission' && d.commission_pct
              ? formatCurrencyPaisas(d.earned)
              : d.earning_model === 'salaried'
                ? 'Salaried'
                : '—'

          const earnedColor =
            d.earning_model === 'commission' && d.earned > 0
              ? 'text-emerald-500'
              : 'text-muted-foreground'

          return (
            <div
              key={d.doctor_id ?? 'unassigned'}
              className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 px-4 py-2.5 hover:bg-muted/20 transition-colors sm:grid-cols-[1fr_80px_100px_110px]"
            >
              {/* Doctor name */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {d.doctor_id ? initials : <Stethoscope className="h-3.5 w-3.5" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-foreground">
                    {d.doctor_id ? `Dr. ${d.doctor_name}` : d.doctor_name}
                  </p>
                  {d.earning_model === 'commission' && d.commission_pct != null && (
                    <p className="text-[11px] text-muted-foreground">
                      {d.commission_pct}% commission
                    </p>
                  )}
                  {d.earning_model === 'salaried' && (
                    <p className="text-[11px] text-muted-foreground">Salaried</p>
                  )}
                </div>
              </div>

              {/* Visit count */}
              <p className="text-right text-[13px] font-semibold tabular-nums text-foreground">
                {d.visit_count}
              </p>

              {/* Collected (desktop only) */}
              <p className="hidden text-right text-[12px] tabular-nums text-muted-foreground sm:block">
                {formatCurrencyPaisas(d.collected)}
              </p>

              {/* Earned */}
              <p className={`text-right text-[13px] font-semibold tabular-nums ${earnedColor}`}>
                {earnedLabel}
              </p>
            </div>
          )
        })}
      </div>

      {/* Footer: totals */}
      {data.length > 1 && (
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 border-t border-border bg-muted/20 px-4 py-2 sm:grid-cols-[1fr_80px_100px_110px]">
          <span className="text-[11px] font-semibold text-muted-foreground">Total</span>
          <span className="text-right text-[12px] font-bold tabular-nums text-foreground">
            {data.reduce((s, d) => s + d.visit_count, 0)}
          </span>
          <span className="hidden text-right text-[12px] font-bold tabular-nums text-foreground sm:block">
            {formatCurrencyPaisas(data.reduce((s, d) => s + d.collected, 0))}
          </span>
          <span className="text-right text-[12px] font-bold tabular-nums text-emerald-500">
            {formatCurrencyPaisas(data.reduce((s, d) => s + d.earned, 0))}
          </span>
        </div>
      )}
    </div>
  )
}
