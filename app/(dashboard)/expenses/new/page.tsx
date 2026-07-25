import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ExpenseForm } from '@/components/expenses/expense-form'
import { getTodayPKT } from '@/lib/utils'
import type { CpExpenseHead, CpPaymentMethod } from '@/types/index'

export const metadata: Metadata = {
  title: 'New Expense — ClinicPulse',
}

export default async function NewExpensePage() {
  const authUser = await requireAuth()

  // Only admin / accountant may add expenses
  if (
    authUser.profile.role !== 'admin' &&
    authUser.profile.role !== 'accountant'
  ) {
    redirect('/expenses')
  }

  const today = getTodayPKT()
  const supabase = await createClient()

  const [headsData, methodsData] = await Promise.all([
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

  const expenseHeads = (headsData.data ?? []) as CpExpenseHead[]
  const paymentMethods = (methodsData.data ?? []) as CpPaymentMethod[]

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* ── Back nav ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link
          href="/expenses"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          aria-label="Back to Expenses"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-bold text-foreground sm:text-xl">New Expense</h1>
      </div>

      {/* ── Form ─────────────────────────────────────────────────────────────── */}
      <ExpenseForm
        departments={[]}
        expenseHeads={expenseHeads}
        paymentMethods={paymentMethods}
        defaultDate={today}
      />
    </div>
  )
}
