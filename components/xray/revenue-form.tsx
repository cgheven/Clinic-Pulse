'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { Loader2, Zap, AlertTriangle } from 'lucide-react'
import { recordRevenue } from '@/app/actions/xray'
import type { CpPaymentMethod } from '@/types/index'

// =============================================================================
// Constants
// =============================================================================

const XRAY_SERVICE_TYPES = [
  'Chest X-Ray',
  'Cervical Spine X-Ray',
  'Lumbar Spine X-Ray',
  'Dorsal Spine X-Ray',
  'Knee X-Ray',
  'Hand / Wrist X-Ray',
  'Foot / Ankle X-Ray',
  'Hip X-Ray',
  'Shoulder X-Ray',
  'Elbow X-Ray',
  'Abdomen X-Ray',
  'Pelvis X-Ray',
  'Skull X-Ray',
  'Forearm X-Ray',
  'Leg X-Ray',
  'Other',
] as const

// =============================================================================
// Form schema (client-side validation)
// =============================================================================

const clientSchema = z.object({
  revenue_date: z.string().min(1, 'Date is required'),
  service_type: z.string().min(1, 'Service type is required'),
  patient_name: z.string().optional(),
  gross_amount_pkr: z
    .string()
    .min(1, 'Amount is required')
    .refine(
      (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
      'Enter a valid positive amount'
    ),
  patient_count: z
    .string()
    .refine(
      (v) => !isNaN(parseInt(v, 10)) && parseInt(v, 10) >= 1,
      'Must be at least 1'
    ),
  payment_method: z.string().nullable().optional(),
  notes: z.string().optional(),
})

type FormValues = {
  revenue_date: string
  service_type: string
  patient_name: string
  gross_amount_pkr: string
  patient_count: string
  payment_method: string
  notes: string
}

type FormErrors = Partial<Record<keyof FormValues, string>>

// =============================================================================
// Props
// =============================================================================

interface RevenueFormProps {
  paymentMethods: CpPaymentMethod[]
  /** Today's date as YYYY-MM-DD; used as default */
  defaultDate: string
  /** Called after a successful save — parent can redirect or refresh */
  onSuccess?: () => void
}

// =============================================================================
// Component
// =============================================================================

export function RevenueForm({ paymentMethods, defaultDate, onSuccess }: RevenueFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDue, setIsDue] = useState(false)

  const [form, setForm] = useState<FormValues>({
    revenue_date: defaultDate,
    service_type: '',
    patient_name: '',
    gross_amount_pkr: '',
    patient_count: '1',
    payment_method: '',
    notes: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const result = clientSchema.safeParse(form)
    if (result.success) return true

    const newErrors: FormErrors = {}
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof FormValues | undefined
      if (field) newErrors[field] = issue.message
    }
    setErrors(newErrors)
    return false
  }

  // ─── Submit ─────────────────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    startTransition(async () => {
      const result = await recordRevenue({
        revenue_date: form.revenue_date,
        service_type: form.service_type,
        patient_name: form.patient_name || undefined,
        gross_amount_pkr: form.gross_amount_pkr,
        payment_method: isDue ? null : (form.payment_method || null),
        payment_status: isDue ? 'due' : 'paid',
        notes: form.notes || null,
      })

      if (result.success) {
        toast({
          title: 'Revenue recorded',
          description: `${form.service_type} — Rs. ${parseFloat(form.gross_amount_pkr).toLocaleString('en-PK')}`,
        })

        if (onSuccess) {
          onSuccess()
        } else {
          router.push('/xray/revenue')
          router.refresh()
        }
      } else {
        toast({
          title: 'Failed to record revenue',
          description: result.error,
          variant: 'destructive',
        })
      }
    })
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Row: Date + Patient Name */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="revenue_date" className="text-xs text-muted-foreground">
            Date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="revenue_date"
            type="date"
            value={form.revenue_date}
            onChange={(e) => setField('revenue_date', e.target.value)}
            className={cn(errors.revenue_date && 'border-destructive')}
            disabled={isPending}
          />
          {errors.revenue_date && (
            <p className="text-xs text-destructive">{errors.revenue_date}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="patient_name" className="text-xs text-muted-foreground">
            Patient Name
          </Label>
          <Input
            id="patient_name"
            value={form.patient_name}
            onChange={(e) => setField('patient_name', e.target.value)}
            placeholder="e.g. Ahmed Khan"
            disabled={isPending}
          />
        </div>
      </div>

      {/* Service Type */}
      <div className="space-y-1.5">
        <Label htmlFor="service_type" className="text-xs text-muted-foreground">
          Service Type <span className="text-destructive">*</span>
        </Label>
        <Select
          value={form.service_type}
          onValueChange={(v) => setField('service_type', v)}
          disabled={isPending}
        >
          <SelectTrigger
            id="service_type"
            className={cn(errors.service_type && 'border-destructive')}
          >
            <SelectValue placeholder="Select X-Ray service…" />
          </SelectTrigger>
          <SelectContent>
            {XRAY_SERVICE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.service_type && (
          <p className="text-xs text-destructive">{errors.service_type}</p>
        )}
      </div>

      {/* Row: Amount + Patient Count */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="gross_amount_pkr" className="text-xs text-muted-foreground">
            Amount (PKR) <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              Rs.
            </span>
            <Input
              id="gross_amount_pkr"
              type="text"
              inputMode="decimal"
              value={form.gross_amount_pkr}
              onChange={(e) => setField('gross_amount_pkr', e.target.value)}
              placeholder="0.00"
              className={cn('pl-9', errors.gross_amount_pkr && 'border-destructive')}
              disabled={isPending}
            />
          </div>
          {errors.gross_amount_pkr && (
            <p className="text-xs text-destructive">{errors.gross_amount_pkr}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="patient_count" className="text-xs text-muted-foreground">
            Patient Count
          </Label>
          <Input
            id="patient_count"
            type="number"
            min={1}
            max={1000}
            value={form.patient_count}
            onChange={(e) => setField('patient_count', e.target.value)}
            className={cn(errors.patient_count && 'border-destructive')}
            disabled={isPending}
          />
          {errors.patient_count && (
            <p className="text-xs text-destructive">{errors.patient_count}</p>
          )}
        </div>
      </div>

      {/* Mark as Due */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsDue((p) => !p)}
        onKeyDown={(e) => e.key === 'Enter' && setIsDue((p) => !p)}
        className={cn(
          'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors select-none',
          isDue
            ? 'border-amber-500/40 bg-amber-500/10'
            : 'border-border bg-card hover:bg-accent/40'
        )}
      >
        <div
          className={cn(
            'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
            isDue ? 'border-amber-500 bg-amber-500' : 'border-muted-foreground/40'
          )}
        >
          {isDue && <AlertTriangle className="h-2.5 w-2.5 text-white" />}
        </div>
        <div>
          <p className={cn('text-sm font-medium', isDue ? 'text-amber-600' : 'text-foreground')}>
            Mark as Due (Credit)
          </p>
          <p className="text-xs text-muted-foreground">
            Payment will be collected later — no payment method needed
          </p>
        </div>
      </div>

      {/* Payment Method — hidden when marked as due */}
      {!isDue && (
        <div className="space-y-1.5">
          <Label htmlFor="payment_method" className="text-xs text-muted-foreground">
            Payment Method
          </Label>
          <Select
            value={form.payment_method}
            onValueChange={(v) => setField('payment_method', v)}
            disabled={isPending}
          >
            <SelectTrigger id="payment_method">
              <SelectValue placeholder="Select method…" />
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
      )}

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes" className="text-xs text-muted-foreground">
          Notes
        </Label>
        <Textarea
          id="notes"
          value={form.notes}
          onChange={(e) => setField('notes', e.target.value)}
          placeholder="Optional notes…"
          rows={2}
          className="resize-none"
          disabled={isPending}
        />
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
              Recording…
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Record Revenue
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
