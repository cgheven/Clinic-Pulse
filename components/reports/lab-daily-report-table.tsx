'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

export function LabDailyReportTable({ data }: LabDailyReportTableProps) {
  return (
    <div className="space-y-6">
      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Total Tests</p>
              <div className="rounded-lg p-1.5 bg-info/10">
                <FlaskConical className="h-3.5 w-3.5 text-info" />
              </div>
            </div>
            <p className="text-xl font-bold text-foreground">{data.total_tests}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Tests performed</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Gross Revenue</p>
              <div className="rounded-lg p-1.5 bg-success/10">
                <DollarSign className="h-3.5 w-3.5 text-success" />
              </div>
            </div>
            <p className="text-xl font-bold text-foreground">
              {formatCurrencyPaisas(data.total_revenue)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Before discounts</p>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Net Revenue</p>
              <div className="rounded-lg p-1.5 bg-primary/10">
                <CreditCard className="h-3.5 w-3.5 text-primary" />
              </div>
            </div>
            <p className="text-xl font-bold text-primary">
              {formatCurrencyPaisas(data.net_revenue)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Collected</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Payment method breakdown ─────────────────────────────────────── */}
      {data.payment_breakdown.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">
              Payment Method Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="py-2.5 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Payment Method
                    </th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Transactions
                    </th>
                    <th className="py-2.5 pl-3 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.payment_breakdown.map((p) => (
                    <tr key={p.method_name} className="hover:bg-muted/10 transition-colors">
                      <td className="py-2.5 pl-4 pr-3 font-medium text-foreground">
                        {p.method_name}
                      </td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{p.count}</td>
                      <td className="py-2.5 pl-3 pr-4 text-right font-semibold text-foreground">
                        {formatCurrencyPaisas(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Test log detail ──────────────────────────────────────────────── */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">
            Test Log Detail
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="py-3 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Test
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Patient
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Result
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Price
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Payment
                  </th>
                  <th className="py-3 pl-3 pr-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.entries.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3 pl-4 pr-3">
                      <p className="font-medium text-foreground">
                        {e.test?.name ?? '—'}
                      </p>
                      {e.test?.test_code && (
                        <p className="text-xs text-muted-foreground">{e.test.test_code}</p>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {e.patient ? (
                        <>
                          <p className="font-medium text-foreground">{e.patient.name}</p>
                          <p className="text-xs text-muted-foreground">{e.patient.patient_no}</p>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Walk-in</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {e.result ? (
                        <span className="text-foreground">{e.result}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <p className="font-medium text-foreground">
                        {formatCurrencyPaisas(e.price_paisas)}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {({ cash: 'Cash', jazzcash: 'JazzCash', easypaisa: 'EasyPaisa', bank_transfer: 'Bank Transfer' } as Record<string, string>)[e.payment_method ?? ''] ?? e.payment_method ?? '—'}
                    </td>
                    <td className="py-3 pl-3 pr-4">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${(STATUS_STYLES as Record<string, string>)[e.payment_status ?? ''] ?? 'bg-secondary text-secondary-foreground'}`}
                      >
                        {e.payment_status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {data.entries.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No lab tests recorded for this date.
                    </td>
                  </tr>
                )}
              </tbody>
              {data.entries.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/10">
                    <td
                      colSpan={3}
                      className="py-3 pl-4 pr-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Total ({data.total_tests} tests)
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-bold text-primary">
                      {formatCurrencyPaisas(data.net_revenue)}
                    </td>
                    <td colSpan={2} className="py-3 pl-3 pr-4" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
