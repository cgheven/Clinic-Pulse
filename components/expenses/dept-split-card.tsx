'use client'

import React from 'react'
import { Divide, Building2, TrendingDown, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrencyPaisas } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { CrossDeptSplitData } from '@/app/actions/expenses'

// =============================================================================
// Props
// =============================================================================

interface DeptSplitCardProps {
  data: CrossDeptSplitData
  className?: string
}

// =============================================================================
// Department colours (cycling palette)
// =============================================================================

const DEPT_COLORS: Array<{ bg: string; text: string; bar: string }> = [
  { bg: 'bg-primary/10', text: 'text-primary', bar: 'bg-primary' },
  { bg: 'bg-info/10', text: 'text-info', bar: 'bg-info' },
  { bg: 'bg-success/10', text: 'text-success', bar: 'bg-success' },
  { bg: 'bg-warning/10', text: 'text-warning', bar: 'bg-warning' },
  { bg: 'bg-secondary', text: 'text-secondary-foreground', bar: 'bg-muted-foreground' },
]

// =============================================================================
// Component
// =============================================================================

export function DeptSplitCard({ data, className }: DeptSplitCardProps) {
  const {
    total_expenses,
    divisor,
    per_dept_share,
    department_groups,
  } = data

  const hasExpenses = total_expenses > 0

  return (
    <Card className={cn('border-border bg-card', className)}>
      <CardHeader className="border-b border-border pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Divide className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-sm font-semibold text-foreground">
              Cross-Department Split
            </CardTitle>
          </div>

          {/* Divisor badge */}
          <span className="flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            <Divide className="h-3 w-3" />
            ÷ {divisor} depts
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* ── Summary row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Total Expenses
            </p>
            <p className="mt-0.5 text-lg font-bold text-foreground">
              {formatCurrencyPaisas(total_expenses)}
            </p>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/70">
              Per Department
            </p>
            <p className="mt-0.5 text-lg font-bold text-primary">
              {formatCurrencyPaisas(per_dept_share)}
            </p>
          </div>
        </div>

        {/* ── Formula note ─────────────────────────────────────────────────── */}
        <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/10 px-3 py-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          <p className="text-[11px] text-muted-foreground/70">
            Formula:{' '}
            <span className="font-mono text-foreground/70">
              {formatCurrencyPaisas(total_expenses)} ÷ {divisor} ={' '}
              {formatCurrencyPaisas(per_dept_share)} / dept
            </span>
          </p>
        </div>

        {/* ── Department breakdown ─────────────────────────────────────────── */}
        {!hasExpenses ? (
          <div className="flex flex-col items-center py-6 text-center">
            <TrendingDown className="mb-2 h-7 w-7 text-muted-foreground/25" />
            <p className="text-sm text-muted-foreground">
              No expenses recorded this month.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              By Department
            </p>

            {department_groups.map((group, idx) => {
              const color = DEPT_COLORS[idx % DEPT_COLORS.length]!
              const pct =
                total_expenses > 0
                  ? Math.round((group.total / total_expenses) * 100)
                  : 0

              return (
                <div
                  key={group.department ?? 'general'}
                  className="rounded-lg border border-border bg-muted/10 px-3 py-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-md',
                          color.bg
                        )}
                      >
                        <Building2
                          className={cn('h-3 w-3', color.text)}
                        />
                      </div>
                      <span className="text-xs font-medium text-foreground">
                        {group.department_name}
                      </span>
                      <span className="rounded-full bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {group.expenses.length}
                      </span>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrencyPaisas(group.total)}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70">
                        {pct}% of total
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted/30">
                    <div
                      className={cn('h-full rounded-full transition-all', color.bar)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Per-dept share indicator */}
                  <p className="mt-1.5 text-[11px] text-muted-foreground/60">
                    Allocated share:{' '}
                    <span className={cn('font-medium', color.text)}>
                      {formatCurrencyPaisas(per_dept_share)}
                    </span>
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
