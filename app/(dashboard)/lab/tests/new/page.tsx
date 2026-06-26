'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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
  getPaymentMethodsForLab,
  recordTest,
} from '@/app/actions/lab'
import type { CpLabTest, CpPaymentMethod } from '@/types/index'

// =============================================================================
// Form state
// =============================================================================

interface FormState {
  log_date: string
  test_id: string
  patient_no: string
  quantity: string
  unit_price: string // PKR
  discount_amount: string // PKR
  result_value: string
  result_unit: string
  is_abnormal: boolean
  result_notes: string
  payment_method_id: string
  payment_status: 'pending' | 'completed' | 'cancelled' | 'refunded'
  report_issued: boolean
}

type FormErrors = Partial<Record<keyof FormState, string>>

function todayISO(): string {
  return new Date().toISOString().split('T')[0]!
}

const DEFAULT_FORM: FormState = {
  log_date: todayISO(),
  test_id: '',
  patient_no: '',
  quantity: '1',
  unit_price: '',
  discount_amount: '0',
  result_value: '',
  result_unit: '',
  is_abnormal: false,
  result_notes: '',
  payment_method_id: '',
  payment_status: 'completed',
  report_issued: false,
}

// =============================================================================
// Page
// =============================================================================

export default function NewTestPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [tests, setTests] = useState<CpLabTest[]>([])
  const [paymentMethods, setPaymentMethods] = useState<CpPaymentMethod[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [, startTransition] = useTransition()

  // Fetch catalog + payment methods on mount
  useEffect(() => {
    async function loadData() {
      const [testsRes, pmRes] = await Promise.all([
        getTestCatalog(),
        getPaymentMethodsForLab(),
      ])
      if (testsRes.success) setTests(testsRes.data)
      if (pmRes.success) setPaymentMethods(pmRes.data as CpPaymentMethod[])
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
      unit_price: test ? (test.price / 100).toFixed(2) : '',
      result_unit: test?.unit ?? '',
    }))
    setErrors((prev) => ({ ...prev, test_id: undefined, unit_price: undefined }))
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const newErrors: FormErrors = {}

    if (!form.log_date) newErrors.log_date = 'Date is required'
    if (!form.test_id) newErrors.test_id = 'Select a test'
    if (!form.quantity || parseInt(form.quantity) < 1) {
      newErrors.quantity = 'Quantity must be at least 1'
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

    const unitPricePaisas = Math.round(parseFloat(form.unit_price) * 100)
    const discountPaisas = Math.round(parseFloat(form.discount_amount || '0') * 100)

    setIsSubmitting(true)
    startTransition(async () => {
      const result = await recordTest({
        log_date: form.log_date,
        test_id: form.test_id,
        patient_no: form.patient_no || undefined,
        quantity: parseInt(form.quantity),
        unit_price: unitPricePaisas,
        discount_amount: discountPaisas,
        result_value: form.result_value || undefined,
        result_unit: form.result_unit || undefined,
        is_abnormal: form.is_abnormal,
        result_notes: form.result_notes || undefined,
        payment_method_id: form.payment_method_id || undefined,
        payment_status: form.payment_status,
        report_issued: form.report_issued,
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
  const totalAmount =
    (parseFloat(form.quantity || '0') * parseFloat(form.unit_price || '0')) -
    parseFloat(form.discount_amount || '0')

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
                  <Label htmlFor="log-date" className="text-xs text-muted-foreground">
                    Date *
                  </Label>
                  <Input
                    id="log-date"
                    type="date"
                    value={form.log_date}
                    max={todayISO()}
                    onChange={(e) => setField('log_date', e.target.value)}
                    className={cn(errors.log_date && 'border-destructive')}
                  />
                  {errors.log_date && (
                    <p className="text-xs text-destructive">{errors.log_date}</p>
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
                              {t.test_name}
                              {t.test_code && (
                                <span className="ml-2 text-muted-foreground">
                                  ({t.test_code})
                                </span>
                              )}
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

              {/* Reference range info */}
              {selectedTest?.reference_range && (
                <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Reference range:</span>{' '}
                  {selectedTest.reference_range}
                  {selectedTest.turnaround_time && (
                    <span className="ml-3">
                      <span className="font-medium text-foreground">Turnaround:</span>{' '}
                      {selectedTest.turnaround_time}
                    </span>
                  )}
                </div>
              )}

              {/* Patient no */}
              <div className="space-y-1.5">
                <Label htmlFor="patient-no" className="text-xs text-muted-foreground">
                  Patient No. (optional)
                </Label>
                <Input
                  id="patient-no"
                  value={form.patient_no}
                  onChange={(e) => setField('patient_no', e.target.value.toUpperCase())}
                  placeholder="CP-00001"
                />
                <p className="text-[10px] text-muted-foreground">
                  Enter the patient number to link this test to a patient record
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
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="quantity" className="text-xs text-muted-foreground">
                    Quantity *
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(e) => setField('quantity', e.target.value)}
                    className={cn(errors.quantity && 'border-destructive')}
                  />
                  {errors.quantity && (
                    <p className="text-xs text-destructive">{errors.quantity}</p>
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

                <div className="space-y-1.5">
                  <Label htmlFor="discount" className="text-xs text-muted-foreground">
                    Discount (Rs.)
                  </Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.discount_amount}
                    onChange={(e) => setField('discount_amount', e.target.value)}
                    placeholder="0.00"
                  />
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
                    value={form.payment_method_id}
                    onValueChange={(v) => setField('payment_method_id', v)}
                  >
                    <SelectTrigger id="payment-method" className="bg-input">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
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
                      <SelectItem value="cancelled">Cancelled</SelectItem>
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="result-value" className="text-xs text-muted-foreground">
                    Result Value
                  </Label>
                  <Input
                    id="result-value"
                    value={form.result_value}
                    onChange={(e) => setField('result_value', e.target.value)}
                    placeholder="e.g. 12.5"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="result-unit" className="text-xs text-muted-foreground">
                    Unit
                  </Label>
                  <Input
                    id="result-unit"
                    value={form.result_unit}
                    onChange={(e) => setField('result_unit', e.target.value)}
                    placeholder="e.g. mg/dL"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="result-notes" className="text-xs text-muted-foreground">
                  Result Notes
                </Label>
                <Textarea
                  id="result-notes"
                  value={form.result_notes}
                  onChange={(e) => setField('result_notes', e.target.value)}
                  placeholder="Additional observations or comments…"
                  rows={2}
                  className="resize-none"
                />
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="is-abnormal"
                    checked={form.is_abnormal}
                    onCheckedChange={(checked) =>
                      setField('is_abnormal', checked === true)
                    }
                  />
                  <Label htmlFor="is-abnormal" className="text-sm text-foreground cursor-pointer">
                    Abnormal result
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="report-issued"
                    checked={form.report_issued}
                    onCheckedChange={(checked) =>
                      setField('report_issued', checked === true)
                    }
                  />
                  <Label htmlFor="report-issued" className="text-sm text-foreground cursor-pointer">
                    Report issued
                  </Label>
                </div>
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
