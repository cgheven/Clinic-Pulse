import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Receipt } from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getXrayExpenses } from '@/app/actions/xray'
import { ExpenseSplit } from '@/components/xray/expense-split'
import { getTodayPKT } from '@/lib/utils'
import type { CpPaymentMethod, CpExpenseHead } from '@/types/index'

export const metadata: Metadata = {
  title: 'X-Ray Expenses — ClinicPulse',
}

// =============================================================================
// Page
// =============================================================================

interface PageProps {
  searchParams: Promise<{ month?: string }>
}

export default async function XrayExpensesPage({ searchParams }: PageProps) {
  const authUser = await requireAuth()

  const params = await searchParams
  const today = getTodayPKT()
  const todayMonth = today.slice(0, 7) // YYYY-MM

  // Sanitise month param
  const monthParam = params.month ?? todayMonth
  const isValidMonth = /^\d{4}-\d{2}$/.test(monthParam)
  const selectedMonth = isValidMonth ? monthParam : todayMonth

  const prevMonth = offsetMonth(selectedMonth, -1)
  const nextMonth = offsetMonth(selectedMonth, +1)
  const isCurrentMonth = selectedMonth === todayMonth

  const supabase = await createClient()

  // Load reference data + expenses in parallel
  const [expensesResult, methodsData, headsData] = await Promise.all([
    getXrayExpenses(selectedMonth),
    supabase
      .from('cp_payment_methods')
      .select('*')
      .eq('is_enabled', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('cp_expense_heads')
      .select('*')
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ])

  const paymentMethods = (methodsData.data ?? []) as CpPaymentMethod[]
  const expenseHeads = (headsData.data ?? []) as CpExpenseHead[]

  const expensesData = expensesResult.success ? expensesResult.data : null

  // Determine if the user can add expenses
  const canAdd = authUser.profile.role === 'admin' || authUser.profile.role === 'accountant'

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
          <Receipt className="h-5 w-5 text-warning" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">X-Ray Expenses</h1>
          <p className="text-sm text-muted-foreground">
            Shared department costs split across active partners
          </p>
        </div>
      </div>

      {/* ── Month navigation ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Link
          href={`/xray/expenses?month=${prevMonth}`}
          className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
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
          href={`/xray/expenses?month=${nextMonth}`}
          className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>

        {!isCurrentMonth && (
          <Link
            href="/xray/expenses"
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
          >
            This Month
          </Link>
        )}
      </div>

      {/* ── Expense split component ──────────────────────────────────────────── */}
      {expensesData ? (
        <ExpenseSplit
          initialData={expensesData}
          paymentMethods={paymentMethods}
          expenseHeads={expenseHeads}
          defaultDate={today}
          canAdd={canAdd}
        />
      ) : (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">
            {expensesResult.success
              ? 'No data available.'
              : `Error: ${expensesResult.error}`}
          </p>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Helpers
// =============================================================================

/** Shift a YYYY-MM string by `months` months */
function offsetMonth(monthStr: string, months: number): string {
  const [year, mon] = monthStr.split('-').map(Number) as [number, number]
  const d = new Date(year, mon - 1 + months, 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** Format YYYY-MM as "June 2026" */
function formatMonthLabel(monthStr: string): string {
  const [year, mon] = monthStr.split('-').map(Number) as [number, number]
  return new Date(year, mon - 1, 1).toLocaleDateString('en-PK', {
    month: 'long',
    year: 'numeric',
  })
}
