import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Plus,
  Receipt,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Building2,
  Tag,
} from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import {
  getExpenses,
  getExpenseSummary,
  getCrossDeptSplit,
} from '@/app/actions/expenses'
import { ExpenseTable } from '@/components/expenses/expense-table'
import { DeptSplitCard } from '@/components/expenses/dept-split-card'
import { getTodayPKT, formatCurrencyPaisas } from '@/lib/utils'
import type { CpDepartment, CpExpenseHead, CpPaymentMethod } from '@/types/index'

export const metadata: Metadata = {
  title: 'Expenses — ClinicPulse',
}

// =============================================================================
// Helpers
// =============================================================================

function offsetMonth(monthStr: string, months: number): string {
  const [year, mon] = monthStr.split('-').map(Number) as [number, number]
  const d = new Date(year, mon - 1 + months, 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
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

  // Sanitise month
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

  // ── Fetch all data in parallel ─────────────────────────────────────────────
  const [
    expensesResult,
    summaryResult,
    splitResult,
    departmentsData,
    headsData,
    methodsData,
  ] = await Promise.all([
    getExpenses({
      month: selectedMonth,
      department_id: departmentId || null,
      head_id: headId || null,
      payment_method_id: paymentMethodId || null,
    }),
    getExpenseSummary(selectedMonth),
    getCrossDeptSplit(selectedMonth),
    supabase
      .from('cp_departments')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true }),
    supabase
      .from('cp_expense_heads')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true }),
    supabase
      .from('cp_payment_methods')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ])

  const expenses = expensesResult.success ? expensesResult.data : []
  const summary = summaryResult.success ? summaryResult.data : null
  const splitData = splitResult.success ? splitResult.data : null
  const departments = (departmentsData.data ?? []) as CpDepartment[]
  const expenseHeads = (headsData.data ?? []) as CpExpenseHead[]
  const paymentMethods = (methodsData.data ?? []) as CpPaymentMethod[]

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Expenses</h1>
            <p className="text-sm text-muted-foreground">
              Cross-department expense tracking and allocation
            </p>
          </div>
        </div>

        {canAdd && (
          <Link href="/expenses/new">
            <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/30">
              <Plus className="h-4 w-4" />
              New Expense
            </button>
          </Link>
        )}
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

      {/* ── Summary Cards ────────────────────────────────────────────────────── */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Grand Total */}
          <div className="rounded-xl border border-border bg-card px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <TrendingDown className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                Total
              </p>
            </div>
            <p className="mt-2 text-2xl font-bold text-primary">
              {formatCurrencyPaisas(summary.grand_total)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {summary.by_category.length} categories
            </p>
          </div>

          {/* Top Category */}
          <div className="rounded-xl border border-border bg-card px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
                <Tag className="h-4 w-4 text-warning" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                Top Category
              </p>
            </div>
            {summary.by_category[0] ? (
              <>
                <p className="mt-2 text-lg font-bold text-foreground">
                  {formatCurrencyPaisas(summary.by_category[0].total)}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {summary.by_category[0].head_name}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground/50">No data</p>
            )}
          </div>

          {/* Top Department */}
          <div className="rounded-xl border border-border bg-card px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10">
                <Building2 className="h-4 w-4 text-info" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                Top Department
              </p>
            </div>
            {summary.by_department[0] ? (
              <>
                <p className="mt-2 text-lg font-bold text-foreground">
                  {formatCurrencyPaisas(summary.by_department[0].total)}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {summary.by_department[0].department_name}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground/50">No data</p>
            )}
          </div>
        </div>
      )}

      {/* ── Main content: Table + Split Card ─────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Expense Table — takes 2/3 */}
        <div className="lg:col-span-2">
          <ExpenseTable
            expenses={expenses}
            departments={departments}
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
        </div>

        {/* Dept Split Card — takes 1/3 */}
        <div>
          {splitData ? (
            <DeptSplitCard data={splitData} />
          ) : (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
              <p className="text-xs text-destructive">
                {splitResult.success
                  ? 'No split data.'
                  : `Error: ${splitResult.error}`}
              </p>
            </div>
          )}
        </div>
      </div>

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
