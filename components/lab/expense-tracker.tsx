'use client'

import React, { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrencyPaisas, formatDate } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { Loader2, Plus, Receipt, TrendingDown } from 'lucide-react'
import type { LabExpenseEntry, LabExpenseResult } from '@/app/actions/lab'
import { addLabExpense } from '@/app/actions/lab'
import type { CpExpenseHead, CpPaymentMethod } from '@/types/index'

// =============================================================================
// Props
// =============================================================================

interface ExpenseTrackerProps {
  initialResult: LabExpenseResult
  expenseHeads: CpExpenseHead[]
  paymentMethods: CpPaymentMethod[]
  month: string
}

// =============================================================================
// Add expense form state
// =============================================================================

interface AddExpenseForm {
  expense_date: string
  expense_head_id: string
  custom_head: string
  amount: string // PKR string
  description: string
  payment_method_id: string
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]!
}

const DEFAULT_FORM: AddExpenseForm = {
  expense_date: todayISO(),
  expense_head_id: '',
  custom_head: '',
  amount: '',
  description: '',
  payment_method_id: '',
}

// =============================================================================
// ExpenseTracker
// =============================================================================

export function ExpenseTracker({
  initialResult,
  expenseHeads,
  paymentMethods,
  month,
}: ExpenseTrackerProps) {
  const [result, setResult] = useState<LabExpenseResult>(initialResult)
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState<AddExpenseForm>(DEFAULT_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof AddExpenseForm, string>>>({})
  const [isPending, setIsPending] = useState(false)
  const [, startTransition] = useTransition()

  function setField<K extends keyof AddExpenseForm>(key: K, value: AddExpenseForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof AddExpenseForm, string>> = {}

    if (!form.expense_date) newErrors.expense_date = 'Date is required'
    if (!form.amount || parseFloat(form.amount) <= 0) {
      newErrors.amount = 'Enter a valid amount'
    }
    if (!form.expense_head_id && !form.custom_head.trim()) {
      newErrors.custom_head = 'Select an expense head or enter a custom one'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSubmit() {
    if (!validate()) return

    const amountPaisas = Math.round(parseFloat(form.amount) * 100)

    setIsPending(true)
    startTransition(async () => {
      const result = await addLabExpense({
        expense_date: form.expense_date,
        expense_head_id: form.expense_head_id || undefined,
        custom_head: form.custom_head || undefined,
        amount: amountPaisas,
        description: form.description || undefined,
        payment_method_id: form.payment_method_id || undefined,
      })

      setIsPending(false)

      if (result.success) {
        toast({ title: 'Expense recorded', description: 'Lab expense added successfully.' })
        setShowDialog(false)
        setForm(DEFAULT_FORM)
        // Reload result — simple optimistic add
        const headName =
          expenseHeads.find((h) => h.id === form.expense_head_id)?.name ??
          (form.custom_head || 'Other')
        const pmName =
          paymentMethods.find((m) => m.id === form.payment_method_id)?.label ?? null

        const newEntry: LabExpenseEntry = {
          id: crypto.randomUUID(),
          expense_date: form.expense_date,
          expense_head_id: form.expense_head_id || null,
          custom_head: form.custom_head || null,
          amount: amountPaisas,
          description: form.description || null,
          receipt_url: null,
          payment_method_id: form.payment_method_id || null,
          created_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
          expense_head_name: headName,
          payment_method_name: pmName,
        }

        setResult((prev) => ({
          entries: [newEntry, ...prev.entries],
          totalAmount: prev.totalAmount + amountPaisas,
          byHead: {
            ...prev.byHead,
            [headName]: (prev.byHead[headName] ?? 0) + amountPaisas,
          },
        }))
      } else {
        toast({ title: 'Failed', description: result.error, variant: 'destructive' })
      }
    })
  }

  const sortedHeads = Object.entries(result.byHead).sort(([, a], [, b]) => b - a)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            Total Expenses ({month})
          </p>
          <p className="text-2xl font-bold text-destructive">
            {formatCurrencyPaisas(result.totalAmount)}
          </p>
        </div>
        <Button
          onClick={() => setShowDialog(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add Expense
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* By head breakdown */}
        <Card className="border-border bg-card lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">
              By Category
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedHeads.length === 0 ? (
              <p className="text-xs text-muted-foreground">No expenses this month</p>
            ) : (
              sortedHeads.map(([head, amount]) => (
                <div key={head} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground truncate max-w-[60%]">
                    {head}
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    {formatCurrencyPaisas(Number(amount))}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Expense table */}
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-foreground">
              Expense Log
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {result.entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
                <Receipt className="h-7 w-7 opacity-30" />
                <p className="text-sm">No expenses recorded this month</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="py-2.5 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Date
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Head
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                        Description
                      </th>
                      <th className="py-2.5 pl-3 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.entries.map((e: LabExpenseEntry) => (
                      <tr key={e.id} className="hover:bg-muted/10 transition-colors">
                        <td className="py-3 pl-4 pr-3 text-xs text-muted-foreground">
                          {formatDate(e.expense_date)}
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-sm font-medium text-foreground">
                            {e.expense_head_name ?? 'Other'}
                          </span>
                          {e.payment_method_name && (
                            <p className="text-[10px] text-muted-foreground">
                              via {e.payment_method_name}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                          {e.description ?? '—'}
                        </td>
                        <td className="py-3 pl-3 pr-4 text-right font-medium text-destructive">
                          {formatCurrencyPaisas(e.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-muted/20">
                      <td
                        colSpan={3}
                        className="py-2.5 pl-4 pr-3 text-xs font-semibold text-muted-foreground"
                      >
                        Total
                      </td>
                      <td className="py-2.5 pl-3 pr-4 text-right text-sm font-bold text-destructive">
                        {formatCurrencyPaisas(result.totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add expense dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Record Lab Expense
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="exp-date" className="text-xs text-muted-foreground">
                Date *
              </Label>
              <Input
                id="exp-date"
                type="date"
                value={form.expense_date}
                onChange={(e) => setField('expense_date', e.target.value)}
                className={cn(errors.expense_date && 'border-destructive')}
              />
              {errors.expense_date && (
                <p className="text-xs text-destructive">{errors.expense_date}</p>
              )}
            </div>

            {/* Expense head select */}
            <div className="space-y-1.5">
              <Label htmlFor="exp-head" className="text-xs text-muted-foreground">
                Expense Head
              </Label>
              <Select
                value={form.expense_head_id}
                onValueChange={(v) => setField('expense_head_id', v)}
              >
                <SelectTrigger id="exp-head" className="bg-input">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Custom (enter below)</SelectItem>
                  {expenseHeads.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom head (shown when no head selected) */}
            {!form.expense_head_id && (
              <div className="space-y-1.5">
                <Label htmlFor="exp-custom" className="text-xs text-muted-foreground">
                  Custom Category *
                </Label>
                <Input
                  id="exp-custom"
                  value={form.custom_head}
                  onChange={(e) => setField('custom_head', e.target.value)}
                  placeholder="e.g. CBC Kit Purchase"
                  className={cn(errors.custom_head && 'border-destructive')}
                />
                {errors.custom_head && (
                  <p className="text-xs text-destructive">{errors.custom_head}</p>
                )}
              </div>
            )}

            {/* Amount + Payment method */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exp-amount" className="text-xs text-muted-foreground">
                  Amount (Rs.) *
                </Label>
                <Input
                  id="exp-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setField('amount', e.target.value)}
                  placeholder="0"
                  className={cn(errors.amount && 'border-destructive')}
                />
                {errors.amount && (
                  <p className="text-xs text-destructive">{errors.amount}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="exp-pm" className="text-xs text-muted-foreground">
                  Payment Method
                </Label>
                <Select
                  value={form.payment_method_id}
                  onValueChange={(v) => setField('payment_method_id', v)}
                >
                  <SelectTrigger id="exp-pm" className="bg-input">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="exp-desc" className="text-xs text-muted-foreground">
                Description
              </Label>
              <Textarea
                id="exp-desc"
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder="Optional notes about this expense…"
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
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
                'Save Expense'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
