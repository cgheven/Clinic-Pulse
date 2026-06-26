'use client'

import React, { useState, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronRight,
  Receipt,
  Filter,
  X,
  Building2,
  Tag,
  CreditCard,
  TrendingDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrencyPaisas, formatDate } from '@/lib/utils'
import type { ExpenseWithRelations } from '@/app/actions/expenses'
import type { CpDepartment, CpExpenseHead, CpPaymentMethod } from '@/types/index'

// =============================================================================
// Types
// =============================================================================

interface ExpenseTableProps {
  expenses: ExpenseWithRelations[]
  departments: CpDepartment[]
  expenseHeads: CpExpenseHead[]
  paymentMethods: CpPaymentMethod[]
  /** Active filter values (from URL params) */
  filters: {
    month: string
    department_id: string
    head_id: string
    payment_method_id: string
  }
  totalAmount: number // paisas
}

// =============================================================================
// Component
// =============================================================================

export function ExpenseTable({
  expenses,
  departments,
  expenseHeads,
  paymentMethods,
  filters,
  totalAmount,
}: ExpenseTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // ─── Filter navigation ───────────────────────────────────────────────────────

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  const clearAllFilters = useCallback(() => {
    const params = new URLSearchParams()
    params.set('month', filters.month)
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, filters.month])

  const hasActiveFilters =
    !!filters.department_id ||
    !!filters.head_id ||
    !!filters.payment_method_id

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <Card className="border-border bg-card">
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              Filters
            </div>

            {/* Department filter */}
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground/60" />
              <Select
                value={filters.department_id || '__all__'}
                onValueChange={(v) =>
                  updateFilter('department_id', v === '__all__' ? '' : v)
                }
              >
                <SelectTrigger className="h-8 w-[160px] text-xs border-border">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Departments</SelectItem>
                  {departments
                    .filter((d) => d.is_active && !d.deleted_at)
                    .map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-muted-foreground/60" />
              <Select
                value={filters.head_id || '__all__'}
                onValueChange={(v) =>
                  updateFilter('head_id', v === '__all__' ? '' : v)
                }
              >
                <SelectTrigger className="h-8 w-[160px] text-xs border-border">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Categories</SelectItem>
                  {expenseHeads
                    .filter((h) => h.is_active && !h.deleted_at)
                    .map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method filter */}
            <div className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-muted-foreground/60" />
              <Select
                value={filters.payment_method_id || '__all__'}
                onValueChange={(v) =>
                  updateFilter('payment_method_id', v === '__all__' ? '' : v)
                }
              >
                <SelectTrigger className="h-8 w-[160px] text-xs border-border">
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Methods</SelectItem>
                  {paymentMethods
                    .filter((m) => m.is_active)
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Clear
              </Button>
            )}

            {/* Results summary */}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {expenses.length} {expenses.length === 1 ? 'record' : 'records'}
              </span>
              {expenses.length > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {formatCurrencyPaisas(totalAmount)}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      {expenses.length === 0 ? (
        <Card className="border-dashed border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Receipt className="mb-3 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">
              No expenses found
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              {hasActiveFilters
                ? 'Try adjusting the filters above.'
                : 'No expenses recorded for this period.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-border bg-card">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Expense Records
            </CardTitle>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="py-2.5 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                    Date
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                    Description
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                    Category
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                    Department
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                    Method
                  </th>
                  <th className="py-2.5 pl-3 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                    Amount
                  </th>
                  <th className="py-2.5 pr-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground/70 sr-only">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {expenses.map((expense) => (
                  <ExpenseRow key={expense.id} expense={expense} />
                ))}
              </tbody>

              {/* Footer totals */}
              <tfoot>
                <tr className="border-t-2 border-primary/20 bg-muted/10">
                  <td
                    colSpan={5}
                    className="py-3 pl-4 pr-3 text-xs font-semibold text-muted-foreground"
                  >
                    <div className="flex items-center gap-1.5">
                      <TrendingDown className="h-3.5 w-3.5 text-primary" />
                      Total Expenses
                    </div>
                  </td>
                  <td className="py-3 pl-3 pr-4 text-right text-sm font-bold text-primary">
                    {formatCurrencyPaisas(totalAmount)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

// =============================================================================
// Row sub-component
// =============================================================================

function ExpenseRow({ expense }: { expense: ExpenseWithRelations }) {
  const categoryLabel =
    expense.expense_head_name ?? expense.custom_head ?? '—'

  return (
    <tr className="group transition-colors hover:bg-muted/20">
      {/* Date */}
      <td className="py-3 pl-4 pr-3 text-xs text-muted-foreground whitespace-nowrap">
        {formatDate(expense.expense_date, 'dd MMM yyyy')}
      </td>

      {/* Description */}
      <td className="px-3 py-3 max-w-[220px]">
        <p className="truncate text-sm text-foreground">{expense.description}</p>
      </td>

      {/* Category */}
      <td className="px-3 py-3">
        <span className="inline-flex items-center rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {categoryLabel}
        </span>
      </td>

      {/* Department */}
      <td className="px-3 py-3 text-xs text-muted-foreground">
        {expense.department_name ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {expense.department_name}
          </span>
        ) : (
          <span className="text-muted-foreground/50">General</span>
        )}
      </td>

      {/* Payment Method */}
      <td className="px-3 py-3 text-xs text-muted-foreground">
        {expense.payment_method_name ?? (
          <span className="text-muted-foreground/50">—</span>
        )}
      </td>

      {/* Amount */}
      <td className="py-3 pl-3 pr-4 text-right">
        <span className="text-sm font-semibold text-foreground">
          {formatCurrencyPaisas(expense.amount)}
        </span>
      </td>

      {/* Detail arrow */}
      <td className="py-3 pr-3 text-right">
        <Link
          href={`/expenses/${expense.id}`}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-muted hover:text-foreground group-hover:text-muted-foreground"
          aria-label={`View expense details`}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </td>
    </tr>
  )
}
