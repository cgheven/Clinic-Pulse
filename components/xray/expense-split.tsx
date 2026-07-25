'use client'

import React, { useState, useTransition } from 'react'
import { Plus, Receipt, Loader2, Users, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateInput } from '@/components/ui/date-input'
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

        const headName =
          expenseHeads.find((h) => h.id === form.expense_head_id)?.name ??
          (form.custom_head || null)

        const newExpense: XrayExpenseWithSplit = {
          ...result.data,
          expense_head_name: headName,
          payment_method_name:
            paymentMethods.find((m) => m.id === form.payment_method_id)?.label ?? null,
          per_partner_amount:
            data.active_partner_count > 0
              ? Math.floor(result.data.amount_paisas / data.active_partner_count)
              : 0,
        }

        setData((prev) => {
          const newTotal = prev.total_amount + result.data.amount_paisas
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
    <div className="space-y-4">
      {/* ── Summary stat chips ───────────────────────────────────────────────── */}
      <div className={cn('grid gap-2', active_partner_count > 0 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2')}>
        <StatChip
          icon={Receipt}
          iconBg="bg-warning/10"
          iconColor="text-warning"
          label="Total Expenses"
          value={formatCurrencyPaisas(total_amount)}
        />
        {active_partner_count > 0 && (
          <StatChip
            icon={Users}
            iconBg="bg-info/10"
            iconColor="text-info"
            label={`Per Partner (÷${active_partner_count})`}
            value={formatCurrencyPaisas(per_partner_total)}
          />
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

      {/* ── Expense panel table ──────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Section header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Expense Log
          </span>
          {canAdd && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-[12px]" onClick={() => setShowDialog(true)}>
              <Plus className="mr-1 h-3 w-3" />
              Add Expense
            </Button>
          )}
        </div>

        {expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Receipt className="h-7 w-7 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No expenses recorded this month.</p>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="flex items-center border-b border-border/50 px-4 py-1.5">
              <span className="w-[68px] shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                Date
              </span>
              <span className="flex-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                Description
              </span>
              <span className="hidden sm:block w-[110px] shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                Category
              </span>
              <span className="w-[90px] shrink-0 text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                Amount
              </span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-border/50">
              {expenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  showPerPartner={active_partner_count > 0}
                />
              ))}
            </div>

            {/* Footer total */}
            <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-2.5">
              <div>
                <span className="text-xs font-semibold text-muted-foreground">Total</span>
                {active_partner_count > 0 && (
                  <span className="ml-2 text-[11px] text-muted-foreground">
                    · {formatCurrencyPaisas(per_partner_total)} per partner
                  </span>
                )}
              </div>
              <span className="text-sm font-bold tabular-nums text-primary">
                {formatCurrencyPaisas(total_amount)}
              </span>
            </div>
          </>
        )}
      </div>

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
              <DateInput
                value={form.expense_date}
                onChange={(v) => setField('expense_date', v)}
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
                <Label className="text-xs text-muted-foreground">Custom Category</Label>
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
                    .filter((m) => m.is_enabled)
                    .map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.label}
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
// ExpenseRow — flex-based panel row
// =============================================================================

function ExpenseRow({
  expense,
  showPerPartner,
}: {
  expense: XrayExpenseWithSplit
  showPerPartner: boolean
}) {
  const categoryLabel = expense.expense_head_name ?? expense.head_name ?? '—'

  return (
    <div className="flex items-center px-4 py-2.5 hover:bg-muted/20 transition-colors">
      {/* Date */}
      <span className="w-[68px] shrink-0 text-[12px] text-muted-foreground">
        {formatDate(expense.expense_date, 'dd MMM')}
      </span>

      {/* Description + mobile category */}
      <div className="flex-1 min-w-0">
        {expense.description ? (
          <p className="truncate text-sm text-foreground">{expense.description}</p>
        ) : (
          <p className="text-sm text-muted-foreground/40">—</p>
        )}
        <span className="sm:hidden inline-block rounded-full bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {categoryLabel}
        </span>
      </div>

      {/* Category (desktop) */}
      <div className="hidden sm:block w-[110px] shrink-0">
        <span className="inline-block rounded-full bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {categoryLabel}
        </span>
      </div>

      {/* Amount */}
      <div className="w-[90px] shrink-0 text-right">
        <p className="text-sm font-medium tabular-nums text-foreground">
          {formatCurrencyPaisas(expense.amount_paisas)}
        </p>
        {showPerPartner && (
          <p className="text-[11px] text-muted-foreground">
            {formatCurrencyPaisas(expense.per_partner_amount)} ea
          </p>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// StatChip
// =============================================================================

function StatChip({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
}: {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
          {label}
        </p>
        <p className="text-sm font-bold tabular-nums text-foreground">{value}</p>
      </div>
    </div>
  )
}
