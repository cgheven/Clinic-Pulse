'use client'

import React, { useState, useTransition } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { Loader2, Stethoscope, Save } from 'lucide-react'
import { formatCurrencyPaisas } from '@/lib/utils'
import type { DoctorWithCommission } from '@/app/actions/settings'
import { updateDoctorSettings } from '@/app/actions/settings'

// =============================================================================
// Validation schema
// =============================================================================

const updateSchema = z.object({
  earning_model: z.enum(['salaried', 'commission']),
  commission_pct: z.number().int().min(0).max(10000).optional(),
  monthly_salary: z.number().int().min(0).optional(),
})

// =============================================================================
// Row state
// =============================================================================

interface DoctorRow extends DoctorWithCommission {
  pendingModel: 'salaried' | 'commission'
  pendingCommissionPct: string // display string, e.g. "25.00"
  pendingSalary: string // display string in PKR, e.g. "50000"
  isDirty: boolean
  isSaving: boolean
}

function bpToDisplay(bp: number | null): string {
  if (bp === null) return ''
  return (bp / 100).toFixed(2)
}

function displayToBp(display: string): number {
  const n = parseFloat(display)
  return isNaN(n) ? 0 : Math.round(n * 100)
}

function paisasToPkr(paisas: number | null): string {
  if (paisas === null) return ''
  return (paisas / 100).toFixed(0)
}

function pkrToPaisas(pkr: string): number {
  const n = parseInt(pkr.replace(/,/g, ''), 10)
  return isNaN(n) ? 0 : n * 100
}

// =============================================================================
// Component
// =============================================================================

interface DoctorSettingsManagerProps {
  initialDoctors: DoctorWithCommission[]
}

