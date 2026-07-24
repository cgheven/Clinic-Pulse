import { Banknote, Smartphone, Building2, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { PaymentTotal } from '@/app/actions/dashboard'
import { formatCurrencyPaisas } from '@/lib/utils'

const SLUG_META: Record<string, { icon: LucideIcon; color: string; bar: string }> = {
  cash: { icon: Banknote, color: 'text-emerald-400', bar: 'bg-emerald-500' },
  jazzcash: { icon: Smartphone, color: 'text-red-400', bar: 'bg-red-500' },
  easypaisa: { icon: Smartphone, color: 'text-emerald-300', bar: 'bg-emerald-400' },
  bank_transfer: { icon: Building2, color: 'text-blue-400', bar: 'bg-blue-500' },
}

function getMeta(slug: string) {
  return SLUG_META[slug] ?? { icon: Wallet, color: 'text-primary', bar: 'bg-primary' }
}

interface PaymentBreakdownProps {
  data: PaymentTotal[]
}

export function PaymentBreakdown({ data }: PaymentBreakdownProps) {
  const max = Math.max(...data.map((d) => d.total), 1)
  const active = data.filter((d) => d.total > 0)

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border bg-muted/20 px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Payment Methods
        </span>
      </div>

      {active.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          No payments recorded today.
        </p>
      ) : (
        <div className="divide-y divide-border/50">
          {data.map((d) => {
            const { icon: Icon, color, bar } = getMeta(d.method)
            const pct = (d.total / max) * 100
            return (
              <div key={d.method} className="flex items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
                <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
                <span className="w-[72px] shrink-0 text-[11px] font-medium text-muted-foreground truncate sm:w-[80px]">
                  {d.label}
                </span>
                <div className="flex-1 overflow-hidden rounded-full bg-muted h-1.5">
                  <div
                    className={`h-full rounded-full ${bar} transition-all duration-500`}
                    style={{ width: d.total > 0 ? `${pct}%` : '0%' }}
                  />
                </div>
                <span
                  className={`shrink-0 text-right text-[12px] font-semibold tabular-nums w-[70px] sm:w-[76px] ${
                    d.total > 0 ? 'text-foreground' : 'text-muted-foreground/40'
                  }`}
                >
                  {d.total > 0 ? formatCurrencyPaisas(d.total) : '—'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
