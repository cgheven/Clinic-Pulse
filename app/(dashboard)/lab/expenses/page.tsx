import type { Metadata } from 'next'
import { AlertTriangle } from 'lucide-react'
import { ExpenseTracker } from '@/components/lab/expense-tracker'
import {
  getLabExpenses,
  getExpenseHeadsForLab,
  getPaymentMethodsForLab,
} from '@/app/actions/lab'
import type { CpExpenseHead, CpPaymentMethod } from '@/types/index'

export const metadata: Metadata = {
  title: 'Lab Expenses',
}

function currentMonthISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export default async function LabExpensesPage() {
  const month = currentMonthISO()

  const [expensesRes, headsRes, pmRes] = await Promise.all([
    getLabExpenses(month),
    getExpenseHeadsForLab(),
    getPaymentMethodsForLab(),
  ])

  if (!expensesRes.success) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive">{expensesRes.error}</p>
      </div>
    )
  }

  const expenseHeads = headsRes.success ? headsRes.data : []
  const paymentMethods = pmRes.success ? (pmRes.data as CpPaymentMethod[]) : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Lab Expenses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track and record laboratory-specific expenditures
        </p>
      </div>

      <ExpenseTracker
        initialResult={expensesRes.data}
        expenseHeads={expenseHeads as CpExpenseHead[]}
        paymentMethods={paymentMethods}
        month={month}
      />
    </div>
  )
}
