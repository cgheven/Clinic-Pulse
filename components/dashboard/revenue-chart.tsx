import type { DeptRevenue } from '@/app/actions/dashboard'
import { formatCurrencyPaisas } from '@/lib/utils'

const DEPT_COLORS: Record<string, string> = {
  OPD: 'bg-blue-500',
  Pharmacy: 'bg-emerald-500',
  Laboratory: 'bg-amber-500',
  'X-Ray': 'bg-violet-500',
}

const DEPT_TEXT: Record<string, string> = {
  OPD: 'text-blue-400',
  Pharmacy: 'text-emerald-400',
  Laboratory: 'text-amber-400',
  'X-Ray': 'text-violet-400',
}

interface RevenueBreakdownProps {
  data: DeptRevenue[]
}

export function RevenueBreakdown({ data }: RevenueBreakdownProps) {
  const max = Math.max(...data.map((d) => d.revenue), 1)
  const total = data.reduce((s, d) => s + d.revenue, 0)
  const hasData = total > 0

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border bg-muted/20 px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Revenue by Department
        </span>
      </div>

      {!hasData ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          No revenue recorded today.
        </p>
      ) : (
        <div className="divide-y divide-border/50">
          {data.map((d) => {
            const pct = (d.revenue / max) * 100
            const barColor = DEPT_COLORS[d.dept] ?? 'bg-primary'
            const textColor = DEPT_TEXT[d.dept] ?? 'text-primary'
            return (
              <div key={d.dept} className="flex items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
                <span className={`w-[62px] shrink-0 truncate text-[11px] font-semibold sm:w-[72px] ${textColor}`}>
                  {d.dept === 'Laboratory' ? 'Lab' : d.dept}
                </span>
                <div className="flex-1 overflow-hidden rounded-full bg-muted h-1.5">
                  <div
                    className={`h-full rounded-full ${barColor} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-[70px] shrink-0 text-right text-[12px] font-semibold tabular-nums text-foreground sm:w-[76px]">
                  {formatCurrencyPaisas(d.revenue)}
                </span>
              </div>
            )
          })}
          <div className="flex items-center justify-between bg-muted/20 px-4 py-2">
            <span className="text-[11px] font-semibold text-muted-foreground">Total</span>
            <span className="text-sm font-bold tabular-nums text-primary">
              {formatCurrencyPaisas(total)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
