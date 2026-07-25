import React from 'react'
import { formatCurrencyPaisas } from '@/lib/utils'
import { TrendingDown, Receipt, LayoutGrid, Tag } from 'lucide-react'
import type { ExpenseReport } from '@/app/actions/reports'

interface ExpenseSummaryChartProps {
  data: ExpenseReport
}

const BAR_COLORS = [
  'bg-primary',
  'bg-info',
  'bg-success',
  'bg-warning',
  'bg-destructive',
  'bg-secondary',
]

export function ExpenseSummaryChart({ data }: ExpenseSummaryChartProps) {
  const totalCategories = data.by_department.reduce(
    (sum, d) => sum + d.by_head.length,
    0
  )
  const largestDept = data.by_department[0]

  return (
    <div className="space-y-4">
      {/* ── Stat chips ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
            <TrendingDown className="h-4 w-4 text-destructive" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Total Expenses
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">
              {formatCurrencyPaisas(data.grand_total)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-info/10">
            <LayoutGrid className="h-4 w-4 text-info" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Departments
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">
              {data.by_department.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-warning/10">
            <Tag className="h-4 w-4 text-warning" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Categories
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">{totalCategories}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Receipt className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Largest Dept
            </p>
            <p className="truncate text-sm font-bold tabular-nums text-foreground">
              {largestDept?.dept_name ?? '—'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Department breakdown panel ───────────────────────────────── */}
      {data.by_department.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {data.by_department.map((dept, deptIdx) => {
            const deptPct =
              data.grand_total > 0
                ? Math.round((dept.total_amount / data.grand_total) * 100)
                : 0

            return (
              <React.Fragment key={dept.department ?? dept.dept_name}>
                {/* Dept section header */}
                <div
                  className={`flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2 ${deptIdx > 0 ? 'border-t border-border' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${BAR_COLORS[deptIdx % BAR_COLORS.length]}`}
                    />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {dept.dept_name}
                    </span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {deptPct}%
                    </span>
                  </div>
                  <span className="text-[12px] font-bold text-foreground">
                    {formatCurrencyPaisas(dept.total_amount)}
                  </span>
                </div>

                {/* Column headers */}
                <div className="flex items-center border-b border-border/50 px-4 py-1.5">
                  <span className="flex-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Expense Head
                  </span>
                  <span className="hidden w-16 shrink-0 text-right text-[10px] uppercase tracking-wide text-muted-foreground sm:block">
                    Items
                  </span>
                  <span className="w-28 shrink-0 text-right text-[10px] uppercase tracking-wide text-muted-foreground">
                    Amount
                  </span>
                  <span className="hidden w-20 shrink-0 text-right text-[10px] uppercase tracking-wide text-muted-foreground sm:block">
                    % of Total
                  </span>
                </div>

                {/* Expense head rows */}
                <div className="divide-y divide-border/50">
                  {dept.by_head.map((h, i) => {
                    const headPct =
                      data.grand_total > 0
                        ? ((h.total_amount / data.grand_total) * 100).toFixed(1)
                        : '0.0'
                    return (
                      <div
                        key={`${h.head_name}-${i}`}
                        className="flex items-center px-4 py-2.5 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{h.head_name}</p>
                          {/* Mobile: show item count inline */}
                          <p className="text-[11px] text-muted-foreground sm:hidden">
                            {h.item_count} item{h.item_count !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <span className="hidden w-16 shrink-0 text-right text-[12px] text-muted-foreground sm:block">
                          {h.item_count}
                        </span>
                        <span className="w-28 shrink-0 text-right text-[12px] font-medium text-foreground">
                          {formatCurrencyPaisas(h.total_amount)}
                        </span>
                        <span className="hidden w-20 shrink-0 text-right text-[12px] text-muted-foreground sm:block">
                          {headPct}%
                        </span>
                      </div>
                    )
                  })}

                  {dept.by_head.length === 0 && (
                    <div className="px-4 py-4 text-center">
                      <p className="text-[12px] text-muted-foreground">No expenses recorded.</p>
                    </div>
                  )}
                </div>

                {/* Dept subtotal (only when multiple heads) */}
                {dept.by_head.length > 1 && (
                  <div className="flex items-center border-t border-border/50 bg-muted/10 px-4 py-1.5">
                    <span className="flex-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Subtotal
                    </span>
                    <span className="hidden w-16 shrink-0 sm:block" />
                    <span className="w-28 shrink-0 text-right text-[12px] font-bold text-foreground">
                      {formatCurrencyPaisas(dept.total_amount)}
                    </span>
                    <span className="hidden w-20 shrink-0 sm:block" />
                  </div>
                )}
              </React.Fragment>
            )
          })}

          {/* Grand total footer */}
          {data.by_department.length > 1 && (
            <div className="flex items-center border-t-2 border-border bg-muted/20 px-4 py-2">
              <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Grand Total
              </span>
              <span className="hidden w-16 shrink-0 sm:block" />
              <span className="w-28 shrink-0 text-right text-sm font-bold text-primary">
                {formatCurrencyPaisas(data.grand_total)}
              </span>
              <span className="hidden w-20 shrink-0 sm:block" />
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">No expense records found for this period.</p>
        </div>
      )}
    </div>
  )
}
