'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrencyPaisas, formatBasisPoints } from '@/lib/utils'
import { Scan, Users, TrendingDown, Building2 } from 'lucide-react'
import type { PartnerPayoutReport } from '@/app/actions/reports'

interface PartnerPayoutTableProps {
  data: PartnerPayoutReport
}

export function PartnerPayoutTable({ data }: PartnerPayoutTableProps) {
  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">X-Ray Revenue</p>
              <div className="rounded-lg p-1.5 bg-primary/10">
                <Scan className="h-3.5 w-3.5 text-primary" />
              </div>
            </div>
            <p className="text-xl font-bold text-foreground">
              {formatCurrencyPaisas(data.total_xray_revenue)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Gross revenue for period</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Partners</p>
              <div className="rounded-lg p-1.5 bg-info/10">
                <Users className="h-3.5 w-3.5 text-info" />
              </div>
            </div>
            <p className="text-xl font-bold text-foreground">{data.entries.length}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Active partners</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Total Payouts</p>
              <div className="rounded-lg p-1.5 bg-destructive/10">
                <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              </div>
            </div>
            <p className="text-xl font-bold text-foreground">
              {formatCurrencyPaisas(data.total_payout)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">To all partners</p>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Clinic Share</p>
              <div className="rounded-lg p-1.5 bg-success/10">
                <Building2 className="h-3.5 w-3.5 text-success" />
              </div>
            </div>
            <p className="text-xl font-bold text-primary">
              {formatCurrencyPaisas(data.clinic_share)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">After partner payouts</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue split visual */}
      {data.total_xray_revenue > 0 && (
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Revenue Split</p>
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted">
              {data.entries.map((e, i) => {
                const pct = data.total_xray_revenue > 0
                  ? (e.payout_amount / data.total_xray_revenue) * 100
                  : 0
                const hues = ['bg-primary', 'bg-info', 'bg-success', 'bg-warning', 'bg-destructive']
                return (
                  <div
                    key={e.partner_id}
                    className={`${hues[i % hues.length]} h-full transition-all`}
                    style={{ width: `${pct.toFixed(1)}%` }}
                    title={`${e.partner_name}: ${pct.toFixed(1)}%`}
                  />
                )
              })}
              {/* Clinic share */}
              <div
                className="bg-secondary h-full flex-1"
                title={`Clinic: ${data.total_xray_revenue > 0 ? ((data.clinic_share / data.total_xray_revenue) * 100).toFixed(1) : 0}%`}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-3">
              {data.entries.map((e, i) => {
                const hues = ['bg-primary', 'bg-info', 'bg-success', 'bg-warning', 'bg-destructive']
                return (
                  <div key={e.partner_id} className="flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${hues[i % hues.length]}`} />
                    <span className="text-xs text-muted-foreground">{e.partner_name}</span>
                  </div>
                )
              })}
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-secondary" />
                <span className="text-xs text-muted-foreground">Clinic</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Partner payout table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">
            Partner Payout Detail
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="py-3 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Partner
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Type
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Entries
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Split %
                  </th>
                  <th className="py-3 pl-3 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Payout Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.entries.map((e) => (
                  <tr key={e.partner_id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3 pl-4 pr-3">
                      <p className="font-medium text-foreground">{e.partner_name}</p>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="secondary" className="bg-secondary text-secondary-foreground text-xs">
                        {e.partner_type || 'Partner'}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-right text-muted-foreground">
                      {e.revenue_entries}
                    </td>
                    <td className="px-3 py-3 text-right text-muted-foreground">
                      {formatBasisPoints(e.split_pct_display)}
                    </td>
                    <td className="py-3 pl-3 pr-4 text-right font-bold text-primary">
                      {formatCurrencyPaisas(e.payout_amount)}
                    </td>
                  </tr>
                ))}
                {/* Clinic share row */}
                <tr className="bg-success/5 hover:bg-success/10 transition-colors">
                  <td className="py-3 pl-4 pr-3">
                    <p className="font-medium text-success">Clinic Share</p>
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant="secondary" className="bg-success/10 text-success border-success/20 text-xs">
                      Retained
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-right text-muted-foreground">—</td>
                  <td className="px-3 py-3 text-right text-muted-foreground">
                    {data.total_xray_revenue > 0
                      ? `${((data.clinic_share / data.total_xray_revenue) * 100).toFixed(1)}%`
                      : '—'}
                  </td>
                  <td className="py-3 pl-3 pr-4 text-right font-bold text-success">
                    {formatCurrencyPaisas(data.clinic_share)}
                  </td>
                </tr>
                {data.entries.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No partner payout data for this month.
                    </td>
                  </tr>
                )}
              </tbody>
              {data.entries.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/10">
                    <td colSpan={2} className="py-3 pl-4 pr-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Grand Total
                    </td>
                    <td className="px-3 py-3" />
                    <td className="px-3 py-3" />
                    <td className="py-3 pl-3 pr-4 text-right text-sm font-bold text-foreground">
                      {formatCurrencyPaisas(data.total_xray_revenue)}
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
