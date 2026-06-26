'use client'

import React, { useState, useTransition } from 'react'
import { Plus, Receipt, Loader2, Users, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn, formatCurrencyPaisas, formatDate } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { recordXrayExpense } from '@/app/actions/xray'
import type { XrayExpensesData, XrayExpenseWithSplit } from '@/app/actions/xray'
import type { CpPaymentMethod, CpExpenseHead } from '@/types/index'

// =============================================================================
// Add-expense form state
// =============================================================================

interface ExpenseForm {
  expense_date: string
  expense_head_id: string
  custom_head: string
  amount_pkr: string
  description: string
  payment_method_id: string
}

type ExpenseFormErrors = Partial<Record<keyof ExpenseForm, string>>

// =============================================================================
// Props
// =============================================================================

interface ExpenseSplitProps {
  initialData: XrayExpensesData
  paymentMethods: CpPaymentMethod[]
  expenseHeads: CpExpenseHead[]
  /** Default today's date (YYYY-MM-DD) */
  defaultDate: string
  /** Whether the current user is allowed to add expenses */
  canAdd: boolean
}

// =============================================================================
// Component
// =============================================================================

export function ExpenseSplit({
  initialData,
  paymentMethods,
  expenseHeads,
  defaultDate,
  canAdd,
}: ExpenseSplitProps) {
  const [data, setData] = useState<XrayExpensesData>(initialData)
  const [showDialog, setShowDialog] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState<ExpenseForm>({
    expense_date: defaultDate,
    expense_head_id: '',
    custom_head: '',
    amount_pkr: '',
    description: '',
    payment_method_id: '',
  })

  const [formErrors, setFormErrors] = useState<ExpenseFormErrors>({})

  // ─── Form helpers ────────────────────────────────────────────────────────────

  function setField<K extends keyof ExpenseForm>(key: K, value: ExpenseForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFormErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const errors: ExpenseFormErrors = {}
    if (!form.amount_pkr || isNaN(parseFloat(form.amount_pkr)) || parseFloat(form.amount_pkr) <= 0) {
      errors.amount_pkr = 'Enter a valid positive amount'
    }
    if (!form.expense_head_id && !form.custom_head.trim()) {
      errors.expense_head_id = 'Select a category or enter a custom one'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  function resetForm() {
    setForm({
      expense_date: defaultDate,
      expense_head_id: '',
      custom_head: '',
      amount_pkr: '',
      description: '',
      payment_method_id: '',
    })
    setFormErrors({})
  }

  // ─── Submit ─────────────────────────────────────────────────────────────────

  function handleSubmit() {
    if (!validate()) return

    startTransition(async () => {
      const result = await recordXrayExpense({
        expense_date: form.expense_date,
        expense_head_id: form.expense_head_id || null,
        custom_head: form.custom_head.trim() || null,
        amount_pkr: form.amount_pkr,
        description: form.description.trim() || null,
        payment_method_id: form.payment_method_id || null,
      })

      if (result.success) {
        toast({
          title: 'Expense recorded',
          description: `Rs. ${parseFloat(form.amount_pkr).toLocaleString('en-PK')} added.`,
        })

        // Optimistically append the new expense to local state
        const headName =
          expenseHeads.find((h) => h.id === form.expense_head_id)?.name ??
          (form.custom_head || null)

        const newExpense: XrayExpenseWithSplit = {
          ...result.data,
          expense_head_name: headName,
          payment_method_name:
            paymentMethods.find((m) => m.id === form.payment_method_id)?.name ?? null,
          per_partner_amount:
            data.active_partner_count > 0
              ? Math.floor(result.data.amount / data.active_partner_count)
              : 0,
        }

        setData((prev) => {
          const newTotal = prev.total_amount + result.data.amount
          const newPerPartner =
            prev.active_partner_count > 0
              ? Math.floor(newTotal / prev.active_partner_count)
              : 0
          return {
            ...prev,
            expenses: [newExpense, ...prev.expenses],
            total_amount: newTotal,
            per_partner_total: newPerPartner,
          }
        })

        setShowDialog(false)
        resetForm()
      } else {
        toast({
          title: 'Failed to record expense',
          description: result.error,
          variant: 'destructive',
        })
      }
    })
  }

  // =============================================================================
  // Render
  // =============================================================================

  const { expenses, total_amount, active_partner_count, per_partner_total } = data

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
            Shared Expenses
          </p>
          <p className="mt-0.5 text-3xl font-bold text-foreground">
            {formatCurrencyPaisas(total_amount)}
          </p>
          {active_partner_count > 0 && (
            <div className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>
                {formatCurrencyPaisas(per_partner_total)} per partner
                {active_partner_count > 0 ? ` (÷ ${active_partner_count})` : ''}
              </span>
            </div>
          )}
        </div>

        {canAdd && (
          <Button
            onClick={() => setShowDialog(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Record Expense
          </Button>
        )}
      </div>

      {/* No partners warning */}
      {active_partner_count === 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
          <p className="text-xs text-warning">
            No active partners found. Configure partners in Settings to see per-partner splits.
          </p>
        </div>
      )}

      {/* ── Expenses table ───────────────────────────────────────────────────── */}
      {expenses.length === 0 ? (
        <Card className="border-dashed border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Receipt className="mb-2 h-7 w-7 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No expenses recorded this month.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border-border bg-card">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Expense Log
            </CardTitle>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="py-2.5 pl-4 pr-3 text-left text-xs font-semibold text-muted-foreground">
                    Date
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                    Category
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                    Description
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">
                    Amount
                  </th>
                  <th className="py-2.5 pl-3 pr-4 text-right text-xs font-semibold text-muted-foreground">
                    Per Partner
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expenses.map((expense) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    showPerPartner={active_partner_count > 0}
                  />
                ))}
              </tbody>
              {/* Totals footer */}
              <tfoot>
                <tr className="border-t border-border bg-muted/20">
                  <td
                    colSpan={3}
                    className="py-2.5 pl-4 pr-3 text-xs font-semibold text-muted-foreground"
                  >
                    Total
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm font-bold text-primary">
                    {formatCurrencyPaisas(total_amount)}
                  </td>
                  {active_partner_count > 0 && (
                    <td className="py-2.5 pl-3 pr-4 text-right text-sm font-bold text-muted-foreground">
                      {formatCurrencyPaisas(per_partner_total)}
                    </td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* ── Add Expense Dialog ───────────────────────────────────────────────── */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Record X-Ray Expense</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Date */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={form.expense_date}
                onChange={(e) => setField('expense_date', e.target.value)}
                disabled={isPending}
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.expense_head_id}
                onValueChange={(v) => setField('expense_head_id', v)}
                disabled={isPending}
              >
                <SelectTrigger
                  className={cn(formErrors.expense_head_id && 'border-destructive')}
                >
                  <SelectValue placeholder="Select category…" />
                </SelectTrigger>
                <SelectContent>
                  {expenseHeads
                    .filter((h) => h.is_active)
                    .map((head) => (
                      <SelectItem key={head.id} value={head.id}>
                        {head.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {formErrors.expense_head_id && (
                <p className="text-xs text-destructive">{formErrors.expense_head_id}</p>
              )}
            </div>

            {/* Custom category */}
            {!form.expense_head_id && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Custom Category
                </Label>
                <Input
                  value={form.custom_head}
                  onChange={(e) => setField('custom_head', e.target.value)}
                  placeholder="e.g. Film development"
                  disabled={isPending}
                />
              </div>
            )}

            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Amount (PKR) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  Rs.
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={form.amount_pkr}
                  onChange={(e) => setField('amount_pkr', e.target.value)}
                  placeholder="0.00"
                  className={cn('pl-9', formErrors.amount_pkr && 'border-destructive')}
                  disabled={isPending}
                />
              </div>
              {formErrors.amount_pkr && (
                <p className="text-xs text-destructive">{formErrors.amount_pkr}</p>
              )}
              {form.amount_pkr &&
                !isNaN(parseFloat(form.amount_pkr)) &&
                active_partner_count > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Per partner:{' '}
                    {formatCurrencyPaisas(
                      Math.floor((parseFloat(form.amount_pkr) * 100) / active_partner_count)
                    )}
                  </p>
                )}
            </div>

            {/* Payment method */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Payment Method</Label>
              <Select
                value={form.payment_method_id}
                onValueChange={(v) => setField('payment_method_id', v)}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method…" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods
                    .filter((m) => m.is_active)
                    .map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder="Optional notes…"
                rows={2}
                className="resize-none"
                disabled={isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false)
                resetForm()
              }}
              disabled={isPending}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Record Expense'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =============================================================================
// ExpenseRow sub-component
// =============================================================================

function ExpenseRow({
  expense,
  showPerPartner,
}: {
  expense: XrayExpenseWithSplit
  showPerPartner: boolean
}) {
  const categoryLabel =
    expense.expense_head_name ?? expense.custom_head ?? '—'

  return (
    <tr className="transition-colors hover:bg-muted/20">
      <td className="py-3 pl-4 pr-3 text-xs text-muted-foreground whitespace-nowrap">
        {formatDate(expense.expense_date, 'dd MMM')}
      </td>
      <td className="px-3 py-3">
        <span className="inline-block rounded-full bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {categoryLabel}
        </span>
      </td>
      <td className="px-3 py-3">
        {expense.description ? (
          <span className="text-xs text-foreground">{expense.description}</span>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-right text-sm font-medium text-foreground">
        {formatCurrencyPaisas(expense.amount)}
      </td>
      {showPerPartner && (
        <td className="py-3 pl-3 pr-4 text-right text-sm font-medium text-muted-foreground">
          {formatCurrencyPaisas(expense.per_partner_amount)}
        </td>
      )}
    </tr>
  )
}
