'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { formatCurrencyPaisas } from '@/lib/utils'
import { Users, DollarSign, Briefcase, CreditCard } from 'lucide-react'
import type { PayrollReport } from '@/app/actions/reports'

interface PayrollTableProps {
  data: PayrollReport
}

export function PayrollTable({ data }: PayrollTableProps) {
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
              Total Staff
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">
              {data.entries.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-warning/10">
            <Briefcase className="h-4 w-4 text-warning" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Base Payroll
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">
              {formatCurrencyPaisas(data.total_base)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
            <DollarSign className="h-4 w-4 text-destructive" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Deductions
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">
              {formatCurrencyPaisas(data.total_deductions)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <CreditCard className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Net Payroll
            </p>
            <p className="text-sm font-bold tabular-nums text-primary">
              {formatCurrencyPaisas(data.total_net)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Panel table ─────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Section header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Payroll Detail
          </span>
          <span className="text-[11px] text-muted-foreground">
            {data.working_days_config} working days this month
          </span>
        </div>

        {/* Column headers */}
        <div className="flex items-center border-b border-border/50 px-4 py-1.5">
          <span className="flex-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            Employee
          </span>
          <span className="hidden w-24 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground sm:block">
            Department
          </span>
          <span className="hidden w-28 shrink-0 text-right text-[10px] uppercase tracking-wide text-muted-foreground sm:block">
            Base Salary
          </span>
          <span className="hidden w-20 shrink-0 text-right text-[10px] uppercase tracking-wide text-muted-foreground sm:block">
            Days
          </span>
          <span className="hidden w-28 shrink-0 text-right text-[10px] uppercase tracking-wide text-muted-foreground sm:block">
            Earned
          </span>
          <span className="hidden w-24 shrink-0 text-right text-[10px] uppercase tracking-wide text-muted-foreground sm:block">
            Deductions
          </span>
          <span className="w-28 shrink-0 text-right text-[10px] uppercase tracking-wide text-muted-foreground">
            Net Pay
          </span>
        </div>

        {/* Data rows */}
        <div className="divide-y divide-border/50">
          {data.entries.map((e) => (
            <div
              key={e.staff_id}
              className="flex items-center px-4 py-2.5 hover:bg-muted/20 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{e.name}</p>
                {/* Mobile sub-label */}
                <p className="text-[11px] text-muted-foreground sm:hidden">
                  {e.staff_type}
                  {e.department ? ` · ${e.department}` : ''}
                  {' · '}
                  {e.present_days}/{e.working_days} days
                </p>
                {/* Desktop type */}
                <p className="hidden text-[11px] text-muted-foreground sm:block">{e.staff_type}</p>
              </div>

              <div className="hidden w-24 shrink-0 sm:block">
                {e.department ? (
                  <Badge
                    variant="secondary"
                    className="bg-secondary text-secondary-foreground text-[10px]"
                  >
                    {e.department}
                  </Badge>
                ) : (
                  <span className="text-[11px] text-muted-foreground">—</span>
                )}
              </div>

              <span className="hidden w-28 shrink-0 text-right text-[12px] text-muted-foreground sm:block">
                {formatCurrencyPaisas(e.monthly_salary)}
              </span>
              <span className="hidden w-20 shrink-0 text-right text-[12px] text-muted-foreground sm:block">
                {e.present_days} / {e.working_days}
              </span>
              <span className="hidden w-28 shrink-0 text-right text-[12px] text-muted-foreground sm:block">
                {formatCurrencyPaisas(e.earned_salary)}
              </span>
              <span className="hidden w-24 shrink-0 text-right text-[12px] sm:block">
                {e.deductions > 0 ? (
                  <span className="text-destructive">
                    -{formatCurrencyPaisas(e.deductions)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </span>
              <span className="w-28 shrink-0 text-right text-sm font-bold text-primary">
                {formatCurrencyPaisas(e.net_salary)}
              </span>
            </div>
          ))}

          {data.entries.length === 0 && (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">No active staff records found.</p>
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
            <span className="hidden w-28 shrink-0 text-right text-[12px] font-semibold text-muted-foreground sm:block">
              {formatCurrencyPaisas(data.total_base)}
            </span>
            <span className="hidden w-20 shrink-0 sm:block" />
            <span className="hidden w-28 shrink-0 text-right text-[12px] font-semibold text-muted-foreground sm:block">
              {formatCurrencyPaisas(data.total_earned)}
            </span>
            <span className="hidden w-24 shrink-0 text-right text-[12px] font-semibold text-destructive sm:block">
              {data.total_deductions > 0
                ? `-${formatCurrencyPaisas(data.total_deductions)}`
                : '—'}
            </span>
            <span className="w-28 shrink-0 text-right text-sm font-bold text-primary">
              {formatCurrencyPaisas(data.total_net)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
