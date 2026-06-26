import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, Receipt } from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ExpenseForm } from '@/components/expenses/expense-form'
import { getTodayPKT } from '@/lib/utils'
import type { CpDepartment, CpExpenseHead, CpPaymentMethod } from '@/types/index'

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

  const [departmentsData, headsData, methodsData] = await Promise.all([
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

  const departments = (departmentsData.data ?? []) as CpDepartment[]
  const expenseHeads = (headsData.data ?? []) as CpExpenseHead[]
  const paymentMethods = (methodsData.data ?? []) as CpPaymentMethod[]

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* ── Back nav ─────────────────────────────────────────────────────────── */}
      <Link
        href="/expenses"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Expenses
      </Link>

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Receipt className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Record Expense</h1>
          <p className="text-sm text-muted-foreground">
            Add a new cross-department expense entry
          </p>
        </div>
      </div>

      {/* ── Form ─────────────────────────────────────────────────────────────── */}
      <ExpenseForm
        departments={departments}
        expenseHeads={expenseHeads}
        paymentMethods={paymentMethods}
        defaultDate={today}
      />
    </div>
  )
}
