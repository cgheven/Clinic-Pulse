'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { formatCurrencyPaisas, formatBasisPoints } from '@/lib/utils'
import { TrendingUp, Users, DollarSign, Activity } from 'lucide-react'
import type { DoctorEarningsReport } from '@/app/actions/reports'

interface DoctorEarningsTableProps {
  data: DoctorEarningsReport
}

export function DoctorEarningsTable({ data }: DoctorEarningsTableProps) {
  const totalVisits = data.entries.reduce((s, e) => s + e.total_visits, 0)
  const totalRevenue = data.entries.reduce((s, e) => s + e.total_revenue, 0)
  const salariedCount = data.entries.filter((e) => e.earning_model === 'salaried').length
  const commissionCount = data.entries.filter((e) => e.earning_model === 'commission').length

  return (
    <div className="space-y-4">
      {/* ── Stat chips ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-info/10">
            <Users className="h-4 w-4 text-info" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Doctors
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">
              {data.entries.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-success/10">
            <Activity className="h-4 w-4 text-success" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Total Visits
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">{totalVisits}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-warning/10">
            <TrendingUp className="h-4 w-4 text-warning" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              OPD Revenue
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">
              {formatCurrencyPaisas(totalRevenue)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Total Earnings
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">
              {formatCurrencyPaisas(data.total_gross_earnings)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Panel table ─────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Section header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Earnings Breakdown
          </span>
          <span className="text-[11px] text-muted-foreground">
            {salariedCount} salaried · {commissionCount} commission · {data.working_days_config} working days
          </span>
        </div>

        {/* Column headers */}
        <div className="flex items-center border-b border-border/50 px-4 py-1.5">
          <span className="flex-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            Doctor
          </span>
          <span className="hidden w-24 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground sm:block">
            Model
          </span>
          <span className="hidden w-16 shrink-0 text-right text-[10px] uppercase tracking-wide text-muted-foreground sm:block">
            Visits
          </span>
          <span className="hidden w-28 shrink-0 text-right text-[10px] uppercase tracking-wide text-muted-foreground sm:block">
            Revenue
          </span>
          <span className="hidden w-24 shrink-0 text-right text-[10px] uppercase tracking-wide text-muted-foreground sm:block">
            Rate / Base
          </span>
          <span className="hidden w-20 shrink-0 text-right text-[10px] uppercase tracking-wide text-muted-foreground sm:block">
            Days
          </span>
          <span className="w-28 shrink-0 text-right text-[10px] uppercase tracking-wide text-muted-foreground">
            Earnings
          </span>
        </div>

        {/* Data rows */}
        <div className="divide-y divide-border/50">
          {data.entries.map((e) => (
            <div
              key={e.doctor_id}
              className="flex items-center px-4 py-2.5 hover:bg-muted/20 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{e.doctor_name}</p>
                {/* Mobile sub-label */}
                <p className="text-[11px] text-muted-foreground sm:hidden">
                  {e.earning_model === 'commission' ? 'Commission' : 'Salaried'} · {e.total_visits} visits
                </p>
                {/* Desktop specialization */}
                {e.specialization && (
                  <p className="hidden text-[11px] text-muted-foreground sm:block">
                    {e.specialization}
                  </p>
                )}
              </div>

              <div className="hidden w-24 shrink-0 sm:block">
                <Badge
                  variant="secondary"
                  className={
                    e.earning_model === 'salaried'
                      ? 'bg-info/10 text-info border-info/20 text-[10px]'
                      : 'bg-success/10 text-success border-success/20 text-[10px]'
                  }
                >
                  {e.earning_model === 'salaried' ? 'Salaried' : 'Commission'}
                </Badge>
              </div>

              <span className="hidden w-16 shrink-0 text-right text-[12px] text-muted-foreground sm:block">
                {e.total_visits}
              </span>
              <span className="hidden w-28 shrink-0 text-right text-[12px] text-muted-foreground sm:block">
                {formatCurrencyPaisas(e.total_revenue)}
              </span>
              <span className="hidden w-24 shrink-0 text-right text-[12px] text-muted-foreground sm:block">
                {e.earning_model === 'commission'
                  ? e.commission_pct !== null
                    ? formatBasisPoints(e.commission_pct)
                    : '—'
                  : formatCurrencyPaisas(e.monthly_salary)}
              </span>
              <span className="hidden w-20 shrink-0 text-right text-[12px] text-muted-foreground sm:block">
                {e.days_worked} / {e.working_days}
              </span>
              <span className="w-28 shrink-0 text-right text-sm font-bold text-primary">
                {formatCurrencyPaisas(e.gross_earnings)}
              </span>
            </div>
          ))}

          {data.entries.length === 0 && (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No doctor records found for this month.
              </p>
            </div>
          )}
        </div>

        {/* Footer totals */}
        {data.entries.length > 0 && (
          <div className="flex items-center border-t border-border bg-muted/20 px-4 py-2">
            <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total
            </span>
            <span className="hidden w-24 shrink-0 sm:block" />
            <span className="hidden w-16 shrink-0 text-right text-[12px] font-semibold text-muted-foreground sm:block">
              {totalVisits}
            </span>
            <span className="hidden w-28 shrink-0 text-right text-[12px] font-semibold text-muted-foreground sm:block">
              {formatCurrencyPaisas(totalRevenue)}
            </span>
            <span className="hidden w-24 shrink-0 sm:block" />
            <span className="hidden w-20 shrink-0 sm:block" />
            <span className="w-28 shrink-0 text-right text-sm font-bold text-primary">
              {formatCurrencyPaisas(data.total_gross_earnings)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
