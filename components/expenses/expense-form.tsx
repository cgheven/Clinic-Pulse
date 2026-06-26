'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  Receipt,
  CalendarDays,
  Building2,
  Tag,
  CreditCard,
  FileText,
  DollarSign,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { createExpense } from '@/app/actions/expenses'
import type { CpDepartment, CpExpenseHead, CpPaymentMethod } from '@/types/index'

// =============================================================================
// Types
// =============================================================================

interface ExpenseFormState {
  expense_date: string
  department_id: string
  expense_head_id: string
  custom_head: string
  amount_pkr: string
  description: string
  payment_method_id: string
}

type FormErrors = Partial<Record<keyof ExpenseFormState, string>>

interface ExpenseFormProps {
  departments: CpDepartment[]
  expenseHeads: CpExpenseHead[]
  paymentMethods: CpPaymentMethod[]
  defaultDate: string
}

// =============================================================================
// Component
// =============================================================================

export function ExpenseForm({
  departments,
  expenseHeads,
  paymentMethods,
  defaultDate,
}: ExpenseFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState<ExpenseFormState>({
    expense_date: defaultDate,
    department_id: '',
    expense_head_id: '',
    custom_head: '',
    amount_pkr: '',
    description: '',
    payment_method_id: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function setField<K extends keyof ExpenseFormState>(
    key: K,
    value: ExpenseFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const errs: FormErrors = {}

    if (!form.expense_date) {
      errs.expense_date = 'Date is required'
    }
    if (!form.amount_pkr || isNaN(parseFloat(form.amount_pkr)) || parseFloat(form.amount_pkr) <= 0) {
      errs.amount_pkr = 'Enter a valid positive amount'
    }
    if (!form.description.trim()) {
      errs.description = 'Description is required'
    }
    if (!form.expense_head_id && !form.custom_head.trim()) {
      errs.expense_head_id = 'Select a category or enter a custom one'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ─── Submit ──────────────────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    startTransition(async () => {
      const result = await createExpense({
        expense_date: form.expense_date,
        department_id: form.department_id || null,
        expense_head_id: form.expense_head_id || null,
        custom_head: form.custom_head.trim() || null,
        amount_pkr: form.amount_pkr,
        description: form.description.trim(),
        payment_method_id: form.payment_method_id || null,
      })

      if (result.success) {
        toast({
          title: 'Expense recorded',
          description: `Rs. ${parseFloat(form.amount_pkr).toLocaleString('en-PK')} expense added successfully.`,
        })
        router.push('/expenses')
      } else {
        toast({
          title: 'Failed to record expense',
          description: result.error,
          variant: 'destructive',
        })
      }
    })
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  const showCustomHead = !form.expense_head_id

  return (
    <Card className="border-border bg-card">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Receipt className="h-4.5 w-4.5 text-primary" />
          </div>
          <CardTitle className="text-base font-semibold text-foreground">
            New Expense
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Row 1: Date + Amount */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Date */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={form.expense_date}
                onChange={(e) => setField('expense_date', e.target.value)}
                disabled={isPending}
                className={cn(errors.expense_date && 'border-destructive')}
              />
              {errors.expense_date && (
                <p className="text-xs text-destructive">{errors.expense_date}</p>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5" />
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
                  disabled={isPending}
                  className={cn('pl-9', errors.amount_pkr && 'border-destructive')}
                />
              </div>
              {errors.amount_pkr && (
                <p className="text-xs text-destructive">{errors.amount_pkr}</p>
              )}
            </div>
          </div>

          {/* Row 2: Department */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              Department
            </Label>
            <Select
              value={form.department_id}
              onValueChange={(v) => setField('department_id', v)}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="General / Admin (no department)" />
              </SelectTrigger>
              <SelectContent>
                {departments
                  .filter((d) => d.is_active && !d.deleted_at)
                  .map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Row 3: Category */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Tag className="h-3.5 w-3.5" />
              Category <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.expense_head_id}
              onValueChange={(v) => setField('expense_head_id', v)}
              disabled={isPending}
            >
              <SelectTrigger
                className={cn(errors.expense_head_id && 'border-destructive')}
              >
                <SelectValue placeholder="Select category…" />
              </SelectTrigger>
              <SelectContent>
                {expenseHeads
                  .filter((h) => h.is_active && !h.deleted_at)
                  .map((head) => (
                    <SelectItem key={head.id} value={head.id}>
                      {head.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {errors.expense_head_id && (
              <p className="text-xs text-destructive">{errors.expense_head_id}</p>
            )}
          </div>

          {/* Custom category — only shown when no standard category selected */}
          {showCustomHead && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Custom Category
              </Label>
              <Input
                value={form.custom_head}
                onChange={(e) => setField('custom_head', e.target.value)}
                placeholder="e.g. Cleaning supplies"
                disabled={isPending}
              />
              <p className="text-[11px] text-muted-foreground/70">
                Use this when the standard categories don't apply.
              </p>
            </div>
          )}

          {/* Row 4: Payment Method */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5" />
              Payment Method
            </Label>
            <Select
              value={form.payment_method_id}
              onValueChange={(v) => setField('payment_method_id', v)}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method…" />
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

          {/* Row 5: Description */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Brief description of the expense…"
              rows={3}
              disabled={isPending}
              className={cn('resize-none', errors.description && 'border-destructive')}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isPending}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Receipt className="mr-2 h-4 w-4" />
                  Record Expense
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
