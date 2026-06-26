'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrencyPaisas, formatBasisPoints } from '@/lib/utils'
import { TrendingUp, Users, DollarSign } from 'lucide-react'
import type { DoctorEarningsReport } from '@/app/actions/reports'

interface DoctorEarningsTableProps {
  data: DoctorEarningsReport
}

export function DoctorEarningsTable({ data }: DoctorEarningsTableProps) {
  const salariedCount = data.entries.filter((e) => e.earning_model === 'salaried').length
  const commissionCount = data.entries.filter((e) => e.earning_model === 'commission').length

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Total Doctors</p>
              <div className="rounded-lg p-1.5 bg-info/10">
                <Users className="h-3.5 w-3.5 text-info" />
              </div>
            </div>
            <p className="text-xl font-bold text-foreground">{data.entries.length}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {salariedCount} salaried · {commissionCount} commission
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Total OPD Revenue</p>
              <div className="rounded-lg p-1.5 bg-success/10">
                <TrendingUp className="h-3.5 w-3.5 text-success" />
              </div>
            </div>
            <p className="text-xl font-bold text-foreground">
              {formatCurrencyPaisas(data.entries.reduce((s, e) => s + e.total_revenue, 0))}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {data.entries.reduce((s, e) => s + e.total_visits, 0)} total visits
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Total Earnings (Payable)</p>
              <div className="rounded-lg p-1.5 bg-primary/10">
                <DollarSign className="h-3.5 w-3.5 text-primary" />
              </div>
            </div>
            <p className="text-xl font-bold text-primary">
              {formatCurrencyPaisas(data.total_gross_earnings)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Working days: {data.working_days_config}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Earnings table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">
            Doctor Earnings Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="py-3 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Doctor
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Model
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Visits
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Revenue
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Rate / Base
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Days
                  </th>
                  <th className="py-3 pl-3 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Earnings
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.entries.map((e) => (
                  <tr key={e.doctor_id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3 pl-4 pr-3">
                      <p className="font-medium text-foreground">{e.doctor_name}</p>
                      {e.specialization && (
                        <p className="text-xs text-muted-foreground">{e.specialization}</p>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Badge
                        variant="secondary"
                        className={
                          e.earning_model === 'salaried'
                            ? 'bg-info/10 text-info border-info/20'
                            : 'bg-success/10 text-success border-success/20'
                        }
                      >
                        {e.earning_model === 'salaried' ? 'Salaried' : 'Commission'}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-right text-muted-foreground">{e.total_visits}</td>
                    <td className="px-3 py-3 text-right text-muted-foreground">
                      {formatCurrencyPaisas(e.total_revenue)}
                    </td>
                    <td className="px-3 py-3 text-right text-muted-foreground">
                      {e.earning_model === 'commission'
                        ? e.commission_pct !== null
                          ? formatBasisPoints(e.commission_pct)
                          : '—'
                        : formatCurrencyPaisas(e.monthly_salary)}
                    </td>
                    <td className="px-3 py-3 text-right text-muted-foreground">
                      {e.days_worked} / {e.working_days}
                    </td>
                    <td className="py-3 pl-3 pr-4 text-right font-bold text-primary">
                      {formatCurrencyPaisas(e.gross_earnings)}
                    </td>
                  </tr>
                ))}
                {data.entries.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No doctor records found for this month.
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
                      {data.entries.reduce((s, e) => s + e.total_visits, 0)}
                    </td>
                    <td className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground">
                      {formatCurrencyPaisas(data.entries.reduce((s, e) => s + e.total_revenue, 0))}
                    </td>
                    <td className="px-3 py-3" />
                    <td className="px-3 py-3" />
                    <td className="py-3 pl-3 pr-4 text-right text-sm font-bold text-primary">
                      {formatCurrencyPaisas(data.total_gross_earnings)}
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
