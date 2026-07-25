import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrencyPaisas } from '@/lib/utils'
import { TrendingUp, Pill, FlaskConical, Scan, CreditCard, Receipt } from 'lucide-react'
import type { DailyRevenueReport } from '@/app/actions/reports'

interface DailyRevenueTableProps {
  data: DailyRevenueReport
}

const DEPT_CONFIG = [
  { key: 'opd', label: 'OPD', icon: TrendingUp, color: 'text-info', bg: 'bg-info/10' },
  { key: 'pharmacy', label: 'Pharmacy', icon: Pill, color: 'text-success', bg: 'bg-success/10' },
  { key: 'lab', label: 'Laboratory', icon: FlaskConical, color: 'text-warning', bg: 'bg-warning/10' },
  { key: 'xray', label: 'X-Ray', icon: Scan, color: 'text-primary', bg: 'bg-primary/10' },
] as const

export function DailyRevenueTable({ data }: DailyRevenueTableProps) {
  // Collect all payment methods across all departments
  const allMethodNames = new Set<string>()
  const depts = [data.opd, data.pharmacy, data.lab, data.xray]
  for (const d of depts) {
    for (const b of d.payment_breakdown) {
      allMethodNames.add(b.method_name)
    }
  }
  const methodNames = Array.from(allMethodNames)

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {DEPT_CONFIG.map(({ key, label, icon: Icon, color, bg }) => {
          const dept = data[key as keyof Pick<DailyRevenueReport, 'opd' | 'pharmacy' | 'lab' | 'xray'>]
          const hasDue = (dept.due_total ?? 0) > 0
          return (
            <Card key={key} className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <div className={`rounded-lg p-1.5 ${bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                  </div>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrencyPaisas(dept.total)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{dept.count} transactions</p>
                {hasDue && (
                  <div className="mt-2 space-y-0.5 border-t border-border pt-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Collected</span>
                      <span className="font-medium text-foreground">
                        {formatCurrencyPaisas(dept.collected_total ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-amber-600 dark:text-amber-400">Due</span>
                      <span className="font-medium text-amber-600 dark:text-amber-400">
                        {formatCurrencyPaisas(dept.due_total ?? 0)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Grand total */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <p className="text-sm font-semibold text-foreground">Grand Total (All Departments)</p>
            </div>
            <p className="text-2xl font-bold text-primary">
              {formatCurrencyPaisas(data.grand_total)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Expenses + Net Revenue section */}
      {(data.expenses_total ?? 0) > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Expenses card */}
          <Card className="border-amber-200/60 bg-amber-50/40 dark:border-amber-800/30 dark:bg-amber-950/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  Daily Expenses
                </p>
                <Receipt className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-xl font-bold text-amber-800 dark:text-amber-300">
                {formatCurrencyPaisas(data.expenses_total)}
              </p>
              {data.expenses_breakdown.length > 0 && (
                <div className="mt-2 space-y-0.5 border-t border-amber-200/60 dark:border-amber-800/30 pt-2">
                  {data.expenses_breakdown.map((e) => (
                    <div key={e.head_name} className="flex justify-between text-xs">
                      <span className="text-amber-700/80 dark:text-amber-400/80">{e.head_name}</span>
                      <span className="font-medium text-amber-700 dark:text-amber-400">
                        {formatCurrencyPaisas(e.total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Net revenue card */}
          <Card className="border-emerald-200/60 bg-emerald-50/40 dark:border-emerald-800/30 dark:bg-emerald-950/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  Net Revenue
                </p>
                <CreditCard className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-xl font-bold text-emerald-800 dark:text-emerald-300">
                {formatCurrencyPaisas(data.grand_total - (data.expenses_total ?? 0))}
              </p>
              <p className="mt-0.5 text-xs text-emerald-600/80 dark:text-emerald-500">
                After deducting expenses
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Department × Payment Method Matrix */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">
            Revenue Matrix — Department × Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="py-3 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Department
                  </th>
                  {methodNames.map((m) => (
                    <th
                      key={m}
                      className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {m}
                    </th>
                  ))}
                  <th className="py-3 pl-3 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {DEPT_CONFIG.map(({ key, label }) => {
                  const dept = data[key as keyof Pick<DailyRevenueReport, 'opd' | 'pharmacy' | 'lab' | 'xray'>]
                  const methodAmounts = new Map<string, number>()
                  for (const b of dept.payment_breakdown) {
                    methodAmounts.set(b.method_name, b.amount)
                  }
                  return (
                    <tr key={key} className="hover:bg-muted/10 transition-colors">
                      <td className="py-3 pl-4 pr-3 font-medium text-foreground">{label}</td>
                      {methodNames.map((m) => (
                        <td key={m} className="px-3 py-3 text-right text-muted-foreground">
                          {methodAmounts.has(m)
                            ? formatCurrencyPaisas(methodAmounts.get(m)!)
                            : '—'}
                        </td>
                      ))}
                      <td className="py-3 pl-3 pr-4 text-right font-semibold text-foreground">
                        {formatCurrencyPaisas(dept.total)}
                      </td>
                    </tr>
                  )
                })}
                {/* Totals row */}
                <tr className="border-t-2 border-border bg-muted/10">
                  <td className="py-3 pl-4 pr-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Total
                  </td>
                  {methodNames.map((m) => {
                    const colTotal = data.payment_totals.find((p) => p.method_name === m)?.amount ?? 0
                    return (
                      <td key={m} className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground">
                        {colTotal > 0 ? formatCurrencyPaisas(colTotal) : '—'}
                      </td>
                    )
                  })}
                  <td className="py-3 pl-3 pr-4 text-right text-sm font-bold text-primary">
                    {formatCurrencyPaisas(data.grand_total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payment method breakdown */}
      {data.payment_totals.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">
              Payment Method Breakdown (All Departments)
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
                  {data.payment_totals.map((p) => (
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
    </div>
  )
}
