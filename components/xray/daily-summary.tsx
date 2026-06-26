'use client'

import Link from 'next/link'
import { CheckCircle2, Clock, XCircle, RefreshCw, CreditCard, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrencyPaisas, formatDate } from '@/lib/utils'
import { PartnerPayoutCard } from '@/components/xray/partner-payout-card'
import type { DailyRevenueData } from '@/app/actions/xray'

// =============================================================================
// Helpers
// =============================================================================

const PAYMENT_STATUS_META: Record<
  string,
  { label: string; Icon: React.ElementType; className: string }
> = {
  completed: {
    label: 'Completed',
    Icon: CheckCircle2,
    className: 'text-success bg-success/10',
  },
  pending: {
    label: 'Pending',
    Icon: Clock,
    className: 'text-warning bg-warning/10',
  },
  cancelled: {
    label: 'Cancelled',
    Icon: XCircle,
    className: 'text-destructive bg-destructive/10',
  },
  refunded: {
    label: 'Refunded',
    Icon: RefreshCw,
    className: 'text-muted-foreground bg-muted/30',
  },
}

function PaymentStatusBadge({ status }: { status: string }) {
  const meta = PAYMENT_STATUS_META[status] ?? {
    label: status,
    Icon: CreditCard,
    className: 'text-muted-foreground',
  }
  const Icon = meta.Icon

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.className}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {meta.label}
    </span>
  )
}

// =============================================================================
// Props
// =============================================================================

interface DailySummaryProps {
  data: DailyRevenueData
  /** If true, shows an "Add revenue" shortcut */
  showAddLink?: boolean
}

// =============================================================================
// Component
// =============================================================================

export function DailySummary({ data, showAddLink = false }: DailySummaryProps) {
  const { date, entries, total_gross, partner_payouts } = data
  const formattedDate = formatDate(date, 'EEEE, dd MMM yyyy')

  return (
    <div className="space-y-5">
      {/* ── Header stat ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
            X-Ray Revenue
          </p>
          <p className="mt-0.5 text-3xl font-bold text-foreground">
            {formatCurrencyPaisas(total_gross)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{formattedDate}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-border bg-card px-3 py-2 text-center">
            <p className="text-xl font-bold text-foreground">{entries.length}</p>
            <p className="text-[10px] text-muted-foreground">
              {entries.length === 1 ? 'Entry' : 'Entries'}
            </p>
          </div>
          {showAddLink && (
            <Link
              href="/xray/revenue/new"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Revenue
            </Link>
          )}
        </div>
      </div>

      {/* ── Revenue entries ─────────────────────────────────────────────────── */}
      {entries.length === 0 ? (
        <Card className="border-dashed border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-sm text-muted-foreground">No revenue recorded for this date.</p>
            {showAddLink && (
              <Link
                href="/xray/revenue/new"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Record X-Ray Revenue
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-border bg-card">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Revenue Entries
            </CardTitle>
          </CardHeader>
          <div className="divide-y divide-border">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {entry.notes ?? 'X-Ray Service'}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    {entry.payment_method && (
                      <span className="text-[11px] text-muted-foreground">
                        {{ cash: 'Cash', jazzcash: 'JazzCash', easypaisa: 'EasyPaisa', bank_transfer: 'Bank Transfer' }[entry.payment_method ?? ''] ?? entry.payment_method ?? '—'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-foreground">
                    {formatCurrencyPaisas(entry.amount_paisas)}
                  </p>
                  {entry.notes && (
                    <p className="mt-0.5 max-w-[140px] truncate text-[10px] text-muted-foreground">
                      {entry.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {/* Total footer */}
          <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-2.5">
            <span className="text-xs font-semibold text-muted-foreground">
              Total
            </span>
            <span className="text-sm font-bold text-primary">
              {formatCurrencyPaisas(total_gross)}
            </span>
          </div>
        </Card>
      )}

      {/* ── Partner payouts ─────────────────────────────────────────────────── */}
      {partner_payouts.length > 0 && total_gross > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Partner Payouts</h3>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {formatCurrencyPaisas(total_gross)} distributed
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {partner_payouts.map((payout, i) => (
              <PartnerPayoutCard
                key={payout.partner.id}
                payout={payout}
                totalRevenue={total_gross}
                rank={i + 1}
              />
            ))}
          </div>

          {/* Sanity: warn if splits don't total 100% */}
          {(() => {
            const totalBp = partner_payouts.reduce(
              (sum, p) => sum + p.partner.split_pct,
              0
            )
            if (totalBp !== 10000 && partner_payouts.length > 0) {
              return (
                <p className="text-xs text-warning">
                  Partner splits total {(totalBp / 100).toFixed(2)}% — configure
                  100% in Settings to ensure full distribution.
                </p>
              )
            }
            return null
          })()}
        </div>
      )}
    </div>
  )
}