export function DoctorSettingsManager({ initialDoctors }: DoctorSettingsManagerProps) {
  const [doctors, setDoctors] = useState<DoctorRow[]>(() =>
    initialDoctors.map((d) => ({
      ...d,
      pendingModel: d.earning_model,
      pendingCommissionPct: bpToDisplay(d.current_commission_pct),
      pendingSalary: paisasToPkr(d.monthly_salary),
      isDirty: false,
      isSaving: false,
    }))
  )

  const [, startTransition] = useTransition()

  function markDirty(id: string, patch: Partial<DoctorRow>) {
    setDoctors((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patch, isDirty: true } : d))
    )
  }

  function handleModelChange(id: string, model: 'salaried' | 'commission') {
    markDirty(id, { pendingModel: model })
  }

  function handleCommissionChange(id: string, raw: string) {
    if (/^(\d{0,3}(\.\d{0,2})?)?$/.test(raw)) {
      markDirty(id, { pendingCommissionPct: raw })
    }
  }

  function handleSalaryChange(id: string, raw: string) {
    if (/^\d*$/.test(raw)) {
      markDirty(id, { pendingSalary: raw })
    }
  }

  function handleSave(doctor: DoctorRow) {
    const payload: z.infer<typeof updateSchema> = {
      earning_model: doctor.pendingModel,
    }

    if (doctor.pendingModel === 'commission') {
      payload.commission_pct = displayToBp(doctor.pendingCommissionPct)
    } else {
      payload.monthly_salary = pkrToPaisas(doctor.pendingSalary)
    }

    const parsed = updateSchema.safeParse(payload)
    if (!parsed.success) {
      toast({
        title: 'Validation failed',
        description: parsed.error.issues[0]?.message ?? 'Check inputs',
        variant: 'destructive',
      })
      return
    }

    setDoctors((prev) =>
      prev.map((d) => (d.id === doctor.id ? { ...d, isSaving: true } : d))
    )

    startTransition(async () => {
      const result = await updateDoctorSettings(doctor.id, parsed.data)

      if (result.success) {
        setDoctors((prev) =>
          prev.map((d) =>
            d.id === doctor.id
              ? {
                  ...d,
                  earning_model: doctor.pendingModel,
                  current_commission_pct:
                    doctor.pendingModel === 'commission'
                      ? displayToBp(doctor.pendingCommissionPct)
                      : null,
                  monthly_salary:
                    doctor.pendingModel === 'salaried'
                      ? pkrToPaisas(doctor.pendingSalary)
                      : null,
                  isDirty: false,
                  isSaving: false,
                }
              : d
          )
        )
        toast({
          title: 'Doctor settings saved',
          description: `${doctor.name} updated successfully.`,
        })
      } else {
        setDoctors((prev) =>
          prev.map((d) => (d.id === doctor.id ? { ...d, isSaving: false } : d))
        )
        toast({
          title: 'Save failed',
          description: result.error ?? 'Unknown error',
          variant: 'destructive',
        })
      }
    })
  }

  if (doctors.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-10 text-center">
        <Stethoscope className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No doctors configured.</p>
        <p className="mt-0.5 text-xs text-muted-foreground/60">Add doctors from the Doctors section.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Doctor Settings</h3>
        <p className="text-xs text-muted-foreground">
          Configure each doctor&apos;s earning model and commission or salary.
        </p>
      </div>

      <div className="space-y-3">
        {doctors.map((doctor) => (
          <div
            key={doctor.id}
            className={cn(
              'rounded-xl border p-4 transition-colors',
              doctor.isDirty ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
            )}
          >
            {/* Doctor header */}
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{doctor.name}</p>
                {doctor.specialization && (
                  <p className="text-xs text-muted-foreground">{doctor.specialization}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!doctor.is_active && (
                  <Badge variant="secondary" className="text-[10px]">
                    Inactive
                  </Badge>
                )}
                {doctor.isDirty && (
                  <Badge className="bg-primary/20 text-primary text-[10px]">
                    Unsaved
                  </Badge>
                )}
              </div>
            </div>

            {/* Earning model toggle */}
            <div className="mb-3 flex gap-2">
              {(['commission', 'salaried'] as const).map((model) => (
                <button
                  key={model}
                  type="button"
                  onClick={() => handleModelChange(doctor.id, model)}
                  disabled={doctor.isSaving}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all',
                    doctor.pendingModel === model
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  )}
                >
                  {model}
                </button>
              ))}
            </div>

            {/* Dynamic field */}
            <div className="grid gap-3 sm:grid-cols-2">
              {doctor.pendingModel === 'commission' ? (
                <div className="space-y-1.5">
                  <label
                    htmlFor={`commission-${doctor.id}`}
                    className="text-xs text-muted-foreground"
                  >
                    Commission Rate
                  </label>
                  <div className="relative">
                    <Input
                      id={`commission-${doctor.id}`}
                      type="text"
                      inputMode="decimal"
                      value={doctor.pendingCommissionPct}
                      onChange={(e) => handleCommissionChange(doctor.id, e.target.value)}
                      disabled={doctor.isSaving}
                      className="h-8 pr-7 text-right text-sm"
                      placeholder="0.00"
                    />
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      %
                    </span>
                  </div>
                  {doctor.current_commission_pct !== null && !doctor.isDirty && (
                    <p className="text-[10px] text-muted-foreground">
                      Current: {bpToDisplay(doctor.current_commission_pct)}%
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label
                    htmlFor={`salary-${doctor.id}`}
                    className="text-xs text-muted-foreground"
                  >
                    Monthly Salary (PKR)
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      Rs.
                    </span>
                    <Input
                      id={`salary-${doctor.id}`}
                      type="text"
                      inputMode="numeric"
                      value={doctor.pendingSalary}
                      onChange={(e) => handleSalaryChange(doctor.id, e.target.value)}
                      disabled={doctor.isSaving}
                      className="h-8 pl-8 text-sm"
                      placeholder="50000"
                    />
                  </div>
                  {doctor.monthly_salary !== null && !doctor.isDirty && (
                    <p className="text-[10px] text-muted-foreground">
                      Current: {formatCurrencyPaisas(doctor.monthly_salary)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Save button */}
            {doctor.isDirty && (
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => handleSave(doctor)}
                  disabled={doctor.isSaving}
                  className="h-8 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {doctor.isSaving ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="mr-1.5 h-3.5 w-3.5" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
