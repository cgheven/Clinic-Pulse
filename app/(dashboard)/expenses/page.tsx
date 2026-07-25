import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Tag,
  Hash,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getExpenses, getExpenseSummary } from '@/app/actions/expenses'
import { ExpenseTable } from '@/components/expenses/expense-table'
import { getTodayPKT, formatCurrencyPaisas } from '@/lib/utils'
import type { CpExpenseHead, CpPaymentMethod } from '@/types/index'

export const metadata: Metadata = {
  title: 'Expenses — ClinicPulse',
}

// =============================================================================
// Helpers
// =============================================================================

function offsetMonth(monthStr: string, months: number): string {
  const [year, mon] = monthStr.split('-').map(Number) as [number, number]
  const d = new Date(year, mon - 1 + months, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(monthStr: string): string {
  const [year, mon] = monthStr.split('-').map(Number) as [number, number]
  return new Date(year, mon - 1, 1).toLocaleDateString('en-PK', {
    month: 'long',
    year: 'numeric',
  })
}

// =============================================================================
// Page
// =============================================================================

interface PageProps {
  searchParams: Promise<{
    month?: string
    department_id?: string
    head_id?: string
    payment_method_id?: string
  }>
}

export default async function ExpensesPage({ searchParams }: PageProps) {
  const authUser = await requireAuth()

  const params = await searchParams
  const today = getTodayPKT()
  const todayMonth = today.slice(0, 7)

  const monthParam = params.month ?? todayMonth
  const selectedMonth = /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : todayMonth
  const prevMonth = offsetMonth(selectedMonth, -1)
  const nextMonth = offsetMonth(selectedMonth, +1)
  const isCurrentMonth = selectedMonth === todayMonth

  const departmentId = params.department_id ?? ''
  const headId = params.head_id ?? ''
  const paymentMethodId = params.payment_method_id ?? ''

  const canAdd =
    authUser.profile.role === 'admin' || authUser.profile.role === 'accountant'

  const supabase = await createClient()

  const [expensesResult, summaryResult, headsData, methodsData] = await Promise.all([
    getExpenses({
      month: selectedMonth,
      department: departmentId || null,
      head_id: headId || null,
      payment_method: paymentMethodId || null,
    }),
    getExpenseSummary(selectedMonth),
    supabase
      .from('cp_expense_heads')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true }),
    supabase
      .from('cp_payment_methods')
      .select('*')
      .eq('is_enabled', true)
      .order('sort_order', { ascending: true }),
  ])

  const expenses = expensesResult.success ? expensesResult.data : []
  const summary = summaryResult.success ? summaryResult.data : null
  const expenseHeads = (headsData.data ?? []) as CpExpenseHead[]
  const paymentMethods = (methodsData.data ?? []) as CpPaymentMethod[]

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount_paisas, 0)

  const todayTotal = isCurrentMonth
    ? expenses
        .filter((e) => e.expense_date === today)
        .reduce((s, e) => s + e.amount_paisas, 0)
    : null

  const topCategory = summary?.by_category[0] ?? null

  return (
    <div className="space-y-4">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-bold text-foreground sm:text-xl">Expenses</h1>
        {canAdd && (
          <Button size="sm" asChild>
            <Link href="/expenses/new">
              <Plus className="h-4 w-4" />
              Add Expense
            </Link>
          </Button>
        )}
      </div>

      {/* ── Stat Chips ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/* Today */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <TrendingDown className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Today
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">
              {todayTotal != null ? formatCurrencyPaisas(todayTotal) : '—'}
            </p>
          </div>
        </div>

        {/* Month Total */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-warning/10">
            <TrendingDown className="h-4 w-4 text-warning" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              This Month
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">
              {summary ? formatCurrencyPaisas(summary.grand_total) : '—'}
            </p>
          </div>
        </div>

        {/* Top Category */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-info/10">
            <Tag className="h-4 w-4 text-info" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Top Category
            </p>
            <p className="truncate text-sm font-bold tabular-nums text-foreground">
              {topCategory ? topCategory.head_name : '—'}
            </p>
          </div>
        </div>

        {/* Count */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-success/10">
            <Hash className="h-4 w-4 text-success" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Count
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">
              {expenses.length}
            </p>
          </div>
        </div>
      </div>

      {/* ── Month Navigator ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Link
          href={buildHref({ month: prevMonth, departmentId, headId, paymentMethodId })}
          className="rounded-lg border border-border bg-card p-2 text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>

        <div className="flex flex-1 items-center justify-center gap-3">
          <span className="text-sm font-semibold text-foreground">
            {formatMonthLabel(selectedMonth)}
          </span>
          {isCurrentMonth && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
              Current
            </span>
          )}
        </div>

        <Link
          href={buildHref({ month: nextMonth, departmentId, headId, paymentMethodId })}
          className="rounded-lg border border-border bg-card p-2 text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>

        {!isCurrentMonth && (
          <Link
            href="/expenses"
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
          >
            This Month
          </Link>
        )}
      </div>

      {/* ── Expense Table ─────────────────────────────────────────────────────── */}
      <ExpenseTable
        expenses={expenses}
        departments={[]}
        expenseHeads={expenseHeads}
        paymentMethods={paymentMethods}
        filters={{
          month: selectedMonth,
          department_id: departmentId,
          head_id: headId,
          payment_method_id: paymentMethodId,
        }}
        totalAmount={totalAmount}
      />

      {/* ── Error state ──────────────────────────────────────────────────────── */}
      {!expensesResult.success && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">
            Failed to load expenses: {expensesResult.error}
          </p>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// URL builder helper
// =============================================================================

function buildHref({
  month,
  departmentId,
  headId,
  paymentMethodId,
}: {
  month: string
  departmentId: string
  headId: string
  paymentMethodId: string
}): string {
  const params = new URLSearchParams()
  params.set('month', month)
  if (departmentId) params.set('department_id', departmentId)
  if (headId) params.set('head_id', headId)
  if (paymentMethodId) params.set('payment_method_id', paymentMethodId)
  return `/expenses?${params.toString()}`
}
