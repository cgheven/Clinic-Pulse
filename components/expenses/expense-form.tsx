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
import { Card, CardContent } from '@/components/ui/card'
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
import type { CpExpenseHead, CpPaymentMethod } from '@/types/index'

// =============================================================================
// Constants
// =============================================================================

const DEPARTMENT_OPTIONS = [
  { value: 'general', label: 'General / Admin' },
  { value: 'opd', label: 'OPD' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'lab', label: 'Lab' },
  { value: 'xray', label: 'X-Ray' },
] as const

// =============================================================================
// Types
// =============================================================================

interface ExpenseFormState {
  expense_date: string
  department: string
  head_id: string
  amount_pkr: string
  description: string
  payment_method: string
}

type FormErrors = Partial<Record<keyof ExpenseFormState, string>>

interface ExpenseFormProps {
  /** Unused — kept for backward compat with existing callers that pass departments={[]} */
  departments?: unknown[]
  expenseHeads: CpExpenseHead[]
  paymentMethods: CpPaymentMethod[]
  defaultDate: string
}

// =============================================================================
// Component
// =============================================================================

export function ExpenseForm({
  expenseHeads,
  paymentMethods,
  defaultDate,
}: ExpenseFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState<ExpenseFormState>({
    expense_date: defaultDate,
    department: '',
    head_id: '',
    amount_pkr: '',
    description: '',
    payment_method: '',
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
        department: form.department || null,
        head_id: form.head_id || null,
        amount_pkr: form.amount_pkr,
        description: form.description.trim(),
        payment_method: form.payment_method || null,
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

  return (
    <Card className="border-border bg-card">
      <CardContent className="pt-5">
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
              value={form.department}
              onValueChange={(v) => setField('department', v)}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="General / Admin (no department)" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENT_OPTIONS.map((dept) => (
                  <SelectItem key={dept.value} value={dept.value}>
                    {dept.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Row 3: Category */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Tag className="h-3.5 w-3.5" />
              Category
            </Label>
            <Select
              value={form.head_id}
              onValueChange={(v) => setField('head_id', v)}
              disabled={isPending}
            >
              <SelectTrigger
                className={cn(errors.head_id && 'border-destructive')}
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
            {errors.head_id && (
              <p className="text-xs text-destructive">{errors.head_id}</p>
            )}
          </div>

          {/* Row 4: Payment Method */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5" />
              Payment Method
            </Label>
            <Select
              value={form.payment_method}
              onValueChange={(v) => setField('payment_method', v)}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method…" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods
                  .filter((m) => m.is_enabled)
                  .map((method) => (
                    <SelectItem key={method.method} value={method.method}>
                      {method.label}
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
              size="sm"
              onClick={() => router.back()}
              disabled={isPending}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
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
