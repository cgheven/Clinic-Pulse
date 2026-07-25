'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateInput } from '@/components/ui/date-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { ArrowLeft, FlaskConical, Loader2 } from 'lucide-react'
import Link from 'next/link'
import {
  getTestCatalog,
  recordTest,
} from '@/app/actions/lab'
import { getActivePaymentMethods } from '@/app/actions/opd'
import type { CpLabTest } from '@/types/index'

// =============================================================================
// Form state
// =============================================================================

interface FormState {
  test_date: string
  test_id: string
  patient_name: string
  qty: string
  unit_price: string // PKR display, converted to price_paisas on submit
  result: string
  notes: string
  payment_method: string // PaymentMethodEnum value
  payment_status: 'pending' | 'completed' | 'refunded'
}

type FormErrors = Partial<Record<keyof FormState, string>>

function todayISO(): string {
  return new Date().toISOString().split('T')[0]!
}

const DEFAULT_FORM: FormState = {
  test_date: todayISO(),
  test_id: '',
  patient_name: '',
  qty: '1',
  unit_price: '',
  result: '',
  notes: '',
  payment_method: '',
  payment_status: 'completed',
}

// =============================================================================
// Page
// =============================================================================

export default function NewTestPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [tests, setTests] = useState<CpLabTest[]>([])
  const [paymentMethods, setPaymentMethods] = useState<Array<{ method: string; label: string }>>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [, startTransition] = useTransition()

  // Fetch catalog + payment methods on mount
  useEffect(() => {
    async function loadData() {
      const [testsRes, pmRes] = await Promise.all([
        getTestCatalog(),
        getActivePaymentMethods(),
      ])
      if (testsRes.success) setTests(testsRes.data)
      if (pmRes.success) setPaymentMethods(pmRes.data)
      setIsLoadingData(false)
    }
    void loadData()
  }, [])

  // Auto-fill unit price when test changes
  function handleTestChange(testId: string) {
    const test = tests.find((t) => t.id === testId)
    setForm((prev) => ({
      ...prev,
      test_id: testId,
      unit_price: test ? (test.price_paisas / 100).toFixed(2) : '',
    }))
    setErrors((prev) => ({ ...prev, test_id: undefined, unit_price: undefined }))
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const newErrors: FormErrors = {}

    if (!form.test_date) newErrors.test_date = 'Date is required'
    if (!form.test_id) newErrors.test_id = 'Select a test'
    if (!form.qty || parseInt(form.qty) < 1) {
      newErrors.qty = 'Quantity must be at least 1'
    }
    if (form.unit_price === '' || isNaN(parseFloat(form.unit_price))) {
      newErrors.unit_price = 'Enter a valid price'
    }
    if (parseFloat(form.unit_price) < 0) {
      newErrors.unit_price = 'Price cannot be negative'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSubmit() {
    if (!validate()) return

    const pricePaisas = Math.round(parseFloat(form.unit_price) * 100)

    setIsSubmitting(true)
    startTransition(async () => {
      const result = await recordTest({
        test_date: form.test_date,
        test_id: form.test_id,
        patient_name: form.patient_name || undefined,
        qty: parseInt(form.qty),
        price_paisas: pricePaisas,
        result: form.result || undefined,
        notes: form.notes || undefined,
        payment_method: (form.payment_method || undefined) as
          | 'cash'
          | 'jazzcash'
          | 'easypaisa'
          | 'bank_transfer'
          | undefined,
        payment_status: form.payment_status,
      })

      setIsSubmitting(false)

      if (result.success) {
        toast({
          title: 'Test recorded',
          description: 'Lab test entry saved successfully.',
        })
        router.push('/lab/tests')
      } else {
        toast({
          title: 'Failed to record test',
          description: result.error,
          variant: 'destructive',
        })
      }
    })
  }

  const selectedTest = tests.find((t) => t.id === form.test_id)
  const totalAmount = parseFloat(form.qty || '0') * parseFloat(form.unit_price || '0')

  // Group tests by category
  const testsByCategory: Record<string, CpLabTest[]> = {}
  for (const t of tests) {
    const cat = t.category ?? 'Uncategorized'
    if (!testsByCategory[cat]) testsByCategory[cat] = []
    testsByCategory[cat]!.push(t)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/lab/tests"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Record New Test</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Log a lab test result and collect payment
        </p>
      </div>

      {isLoadingData ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Test details */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <FlaskConical className="h-4 w-4 text-primary" />
                Test Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date + Test */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="test-date" className="text-xs text-muted-foreground">
                    Date *
                  </Label>
                  <DateInput
                    id="test-date"
                    value={form.test_date}
                    max={todayISO()}
                    onChange={(v) => setField('test_date', v)}
                    className={cn(errors.test_date && 'border-destructive')}
                  />
                  {errors.test_date && (
                    <p className="text-xs text-destructive">{errors.test_date}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="test-select" className="text-xs text-muted-foreground">
                    Test *
                  </Label>
                  <Select value={form.test_id} onValueChange={handleTestChange}>
                    <SelectTrigger
                      id="test-select"
                      className={cn(
                        'bg-input',
                        errors.test_id && 'border-destructive'
                      )}
                    >
                      <SelectValue placeholder="Select test from catalog" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(testsByCategory).map(([cat, catTests]) => (
                        <React.Fragment key={cat}>
                          <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {cat}
                          </div>
                          {catTests.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </React.Fragment>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.test_id && (
                    <p className="text-xs text-destructive">{errors.test_id}</p>
                  )}
                </div>
              </div>

              {/* Duration info */}
              {selectedTest?.duration_minutes && (
                <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Duration:</span>{' '}
                  {selectedTest.duration_minutes} min
                </div>
              )}

              {/* Patient name */}
              <div className="space-y-1.5">
                <Label htmlFor="patient-name" className="text-xs text-muted-foreground">
                  Patient Name (optional)
                </Label>
                <Input
                  id="patient-name"
                  value={form.patient_name}
                  onChange={(e) => setField('patient_name', e.target.value)}
                  placeholder="e.g. Ahmed Khan"
                />
                <p className="text-[10px] text-muted-foreground">
                  Enter the patient name for this test record
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">
                Pricing & Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="qty" className="text-xs text-muted-foreground">
                    Quantity *
                  </Label>
                  <Input
                    id="qty"
                    type="number"
                    min="1"
                    value={form.qty}
                    onChange={(e) => setField('qty', e.target.value)}
                    className={cn(errors.qty && 'border-destructive')}
                  />
                  {errors.qty && (
                    <p className="text-xs text-destructive">{errors.qty}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="unit-price" className="text-xs text-muted-foreground">
                    Unit Price (Rs.) *
                  </Label>
                  <Input
                    id="unit-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.unit_price}
                    onChange={(e) => setField('unit_price', e.target.value)}
                    placeholder="0.00"
                    className={cn(errors.unit_price && 'border-destructive')}
                  />
                  {errors.unit_price && (
                    <p className="text-xs text-destructive">{errors.unit_price}</p>
                  )}
                </div>
              </div>

              {/* Total display */}
              {form.unit_price && (
                <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    Total Amount
                  </span>
                  <span className="text-lg font-bold text-primary">
                    Rs. {Math.max(0, totalAmount).toFixed(2)}
                  </span>
                </div>
              )}

              {/* Payment method + status */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="payment-method" className="text-xs text-muted-foreground">
                    Payment Method
                  </Label>
                  <Select
                    value={form.payment_method}
                    onValueChange={(v) => setField('payment_method', v)}
                  >
                    <SelectTrigger id="payment-method" className="bg-input">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((m) => (
                        <SelectItem key={m.method} value={m.method}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="payment-status" className="text-xs text-muted-foreground">
                    Payment Status
                  </Label>
                  <Select
                    value={form.payment_status}
                    onValueChange={(v) =>
                      setField(
                        'payment_status',
                        v as FormState['payment_status']
                      )
                    }
                  >
                    <SelectTrigger id="payment-status" className="bg-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Result entry */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground">
                Result (optional)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="result" className="text-xs text-muted-foreground">
                  Result
                </Label>
                <Input
                  id="result"
                  value={form.result}
                  onChange={(e) => setField('result', e.target.value)}
                  placeholder="e.g. 12.5 mg/dL — Normal"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs text-muted-foreground">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setField('notes', e.target.value)}
                  placeholder="Additional observations or comments…"
                  rows={2}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              asChild
              className="border-border"
            >
              <Link href="/lab/tests">Cancel</Link>
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-32"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Record Test'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
