'use client'

import React from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
// Summary cards
// =============================================================================

function SummaryCards({ result }: { result: DailyTestLogResult }) {
  const cards = [
    {
      label: 'Total Tests',
      value: result.totalTests.toString(),
      icon: FlaskConical,
      bg: 'bg-primary/10',
      color: 'text-primary',
    },
    {
      label: 'Revenue',
      value: formatCurrencyPaisas(result.totalRevenue),
      icon: TrendingUp,
      bg: 'bg-success/10',
      color: 'text-success',
    },
    {
      label: 'Completed',
      value: result.completedCount.toString(),
      icon: CheckCircle2,
      bg: 'bg-success/10',
      color: 'text-success',
    },
    {
      label: 'Pending',
      value: result.pendingCount.toString(),
      icon: Clock,
      bg: 'bg-warning/10',
      color: 'text-warning',
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon
        return (
          <Card key={c.label} className="border-border bg-card">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn('rounded-lg p-2', c.bg)}>
                <Icon className={cn('h-4 w-4', c.color)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-lg font-bold text-foreground">{c.value}</p>
              </div>
            </CardContent>
          </Card>
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
    <div className="space-y-4">
      <SummaryCards result={result} />

      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">
            Test Log — {formatDate(date)}
          </CardTitle>
          {showAddButton && (
            <Link
              href="/lab/tests/new"
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Record Test
            </Link>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <FlaskConical className="h-8 w-8 opacity-30" />
              <p className="text-sm">No tests recorded for this date</p>
              {showAddButton && (
                <Link
                  href="/lab/tests/new"
                  className="mt-1 text-xs text-primary hover:underline"
                >
                  Record the first test
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="py-2.5 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Test
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Patient
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Result
                    </th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Amount
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Payment
                    </th>
                    <th className="py-2.5 pl-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="transition-colors hover:bg-muted/10"
                    >
                      {/* Test name */}
                      <td className="py-3 pl-4 pr-3">
                        <div>
                          <p className="font-medium text-foreground">
                            {entry.test?.name ?? '—'}
                          </p>
                          {entry.test?.category && (
                            <p className="text-[10px] text-muted-foreground">
                              {entry.test.category}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Patient */}
                      <td className="px-3 py-3">
                        {entry.patient ? (
                          <div>
                            <p className="text-sm text-foreground">
                              {entry.patient.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {entry.patient.patient_no}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Walk-in</span>
                        )}
                      </td>

                      {/* Result */}
                      <td className="px-3 py-3">
                        {entry.result ? (
                          <span className="text-sm font-medium text-foreground">
                            {entry.result}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Pending</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-3 py-3 text-right">
                        <span className="font-medium text-foreground">
                          {formatCurrencyPaisas(entry.price_paisas)}
                        </span>
                      </td>

                      {/* Payment method */}
                      <td className="px-3 py-3">
                        <span className="text-sm text-foreground">
                          {({ cash: 'Cash', jazzcash: 'JazzCash', easypaisa: 'EasyPaisa', bank_transfer: 'Bank Transfer' } as Record<string, string>)[entry.payment_method ?? ''] ?? entry.payment_method ?? '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 pl-3 pr-4">
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
                        className="py-2.5 pl-4 pr-3 text-xs font-semibold text-muted-foreground"
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
        </CardContent>
      </Card>
    </div>
  )
}
