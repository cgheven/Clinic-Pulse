'use client'

import { formatCurrencyPaisas } from '@/lib/utils'
import type { DailyTrendPoint } from '@/app/actions/payments'

const METHODS = ['cash', 'jazzcash', 'easypaisa', 'bank_transfer'] as const
type Method = (typeof METHODS)[number]

const METHOD_COLORS: Record<Method, string> = {
  cash:          'bg-amber-500',
  jazzcash:      'bg-blue-500',
  easypaisa:     'bg-green-500',
  bank_transfer: 'bg-violet-400',
}

const METHOD_LABELS: Record<Method, string> = {
  cash:          'Cash',
  jazzcash:      'JazzCash',
  easypaisa:     'Easypaisa',
  bank_transfer: 'Bank Transfer',
}

function shortDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })
}

interface DailyTrendChartProps {
  data: DailyTrendPoint[]
}

export function DailyTrendChart({ data }: DailyTrendChartProps) {
  const hasData = data.some((d) => d.total > 0)
  const maxTotal = Math.max(...data.map((d) => d.total), 1)
  const visible = data.slice(-14)

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          30-Day Payment Trend
        </span>
        <div className="hidden items-center gap-3 sm:flex">
          {METHODS.map((m) => (
            <span key={m} className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full ${METHOD_COLORS[m]} opacity-70`} />
              <span className="text-[10px] text-muted-foreground">{METHOD_LABELS[m]}</span>
            </span>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-muted-foreground">No payment data in the last 30 days.</p>
        </div>
      ) : (
        <div className="divide-y divide-border/50 px-4 py-1">
          {visible.map((point) => {
            const barWidthPct = (point.total / maxTotal) * 100
            return (
              <div key={point.date} className="flex items-center gap-3 py-1.5">
                <span className="w-[52px] shrink-0 text-[11px] text-muted-foreground">
                  {shortDate(point.date)}
                </span>

                {/* Stacked bar */}
                <div className="flex min-w-0 flex-1 h-3.5 overflow-hidden rounded-sm bg-muted/30">
                  <div
                    className="flex h-full overflow-hidden rounded-sm transition-all duration-500"
                    style={{ width: `${barWidthPct}%` }}
                  >
                    {METHODS.map((m) => {
                      const pct =
                        point.total > 0 ? ((point[m] ?? 0) / point.total) * 100 : 0
                      return pct > 0 ? (
                        <div
                          key={m}
                          className={`h-full ${METHOD_COLORS[m]} opacity-70`}
                          style={{ width: `${pct}%` }}
                          title={`${METHOD_LABELS[m]}: ${formatCurrencyPaisas(point[m] ?? 0)}`}
                        />
                      ) : null
                    })}
                  </div>
                </div>

                <span className="w-[72px] shrink-0 text-right text-[11px] font-semibold tabular-nums text-foreground">
                  {formatCurrencyPaisas(point.total)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
