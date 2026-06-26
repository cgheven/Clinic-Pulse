'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrencyPaisas } from '@/lib/utils'
import { Users, DollarSign, Briefcase } from 'lucide-react'
import type { PayrollReport } from '@/app/actions/reports'

interface PayrollTableProps {
  data: PayrollReport
}

export function PayrollTable({ data }: PayrollTableProps) {
  // Group by department for sub-headers
  const byDept = new Map<string, typeof data.entries>()
  for (const e of data.entries) {
    const key = e.department ?? 'Unassigned'
    if (!byDept.has(key)) byDept.set(key, [])
    byDept.get(key)!.push(e)
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Total Staff</p>
              <div className="rounded-lg p-1.5 bg-info/10">
                <Users className="h-3.5 w-3.5 text-info" />
              </div>
            </div>
            <p className="text-xl font-bold text-foreground">{data.entries.length}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Active employees</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Base Payroll</p>
              <div className="rounded-lg p-1.5 bg-warning/10">
                <Briefcase className="h-3.5 w-3.5 text-warning" />
              </div>
            </div>
            <p className="text-xl font-bold text-foreground">
              {formatCurrencyPaisas(data.total_base)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Sum of monthly salaries</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Total Deductions</p>
              <div className="rounded-lg p-1.5 bg-destructive/10">
                <DollarSign className="h-3.5 w-3.5 text-destructive" />
              </div>
            </div>
            <p className="text-xl font-bold text-foreground">
              {formatCurrencyPaisas(data.total_deductions)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Deductions applied</p>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Net Payroll</p>
              <div className="rounded-lg p-1.5 bg-primary/10">
                <DollarSign className="h-3.5 w-3.5 text-primary" />
              </div>
            </div>
            <p className="text-xl font-bold text-primary">
              {formatCurrencyPaisas(data.total_net)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Working days: {data.working_days_config}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payroll table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">
            Payroll Detail
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="py-3 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Employee
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Department
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Base Salary
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Present / WD
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Earned
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Deductions
                  </th>
                  <th className="py-3 pl-3 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Net Pay
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.entries.map((e) => (
                  <tr key={e.staff_id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3 pl-4 pr-3">
                      <p className="font-medium text-foreground">{e.name}</p>
                      <p className="text-xs text-muted-foreground">{e.staff_type}</p>
                    </td>
                    <td className="px-3 py-3">
                      {e.department ? (
                        <Badge variant="secondary" className="bg-secondary text-secondary-foreground text-xs">
                          {e.department}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-muted-foreground">
                      {formatCurrencyPaisas(e.monthly_salary)}
                    </td>
                    <td className="px-3 py-3 text-right text-muted-foreground">
                      {e.present_days} / {e.working_days}
                    </td>
                    <td className="px-3 py-3 text-right text-muted-foreground">
                      {formatCurrencyPaisas(e.earned_salary)}
                    </td>
                    <td className="px-3 py-3 text-right text-muted-foreground">
                      {e.deductions > 0 ? (
                        <span className="text-destructive">
                          -{formatCurrencyPaisas(e.deductions)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 pl-3 pr-4 text-right font-bold text-primary">
                      {formatCurrencyPaisas(e.net_salary)}
                    </td>
                  </tr>
                ))}
                {data.entries.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No active staff records found.
                    </td>
                  </tr>
                )}
              </tbody>
              {data.entries.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/10">
                    <td colSpan={2} className="py-3 pl-4 pr-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Total
                    </td>
                    <td className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground">
                      {formatCurrencyPaisas(data.total_base)}
                    </td>
                    <td className="px-3 py-3" />
                    <td className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground">
                      {formatCurrencyPaisas(data.total_earned)}
                    </td>
                    <td className="px-3 py-3 text-right text-xs font-semibold text-destructive">
                      {data.total_deductions > 0 ? `-${formatCurrencyPaisas(data.total_deductions)}` : '—'}
                    </td>
                    <td className="py-3 pl-3 pr-4 text-right text-sm font-bold text-primary">
                      {formatCurrencyPaisas(data.total_net)}
                    </td>
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
