'use client'

import React, { useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  Receipt,
  Filter,
  X,
  Tag,
  CreditCard,
  TrendingDown,
} from 'lucide-react'
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
import type { CpExpenseHead, CpPaymentMethod } from '@/types/index'

// =============================================================================
// Constants
// =============================================================================

const DEPARTMENT_OPTIONS = [
  { value: 'general', label: 'General / Admin' },
  { value: 'opd', label: 'OPD' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'lab', label: 'Lab' },
  { value: 'xray', label: 'X-Ray' },
] as const

// =============================================================================
// Types
// =============================================================================

interface ExpenseTableProps {
  expenses: ExpenseWithRelations[]
  departments?: unknown[]
  expenseHeads: CpExpenseHead[]
  paymentMethods: CpPaymentMethod[]
  filters: {
    month: string
    department_id: string
    head_id: string
    payment_method_id: string
  }
  totalAmount: number
}

// =============================================================================
// Component
// =============================================================================

export function ExpenseTable({
  expenses,
  expenseHeads,
  paymentMethods,
  filters,
  totalAmount,
}: ExpenseTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

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
    !!filters.department_id || !!filters.head_id || !!filters.payment_method_id

  return (
    <div className="space-y-3">
      {/* ── Filter strip ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          Filters
        </div>

        {/* Department filter */}
        <Select
          value={filters.department_id || '__all__'}
          onValueChange={(v) =>
            updateFilter('department_id', v === '__all__' ? '' : v)
          }
        >
          <SelectTrigger className="h-7 w-auto min-w-[130px] border-border text-[12px]">
            <SelectValue placeholder="All Depts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Departments</SelectItem>
            {DEPARTMENT_OPTIONS.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category filter */}
        <Select
          value={filters.head_id || '__all__'}
          onValueChange={(v) =>
            updateFilter('head_id', v === '__all__' ? '' : v)
          }
        >
          <SelectTrigger className="h-7 w-auto min-w-[130px] border-border text-[12px]">
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

        {/* Payment Method filter */}
        <Select
          value={filters.payment_method_id || '__all__'}
          onValueChange={(v) =>
            updateFilter('payment_method_id', v === '__all__' ? '' : v)
          }
        >
          <SelectTrigger className="h-7 w-auto min-w-[120px] border-border text-[12px]">
            <SelectValue placeholder="All Methods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Methods</SelectItem>
            {paymentMethods
              .filter((m) => m.is_enabled)
              .map((m) => (
                <SelectItem key={m.method} value={m.method}>
                  {m.label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-7 px-2 text-[12px] text-muted-foreground hover:text-destructive"
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Clear
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[12px] text-muted-foreground">
            {expenses.length} {expenses.length === 1 ? 'record' : 'records'}
          </span>
          {expenses.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              {formatCurrencyPaisas(totalAmount)}
            </span>
          )}
        </div>
      </div>

      {/* ── Panel Table ───────────────────────────────────────────────────────── */}
      {expenses.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-dashed border-border bg-card">
          <div className="flex flex-col items-center justify-center py-12">
            <Receipt className="mb-3 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No expenses found</p>
            <p className="mt-1 text-[12px] text-muted-foreground/60">
              {hasActiveFilters
                ? 'Try adjusting the filters above.'
                : 'No expenses recorded for this period.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {/* Section header */}
          <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Expense Records
            </span>
            <span className="text-[12px] text-muted-foreground">
              {expenses.length} entries
            </span>
          </div>

          {/* Column headers */}
          <div className="flex items-center border-b border-border/50 px-4 py-1.5">
            <span className="w-[90px] shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground/60">
              Date
            </span>
            <span className="flex-1 text-[10px] uppercase tracking-wide text-muted-foreground/60">
              Description
            </span>
            <span className="hidden w-[110px] shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground/60 sm:block">
              Category
            </span>
            <span className="hidden w-[90px] shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground/60 sm:block">
              Method
            </span>
            <span className="w-[80px] shrink-0 text-right text-[10px] uppercase tracking-wide text-muted-foreground/60">
              Amount
            </span>
          </div>

          {/* Data rows */}
          <div className="divide-y divide-border/50">
            {expenses.map((expense) => (
              <ExpenseRow key={expense.id} expense={expense} />
            ))}
          </div>

          {/* Footer total */}
          <div className="flex items-center border-t-2 border-primary/20 bg-muted/10 px-4 py-2.5">
            <div className="flex flex-1 items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-semibold text-muted-foreground">
                Total Expenses
              </span>
            </div>
            <span className="text-sm font-bold text-primary">
              {formatCurrencyPaisas(totalAmount)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Row sub-component
// =============================================================================

function ExpenseRow({ expense }: { expense: ExpenseWithRelations }) {
  const categoryLabel = expense.expense_head_name ?? expense.head_name ?? '—'
  const deptLabel = expense.department_name ?? 'General'

  return (
    <div className="group flex items-center px-4 py-2.5 transition-colors hover:bg-muted/20">
      {/* Date — always visible */}
      <div className="w-[90px] shrink-0">
        <span className="text-[12px] text-muted-foreground whitespace-nowrap">
          {formatDate(expense.expense_date, 'dd MMM')}
        </span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground/50 sm:hidden">
          {deptLabel}
        </span>
      </div>

      {/* Description — always visible; sub-text on mobile */}
      <div className="flex-1 min-w-0 pr-3">
        <p className="truncate text-sm text-foreground">{expense.description}</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground/60 sm:hidden">
          {categoryLabel}
          {expense.payment_method_name ? ` · ${expense.payment_method_name}` : ''}
        </p>
      </div>

      {/* Category — hidden on mobile */}
      <div className="hidden w-[110px] shrink-0 sm:block">
        <Badge
          variant="outline"
          className="rounded-full border-border bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
        >
          {categoryLabel}
        </Badge>
      </div>

      {/* Method — hidden on mobile */}
      <div className="hidden w-[90px] shrink-0 sm:block">
        <span className="text-[12px] text-muted-foreground">
          {expense.payment_method_name ?? (
            <span className="text-muted-foreground/40">—</span>
          )}
        </span>
      </div>

      {/* Amount — always visible */}
      <div className="w-[80px] shrink-0 text-right">
        <span className={cn(
          'text-sm font-semibold tabular-nums',
          expense.is_voided ? 'text-muted-foreground/40 line-through' : 'text-foreground'
        )}>
          {formatCurrencyPaisas(expense.amount_paisas)}
        </span>
      </div>
    </div>
  )
}
