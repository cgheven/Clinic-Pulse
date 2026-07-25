import React from 'react'
import { Badge } from '@/components/ui/badge'
import { formatCurrencyPaisas, formatBasisPoints } from '@/lib/utils'
import { Scan, Users, TrendingDown, Building2 } from 'lucide-react'
import type { PartnerPayoutReport } from '@/app/actions/reports'

interface PartnerPayoutTableProps {
  data: PartnerPayoutReport
}

const SPLIT_COLORS = ['bg-primary', 'bg-info', 'bg-success', 'bg-warning', 'bg-destructive']

export function PartnerPayoutTable({ data }: PartnerPayoutTableProps) {
  const clinicPct =
    data.total_xray_revenue > 0
      ? ((data.clinic_share / data.total_xray_revenue) * 100).toFixed(1)
      : '0.0'

  return (
    <div className="space-y-4">
      {/* ── Stat chips ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Scan className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              X-Ray Revenue
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">
              {formatCurrencyPaisas(data.total_xray_revenue)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-info/10">
            <Users className="h-4 w-4 text-info" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Partners
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">{data.entries.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
            <TrendingDown className="h-4 w-4 text-destructive" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Total Payout
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">
              {formatCurrencyPaisas(data.total_payout)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-success/10">
            <Building2 className="h-4 w-4 text-success" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Clinic Share
            </p>
            <p className="text-sm font-bold tabular-nums text-success">
              {formatCurrencyPaisas(data.clinic_share)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Revenue split bar ───────────────────────────────────────────── */}
      {data.total_xray_revenue > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Revenue Split
            </span>
          </div>
          <div className="px-4 py-3 space-y-2">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
              {data.entries.map((e, i) => {
                const pct =
                  data.total_xray_revenue > 0
                    ? (e.payout_amount / data.total_xray_revenue) * 100
                    : 0
                return (
                  <div
                    key={e.partner_id}
                    className={`${SPLIT_COLORS[i % SPLIT_COLORS.length]} h-full transition-all`}
                    style={{ width: `${pct.toFixed(1)}%` }}
                    title={`${e.partner_name}: ${pct.toFixed(1)}%`}
                  />
                )
              })}
              <div
                className="h-full flex-1 bg-emerald-500/40"
                title={`Clinic: ${clinicPct}%`}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              {data.entries.map((e, i) => (
                <div key={e.partner_id} className="flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full ${SPLIT_COLORS[i % SPLIT_COLORS.length]}`} />
                  <span className="text-[11px] text-muted-foreground">
                    {e.partner_name} ({formatBasisPoints(e.split_pct)})
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500/40" />
                <span className="text-[11px] text-muted-foreground">Clinic ({clinicPct}%)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Panel table ─────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Section header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Partner Payout Detail
          </span>
        </div>

        {/* Column headers */}
        <div className="flex items-center border-b border-border/50 px-4 py-1.5">
          <span className="flex-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            Partner
          </span>
          <span className="hidden w-20 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground sm:block">
            Type
          </span>
          <span className="hidden w-20 shrink-0 text-right text-[10px] uppercase tracking-wide text-muted-foreground sm:block">
            Split %
          </span>
          <span className="w-32 shrink-0 text-right text-[10px] uppercase tracking-wide text-muted-foreground">
            Payout
          </span>
        </div>

        {/* Partner rows */}
        <div className="divide-y divide-border/50">
          {data.entries.map((e, i) => (
            <div
              key={e.partner_id}
              className="flex items-center px-4 py-2.5 hover:bg-muted/20 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className={`h-2 w-2 shrink-0 rounded-full ${SPLIT_COLORS[i % SPLIT_COLORS.length]}`} />
                  <p className="text-sm font-medium text-foreground truncate">{e.partner_name}</p>
                </div>
                {/* Mobile: show split % inline */}
                <p className="text-[11px] text-muted-foreground sm:hidden">
                  Split: {formatBasisPoints(e.split_pct)}
                </p>
              </div>
              <div className="hidden w-20 shrink-0 sm:block">
                <Badge
                  variant="secondary"
                  className="bg-secondary text-secondary-foreground text-[10px]"
                >
                  Partner
                </Badge>
              </div>
              <span className="hidden w-20 shrink-0 text-right text-[12px] text-muted-foreground sm:block">
                {formatBasisPoints(e.split_pct)}
              </span>
              <span className="w-32 shrink-0 text-right text-sm font-bold text-primary">
                {formatCurrencyPaisas(e.payout_amount)}
              </span>
            </div>
          ))}

          {/* Clinic share row */}
          <div className="flex items-center bg-success/5 px-4 py-2.5 hover:bg-success/10 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-500/40" />
                <p className="text-sm font-medium text-success">Clinic Share</p>
              </div>
              <p className="text-[11px] text-muted-foreground sm:hidden">{clinicPct}% retained</p>
            </div>
            <div className="hidden w-20 shrink-0 sm:block">
              <Badge
                variant="secondary"
                className="bg-success/10 text-success border-success/20 text-[10px]"
              >
                Retained
              </Badge>
            </div>
            <span className="hidden w-20 shrink-0 text-right text-[12px] text-muted-foreground sm:block">
              {clinicPct}%
            </span>
            <span className="w-32 shrink-0 text-right text-sm font-bold text-success">
              {formatCurrencyPaisas(data.clinic_share)}
            </span>
          </div>

          {data.entries.length === 0 && (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No partner payout data for this month.
              </p>
            </div>
          )}
        </div>

        {/* Grand total footer */}
        {data.entries.length > 0 && (
          <div className="flex items-center border-t border-border bg-muted/20 px-4 py-2">
            <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Grand Total
            </span>
            <span className="hidden w-20 shrink-0 sm:block" />
            <span className="hidden w-20 shrink-0 sm:block" />
            <span className="w-32 shrink-0 text-right text-sm font-bold text-foreground">
              {formatCurrencyPaisas(data.total_xray_revenue)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
