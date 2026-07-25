'use client'

import React from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrencyPaisas, formatDate } from '@/lib/utils'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FlaskConical,
  Plus,
  TrendingUp,
} from 'lucide-react'
import type { DailyTestLogResult } from '@/app/actions/lab'

// =============================================================================
// Props
// =============================================================================

interface TestLogTableProps {
  result: DailyTestLogResult
  date: string
  showAddButton?: boolean
}

// =============================================================================
// Status badge helper
// =============================================================================

function StatusBadge({
  status,
}: {
  status: 'pending' | 'completed' | 'cancelled' | 'refunded'
}) {
  const map = {
    completed: {
      label: 'Completed',
      className: 'bg-success/15 text-success',
      icon: CheckCircle2,
    },
    pending: {
      label: 'Pending',
      className: 'bg-warning/15 text-warning',
      icon: Clock,
    },
    cancelled: {
      label: 'Cancelled',
      className: 'bg-destructive/15 text-destructive',
      icon: AlertCircle,
    },
    refunded: {
      label: 'Refunded',
      className: 'bg-muted text-muted-foreground',
      icon: AlertCircle,
    },
  } as const

  const cfg = map[status] ?? map.pending
  const Icon = cfg.icon

  return (
    <Badge
      variant="secondary"
      className={cn('flex items-center gap-1 text-[10px] font-medium', cfg.className)}
    >
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </Badge>
  )
}

// =============================================================================
// Stat chips summary
// =============================================================================

function SummaryChips({ result }: { result: DailyTestLogResult }) {
  const chips = [
    {
      label: 'Total Tests',
      value: result.totalTests.toString(),
      icon: FlaskConical,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      label: 'Revenue',
      value: formatCurrencyPaisas(result.totalRevenue),
      icon: TrendingUp,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
    },
    {
      label: 'Completed',
      value: result.completedCount.toString(),
      icon: CheckCircle2,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
    },
    {
      label: 'Pending',
      value: result.pendingCount.toString(),
      icon: Clock,
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {chips.map((c) => {
        const Icon = c.icon
        return (
          <div
            key={c.label}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5"
          >
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${c.iconBg}`}
            >
              <Icon className={`h-4 w-4 ${c.iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60 mb-0.5 leading-none">
                {c.label}
              </p>
              <p className="text-sm font-bold tabular-nums text-foreground leading-tight">
                {c.value}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// =============================================================================
// TestLogTable
// =============================================================================

export function TestLogTable({ result, date, showAddButton = true }: TestLogTableProps) {
  const { entries } = result

  return (
    <div className="space-y-3">
      <SummaryChips result={result} />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Test Log — {formatDate(date)}
          </span>
          {showAddButton && (
            <Link
              href="/lab/tests/new"
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
            >
              <Plus className="h-3 w-3" />
              Record Test
            </Link>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
            <FlaskConical className="h-7 w-7 opacity-30" />
            <p className="text-sm">No tests recorded for this date</p>
            {showAddButton && (
              <Link href="/lab/tests/new" className="text-xs text-primary hover:underline">
                Record the first test
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="py-1.5 pl-4 pr-3 text-left text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Test
                  </th>
                  <th className="px-3 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Patient
                  </th>
                  <th className="px-3 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                    Result
                  </th>
                  <th className="px-3 py-1.5 text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-3 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                    Payment
                  </th>
                  <th className="py-1.5 pl-3 pr-4 text-left text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="transition-colors hover:bg-muted/20"
                  >
                    {/* Test name */}
                    <td className="py-2.5 pl-4 pr-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {entry.test?.name ?? '—'}
                        </p>
                        {entry.test?.category && (
                          <p className="text-[10px] text-muted-foreground">
                            {entry.test.category}
                          </p>
                        )}
                        {/* Mobile: show patient inline */}
                        <p className="text-[10px] text-muted-foreground sm:hidden">
                          {entry.patient?.name ?? 'Walk-in'}
                        </p>
                      </div>
                    </td>

                    {/* Patient */}
                    <td className="px-3 py-2.5 hidden sm:table-cell">
                      {entry.patient ? (
                        <div>
                          <p className="text-sm text-foreground">{entry.patient.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {entry.patient.patient_no}
                          </p>
                        </div>
                      ) : (
                        <span className="text-[12px] text-muted-foreground">Walk-in</span>
                      )}
                    </td>

                    {/* Result */}
                    <td className="px-3 py-2.5 hidden sm:table-cell">
                      {entry.result ? (
                        <span className="text-sm font-medium text-foreground">
                          {entry.result}
                        </span>
                      ) : (
                        <span className="text-[12px] text-muted-foreground">Pending</span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-sm font-medium text-foreground">
                        {formatCurrencyPaisas(entry.price_paisas)}
                      </span>
                    </td>

                    {/* Payment method */}
                    <td className="px-3 py-2.5 hidden sm:table-cell">
                      <span className="text-[12px] text-foreground">
                        {(
                          {
                            cash: 'Cash',
                            jazzcash: 'JazzCash',
                            easypaisa: 'EasyPaisa',
                            bank_transfer: 'Bank Transfer',
                          } as Record<string, string>
                        )[entry.payment_method ?? ''] ??
                          entry.payment_method ??
                          '—'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 pl-3 pr-4">
                      <StatusBadge status={entry.payment_status ?? 'pending'} />
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Footer totals */}
              {entries.length > 0 && (
                <tfoot>
                  <tr className="border-t border-border bg-muted/20">
                    <td
                      colSpan={3}
                      className="py-2.5 pl-4 pr-3 text-[11px] font-semibold text-muted-foreground"
                    >
                      Total ({entries.length} test{entries.length !== 1 ? 's' : ''})
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm font-bold text-primary">
                      {formatCurrencyPaisas(result.totalRevenue)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
