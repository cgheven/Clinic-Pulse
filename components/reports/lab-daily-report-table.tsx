'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { formatCurrencyPaisas } from '@/lib/utils'
import { FlaskConical, DollarSign, CreditCard } from 'lucide-react'
import type { LabDailyReport } from '@/app/actions/reports'

interface LabDailyReportTableProps {
  data: LabDailyReport
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-success/10 text-success border-success/20',
  pending: 'bg-warning/10 text-warning border-warning/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  refunded: 'bg-info/10 text-info border-info/20',
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  jazzcash: 'JazzCash',
  easypaisa: 'EasyPaisa',
  bank_transfer: 'Bank Transfer',
}

export function LabDailyReportTable({ data }: LabDailyReportTableProps) {
  return (
    <div className="space-y-4">
      {/* ── Stat chips ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-info/10">
            <FlaskConical className="h-4 w-4 text-info" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Total Tests
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">{data.total_tests}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-success/10">
            <DollarSign className="h-4 w-4 text-success" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Gross Revenue
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">
              {formatCurrencyPaisas(data.total_revenue)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <CreditCard className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Net Revenue
            </p>
            <p className="text-sm font-bold tabular-nums text-primary">
              {formatCurrencyPaisas(data.net_revenue)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Payment method breakdown ─────────────────────────────────── */}
      {data.payment_breakdown.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Payment Method Breakdown
            </span>
          </div>

          <div className="flex items-center border-b border-border/50 px-4 py-1.5">
            <span className="flex-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              Method
            </span>
            <span className="hidden w-24 shrink-0 text-right text-[10px] uppercase tracking-wide text-muted-foreground sm:block">
              Transactions
            </span>
            <span className="w-32 shrink-0 text-right text-[10px] uppercase tracking-wide text-muted-foreground">
              Amount
            </span>
          </div>

          <div className="divide-y divide-border/50">
            {data.payment_breakdown.map((p) => (
              <div
                key={p.method_name}
                className="flex items-center px-4 py-2.5 hover:bg-muted/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{p.method_name}</p>
                  <p className="text-[11px] text-muted-foreground sm:hidden">
                    {p.count} transaction{p.count !== 1 ? 's' : ''}
                  </p>
                </div>
                <span className="hidden w-24 shrink-0 text-right text-[12px] text-muted-foreground sm:block">
                  {p.count}
                </span>
                <span className="w-32 shrink-0 text-right text-[12px] font-semibold text-foreground">
                  {formatCurrencyPaisas(p.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Test log detail ──────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Test Log Detail
          </span>
          <span className="text-[11px] text-muted-foreground">
            {data.total_tests} test{data.total_tests !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Column headers */}
        <div className="flex items-center border-b border-border/50 px-4 py-1.5">
          <span className="flex-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            Test
          </span>
          <span className="hidden w-32 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground sm:block">
            Patient
          </span>
          <span className="hidden w-24 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground sm:block">
            Result
          </span>
          <span className="hidden w-24 shrink-0 text-right text-[10px] uppercase tracking-wide text-muted-foreground sm:block">
            Price
          </span>
          <span className="hidden w-24 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground sm:block">
            Payment
          </span>
          <span className="w-24 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
            Status
          </span>
        </div>

        {/* Data rows */}
        <div className="divide-y divide-border/50">
          {data.entries.map((e) => (
            <div
              key={e.id}
              className="flex items-center px-4 py-2.5 hover:bg-muted/20 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {e.test?.name ?? '—'}
                </p>
                {/* Mobile sub-label */}
                <p className="text-[11px] text-muted-foreground sm:hidden">
                  {e.patient ? e.patient.name : 'Walk-in'}
                  {' · '}
                  {formatCurrencyPaisas(e.price_paisas)}
                </p>
                {e.test?.test_code && (
                  <p className="hidden text-[11px] text-muted-foreground sm:block">
                    {e.test.test_code}
                  </p>
                )}
              </div>

              <div className="hidden w-32 shrink-0 sm:block">
                {e.patient ? (
                  <>
                    <p className="text-[12px] font-medium text-foreground truncate">
                      {e.patient.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{e.patient.patient_no}</p>
                  </>
                ) : (
                  <span className="text-[12px] text-muted-foreground">Walk-in</span>
                )}
              </div>

              <span className="hidden w-24 shrink-0 text-[12px] text-muted-foreground sm:block truncate">
                {e.result ?? '—'}
              </span>

              <span className="hidden w-24 shrink-0 text-right text-[12px] font-medium text-foreground sm:block">
                {formatCurrencyPaisas(e.price_paisas)}
              </span>

              <span className="hidden w-24 shrink-0 text-[12px] text-muted-foreground sm:block truncate">
                {PAYMENT_LABELS[e.payment_method ?? ''] ?? e.payment_method ?? '—'}
              </span>

              <div className="w-24 shrink-0">
                <Badge
                  variant="secondary"
                  className={`text-[10px] ${STATUS_STYLES[e.payment_status ?? ''] ?? 'bg-secondary text-secondary-foreground'}`}
                >
                  {e.payment_status}
                </Badge>
              </div>
            </div>
          ))}

          {data.entries.length === 0 && (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No lab tests recorded for this date.
              </p>
            </div>
          )}
        </div>

        {/* Footer totals */}
        {data.entries.length > 0 && (
          <div className="flex items-center border-t border-border bg-muted/20 px-4 py-2">
            <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total ({data.total_tests} tests)
            </span>
            <span className="hidden w-32 shrink-0 sm:block" />
            <span className="hidden w-24 shrink-0 sm:block" />
            <span className="hidden w-24 shrink-0 text-right text-sm font-bold text-primary sm:block">
              {formatCurrencyPaisas(data.net_revenue)}
            </span>
            <span className="hidden w-24 shrink-0 sm:block" />
            <span className="w-24 shrink-0 text-right text-sm font-bold text-primary sm:hidden">
              {formatCurrencyPaisas(data.net_revenue)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
