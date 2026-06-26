import type { Metadata } from 'next'
import { AlertTriangle } from 'lucide-react'
import { ExpenseTracker } from '@/components/lab/expense-tracker'
import { getExpenses } from '@/app/actions/expenses'
import { getExpenseHeadsForLab } from '@/app/actions/lab'
import type { LabExpenseResult } from '@/app/actions/lab'
import { getActivePaymentMethods } from '@/app/actions/opd'
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
    getExpenses({ department: 'lab', month }),
    getExpenseHeadsForLab(),
    getActivePaymentMethods(),
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
  const paymentMethods = pmRes.success ? (pmRes.data as unknown as CpPaymentMethod[]) : []

  // Transform ExpenseWithRelations[] into LabExpenseResult for the ExpenseTracker component
  const labExpenseResult: LabExpenseResult = {
    entries: expensesRes.data.map((e) => ({
      id: e.id,
      expense_date: e.expense_date,
      expense_head_id: e.head_id,
      custom_head: null,
      amount: e.amount_paisas,
      description: e.description,
      receipt_url: null,
      payment_method_id: e.payment_method ?? null,
      created_by: e.created_by,
      created_at: e.created_at,
      updated_at: e.updated_at,
      deleted_at: null,
      expense_head_name: e.expense_head_name ?? e.head_name,
      payment_method_name: e.payment_method_name ?? e.payment_method ?? null,
    })),
    totalAmount: expensesRes.data.reduce((sum, e) => sum + e.amount_paisas, 0),
    byHead: expensesRes.data.reduce((acc, e) => {
      const key = e.head_name
      acc[key] = (acc[key] ?? 0) + e.amount_paisas
      return acc
    }, {} as Record<string, number>),
  }

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
        initialResult={labExpenseResult}
        expenseHeads={expenseHeads as CpExpenseHead[]}
        paymentMethods={paymentMethods}
        month={month}
      />
    </div>
  )
}
