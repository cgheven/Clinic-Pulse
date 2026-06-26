'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrencyPaisas } from '@/lib/utils'
import { Receipt, TrendingDown } from 'lucide-react'
import type { ExpenseReport } from '@/app/actions/reports'

interface ExpenseSummaryChartProps {
  data: ExpenseReport
}

const BAR_COLORS = [
  '#f59e0b', // amber (primary)
  '#3b82f6', // blue (info)
  '#22c55e', // green (success)
  '#ef4444', // red (destructive)
  '#8b5cf6', // purple
  '#f97316', // orange
  '#06b6d4', // cyan
]

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number; name: string }>
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-bold text-foreground">
        Rs. {payload[0]?.value?.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
      </p>
    </div>
  )
}

export function ExpenseSummaryChart({ data }: ExpenseSummaryChartProps) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Total Expenses</p>
              <div className="rounded-lg p-1.5 bg-destructive/10">
                <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrencyPaisas(data.grand_total)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Across {data.by_department.length} department{data.by_department.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Largest Expense Dept</p>
              <div className="rounded-lg p-1.5 bg-warning/10">
                <Receipt className="h-3.5 w-3.5 text-warning" />
              </div>
            </div>
            {data.by_department[0] ? (
              <>
                <p className="text-xl font-bold text-foreground">
                  {data.by_department[0].dept_name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatCurrencyPaisas(data.by_department[0].total_amount)}
                </p>
              </>
            ) : (
              <p className="text-xl font-bold text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bar chart */}
      {data.chart_data.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">
              Expenses by Department (PKR)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={data.chart_data}
                margin={{ top: 4, right: 12, left: 12, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  {data.chart_data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Department breakdown table */}
      {data.by_department.map((dept) => (
        <Card key={dept.department ?? dept.dept_name} className="border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">
                {dept.dept_name}
              </CardTitle>
              <p className="text-sm font-bold text-primary">
                {formatCurrencyPaisas(dept.total_amount)}
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="py-2.5 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Expense Head
                    </th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Items
                    </th>
                    <th className="py-2.5 pl-3 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {dept.by_head.map((h, i) => (
                    <tr key={`${h.head_name}-${i}`} className="hover:bg-muted/10 transition-colors">
                      <td className="py-2.5 pl-4 pr-3 text-foreground">{h.head_name}</td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">{h.item_count}</td>
                      <td className="py-2.5 pl-3 pr-4 text-right font-medium text-foreground">
                        {formatCurrencyPaisas(h.total_amount)}
                      </td>
                    </tr>
                  ))}
                  {dept.by_head.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-xs text-muted-foreground">
                        No expenses recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
                {dept.by_head.length > 1 && (
                  <tfoot>
                    <tr className="border-t border-border bg-muted/10">
                      <td colSpan={2} className="py-2.5 pl-4 pr-3 text-xs font-semibold text-muted-foreground">
                        Subtotal
                      </td>
                      <td className="py-2.5 pl-3 pr-4 text-right text-xs font-bold text-foreground">
                        {formatCurrencyPaisas(dept.total_amount)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>
      ))}

      {data.by_department.length === 0 && (
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No expense records found for this period.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
