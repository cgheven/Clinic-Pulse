import Link from 'next/link'
import { AlertTriangle, Plus, TrendingUp, Wallet, Clock, FileText } from 'lucide-react'
import { formatCurrencyPaisas } from '@/lib/utils'
import type { DailyRevenueData } from '@/app/actions/xray'

// =============================================================================
// Helpers
// =============================================================================

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  jazzcash: 'JazzCash',
  easypaisa: 'EasyPaisa',
  bank_transfer: 'Bank',
}

// =============================================================================
// Props
// =============================================================================

interface DailySummaryProps {
  data: DailyRevenueData
  showAddLink?: boolean
}

// =============================================================================
// Component
// =============================================================================

export function DailySummary({ data, showAddLink = false }: DailySummaryProps) {
  const { entries, total_gross, total_due, partner_payouts } = data
  const safeDue = total_due ?? 0
  const totalCollected = total_gross - safeDue
  const dueEntries = entries.filter((e) => e.payment_status === 'due')

  return (
    <div className="space-y-3">
      {/* ── Stats strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatChip
          icon={TrendingUp}
          label="Total"
          value={formatCurrencyPaisas(total_gross)}
          color="text-foreground"
        />
        <StatChip
          icon={Wallet}
          label="Collected"
          value={formatCurrencyPaisas(totalCollected)}
          color="text-emerald-500"
        />
        <StatChip
          icon={Clock}
          label={dueEntries.length > 0 ? `Due (${dueEntries.length})` : 'Due'}
          value={safeDue > 0 ? formatCurrencyPaisas(safeDue) : '—'}
          color={safeDue > 0 ? 'text-amber-500' : 'text-muted-foreground'}
        />
        <StatChip
          icon={FileText}
          label="Entries"
          value={entries.length === 0 ? '—' : String(entries.length)}
          color="text-foreground"
        />
      </div>

      {/* ── Revenue entries ─────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Table header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Revenue Entries
          </span>
          {showAddLink && (
            <Link
              href="/xray/revenue/new"
              className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add
            </Link>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <p className="text-sm text-muted-foreground">No revenue recorded for this date.</p>
            {showAddLink && (
              <Link
                href="/xray/revenue/new"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Record X-Ray Revenue
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Column labels */}
            <div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_120px_100px_90px] gap-x-3 border-b border-border/50 px-4 py-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">Service</span>
              <span className="hidden sm:block text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">Patient</span>
              <span className="hidden sm:block text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">Payment</span>
              <span className="text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">Amount</span>
            </div>

            {/* Entry rows */}
            <div className="divide-y divide-border/50">
              {entries.map((entry) => {
                const isDue = entry.payment_status === 'due'
                return (
                  <div
                    key={entry.id}
                    className={`grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_120px_100px_90px] items-center gap-x-3 px-4 py-2.5 ${isDue ? 'bg-amber-500/5' : 'hover:bg-muted/20'} transition-colors`}
                  >
                    {/* Service + patient (mobile: stacked) */}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {entry.service_type ?? 'X-Ray Service'}
                      </p>
                      {entry.patient_name && (
                        <p className="truncate text-[11px] text-muted-foreground sm:hidden">
                          {entry.patient_name}
                        </p>
                      )}
                    </div>

                    {/* Patient (desktop) */}
                    <p className="hidden sm:block truncate text-[12px] text-muted-foreground">
                      {entry.patient_name ?? '—'}
                    </p>

                    {/* Payment method / due badge (desktop) */}
                    <div className="hidden sm:flex items-center">
                      {isDue ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Due
                        </span>
                      ) : (
                        <span className="text-[12px] text-muted-foreground">
                          {entry.payment_method
                            ? (PAYMENT_LABELS[entry.payment_method] ?? entry.payment_method)
                            : '—'}
                        </span>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <p
                        className={`text-sm font-bold tabular-nums ${
                          isDue ? 'text-amber-600' : 'text-foreground'
                        }`}
                      >
                        {formatCurrencyPaisas(entry.amount_paisas)}
                      </p>
                      {/* Mobile: due badge inline */}
                      {isDue && (
                        <span className="sm:hidden inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Due
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer totals */}
            <div className="border-t border-border bg-muted/20 px-4 py-2.5">
              {safeDue > 0 ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Collected</span>
                    <span className="tabular-nums font-medium text-foreground">
                      {formatCurrencyPaisas(totalCollected)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-600">Due</span>
                    <span className="tabular-nums font-medium text-amber-600">
                      {formatCurrencyPaisas(safeDue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border/50 pt-1 text-sm">
                    <span className="font-semibold text-muted-foreground">Total</span>
                    <span className="tabular-nums font-bold text-primary">
                      {formatCurrencyPaisas(total_gross)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-muted-foreground">Total</span>
                  <span className="tabular-nums font-bold text-primary">
                    {formatCurrencyPaisas(total_gross)}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Partner payouts ─────────────────────────────────────────────────── */}
      {partner_payouts.length > 0 && total_gross > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-4 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Partner Payouts
            </span>
            <span className="text-[11px] text-muted-foreground">
              · based on{' '}
              <span className="font-medium text-foreground">
                {formatCurrencyPaisas(totalCollected)}
              </span>{' '}
              collected
            </span>
            {safeDue > 0 && (
              <span className="ml-auto rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                {formatCurrencyPaisas(safeDue)} pending
              </span>
            )}
          </div>

          <div className="divide-y divide-border/50">
            {partner_payouts.map((p, i) => {
              const barPct = totalCollected > 0
                ? Math.min(100, (p.payout_amount / totalCollected) * 100)
                : 0
              return (
                <div key={p.partner.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{p.partner.name}</p>
                    {p.partner.phone && (
                      <p className="text-[11px] text-muted-foreground">{p.partner.phone}</p>
                    )}
                    {/* Progress bar */}
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/70 transition-all duration-500"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold tabular-nums text-primary">
                      {formatCurrencyPaisas(p.payout_amount)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {p.partner.split_pct.toFixed(0)}% share
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Split validity warning */}
          {(() => {
            const totalPct = partner_payouts.reduce((sum, p) => sum + p.partner.split_pct, 0)
            if (Math.round(totalPct) !== 100 && partner_payouts.length > 0) {
              return (
                <div className="border-t border-border bg-warning/5 px-4 py-2">
                  <p className="text-xs text-warning">
                    Partner splits total {totalPct.toFixed(2)}% — configure 100% in Settings.
                  </p>
                </div>
              )
            }
            return null
          })()}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// StatChip
// =============================================================================

function StatChip({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  color: string
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
      <Icon className={`h-4 w-4 shrink-0 ${color}`} />
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
          {label}
        </p>
        <p className={`text-sm font-bold tabular-nums ${color}`}>{value}</p>
      </div>
    </div>
  )
}
