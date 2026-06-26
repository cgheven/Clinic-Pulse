'use client'

import React, { useState, useTransition } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { Loader2, Stethoscope, Save, Plus, UserMinus, AlertTriangle, Phone } from 'lucide-react'
import { formatCurrencyPaisas } from '@/lib/utils'
import type { DoctorWithCommission } from '@/app/actions/settings'
import {
  updateDoctorSettings,
  createDoctor,
  deactivateDoctor,
} from '@/app/actions/settings'

// =============================================================================
// Validation schemas
// =============================================================================

const updateSchema = z.object({
  earning_model: z.enum(['salaried', 'commission']),
  commission_pct: z.number().min(0).max(100).optional(),
  monthly_salary: z.number().int().min(0).optional(),
})

// =============================================================================
// Unit conversion helpers
// =============================================================================

function pctToDisplay(pct: number | null): string {
  if (pct === null) return ''
  return pct.toFixed(2)
}

function displayToPct(display: string): number {
  const n = parseFloat(display)
  return isNaN(n) ? 0 : n
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
// Types
// =============================================================================

interface DoctorRow extends DoctorWithCommission {
  pendingModel: 'salaried' | 'commission'
  pendingCommissionPct: string
  pendingSalary: string
  isDirty: boolean
  isSaving: boolean
  isDeactivating: boolean
}

interface AddDoctorForm {
  name: string
  specialization: string
  phone: string
  earning_model: 'salaried' | 'commission'
  commission_pct_display: string
  monthly_salary_pkr: string
}

type AddDoctorErrors = Partial<Record<keyof AddDoctorForm, string>>

const EMPTY_FORM: AddDoctorForm = {
  name: '',
  specialization: '',
  phone: '',
  earning_model: 'commission',
  commission_pct_display: '',
  monthly_salary_pkr: '',
}

interface DoctorSettingsManagerProps {
  initialDoctors: DoctorWithCommission[]
}

// =============================================================================
// Component
// =============================================================================

export function DoctorSettingsManager({ initialDoctors }: DoctorSettingsManagerProps) {
  const [doctors, setDoctors] = useState<DoctorRow[]>(() =>
    initialDoctors.map((d) => ({
      ...d,
      pendingModel: d.earning_model,
      pendingCommissionPct: pctToDisplay(d.current_commission_pct),
      pendingSalary: paisasToPkr(d.monthly_salary),
      isDirty: false,
      isSaving: false,
      isDeactivating: false,
    }))
  )

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addForm, setAddForm] = useState<AddDoctorForm>(EMPTY_FORM)
  const [addErrors, setAddErrors] = useState<AddDoctorErrors>({})
  const [isAdding, setIsAdding] = useState(false)

  // Confirmation state — prevents accidental single-click deactivation
  const [deactivateConfirm, setDeactivateConfirm] = useState<{ id: string; name: string } | null>(null)

  const [, startTransition] = useTransition()

  // ─── Inline-edit helpers ───────────────────────────────────────────────────

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
    const payload: z.infer<typeof updateSchema> = { earning_model: doctor.pendingModel }
    if (doctor.pendingModel === 'commission') {
      payload.commission_pct = displayToPct(doctor.pendingCommissionPct)
    } else {
      payload.monthly_salary = pkrToPaisas(doctor.pendingSalary)
    }

    const parsed = updateSchema.safeParse(payload)
    if (!parsed.success) {
      toast({ title: 'Validation failed', description: parsed.error.issues[0]?.message, variant: 'destructive' })
      return
    }

    setDoctors((prev) => prev.map((d) => (d.id === doctor.id ? { ...d, isSaving: true } : d)))

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
                    doctor.pendingModel === 'commission' ? displayToPct(doctor.pendingCommissionPct) : null,
                  monthly_salary:
                    doctor.pendingModel === 'salaried' ? pkrToPaisas(doctor.pendingSalary) : null,
                  isDirty: false,
                  isSaving: false,
                }
              : d
          )
        )
        toast({ title: 'Doctor settings saved', description: `${doctor.name} updated.` })
      } else {
        setDoctors((prev) => prev.map((d) => (d.id === doctor.id ? { ...d, isSaving: false } : d)))
        toast({ title: 'Save failed', description: result.error ?? 'Unknown error', variant: 'destructive' })
      }
    })
  }

  // ─── Deactivate ───────────────────────────────────────────────────────────

  function confirmDeactivate() {
    if (!deactivateConfirm) return
    const { id, name } = deactivateConfirm
    setDeactivateConfirm(null)
    setDoctors((prev) => prev.map((d) => (d.id === id ? { ...d, isDeactivating: true } : d)))

    startTransition(async () => {
      const result = await deactivateDoctor(id)
      if (result.success) {
        setDoctors((prev) => prev.filter((d) => d.id !== id))
        toast({ title: 'Doctor deactivated', description: `${name} has been deactivated.` })
      } else {
        setDoctors((prev) => prev.map((d) => (d.id === id ? { ...d, isDeactivating: false } : d)))
        toast({ title: 'Deactivation failed', description: result.error ?? 'Unknown error', variant: 'destructive' })
      }
    })
  }

  // ─── Add Doctor ───────────────────────────────────────────────────────────

  function patchForm(patch: Partial<AddDoctorForm>) {
    setAddForm((prev) => ({ ...prev, ...patch }))
  }

  function clearAddErrors(field: keyof AddDoctorErrors) {
    setAddErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function openAddDialog() {
    setAddForm(EMPTY_FORM)
    setAddErrors({})
    setIsAdding(false)
    setShowAddDialog(true)
  }

  function handleAddDoctor() {
    const errors: AddDoctorErrors = {}
    const trimmedName = addForm.name.trim()
    if (!trimmedName) errors.name = 'Name is required'

    let commissionPct: number | undefined
    let salaryPaisas: number | undefined

    if (addForm.earning_model === 'commission') {
      const raw = addForm.commission_pct_display.trim()
      if (!raw) {
        errors.commission_pct_display = 'Commission % is required'
      } else {
        const pct = parseFloat(raw)
        if (isNaN(pct) || pct < 0 || pct > 100) {
          errors.commission_pct_display = 'Enter a valid percentage (0–100)'
        } else {
          commissionPct = pct
        }
      }
    } else {
      const raw = addForm.monthly_salary_pkr.trim()
      if (raw) {
        const pkr = parseInt(raw, 10)
        if (isNaN(pkr) || pkr < 0) {
          errors.monthly_salary_pkr = 'Enter a valid amount'
        } else {
          salaryPaisas = pkr * 100
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setAddErrors(errors)
      return
    }

    setIsAdding(true)

    startTransition(async () => {
      const result = await createDoctor({
        name: trimmedName,
        specialization: addForm.specialization.trim() || null,
        phone: addForm.phone.trim() || null,
        earning_model: addForm.earning_model,
        commission_pct: commissionPct,
        monthly_salary: salaryPaisas,
      })

      setIsAdding(false)

      if (result.success) {
        const newRow: DoctorRow = {
          ...result.data,
          pendingModel: result.data.earning_model,
          pendingCommissionPct: pctToDisplay(result.data.current_commission_pct),
          pendingSalary: paisasToPkr(result.data.monthly_salary),
          isDirty: false,
          isSaving: false,
          isDeactivating: false,
        }
        setDoctors((prev) => [newRow, ...prev])
        toast({ title: 'Doctor added', description: `${result.data.name} has been added.` })
        setShowAddDialog(false)
      } else {
        toast({ title: 'Failed to add doctor', description: result.error ?? 'Unknown error', variant: 'destructive' })
      }
    })
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground/60">
          {doctors.length} {doctors.length === 1 ? 'doctor' : 'doctors'} configured
        </p>
        <Button
          size="sm"
          onClick={openAddDialog}
          className="h-8 px-3 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Doctor
        </Button>
      </div>

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {doctors.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
          <Stethoscope className="h-7 w-7 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No doctors configured.</p>
          <button
            onClick={openAddDialog}
            className="text-xs text-primary underline-offset-2 hover:underline"
          >
            Add the first doctor
          </button>
        </div>
      )}

      {/* ── Doctor rows ──────────────────────────────────────────────────────── */}
      {doctors.length > 0 && (
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
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{doctor.name}</p>
                  {doctor.specialization && (
                    <p className="text-xs text-muted-foreground">{doctor.specialization}</p>
                  )}
                  {doctor.phone && (
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground/60">
                      <Phone className="h-2.5 w-2.5" />
                      {doctor.phone}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {doctor.isDirty && (
                    <Badge className="bg-primary/20 text-primary text-[10px]">Unsaved</Badge>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeactivateConfirm({ id: doctor.id, name: doctor.name })}
                    disabled={doctor.isDeactivating || doctor.isSaving}
                    title="Deactivate doctor"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    {doctor.isDeactivating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserMinus className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Earning model toggle */}
              <div className="mb-3 flex gap-2">
                {(['commission', 'salaried'] as const).map((model) => (
                  <button
                    key={model}
                    type="button"
                    onClick={() => handleModelChange(doctor.id, model)}
                    disabled={doctor.isSaving || doctor.isDeactivating}
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

              {/* Dynamic compensation field */}
              <div className="grid gap-3 sm:grid-cols-2">
                {doctor.pendingModel === 'commission' ? (
                  <div className="space-y-1.5">
                    <label htmlFor={`commission-${doctor.id}`} className="text-xs text-muted-foreground">
                      Commission Rate
                    </label>
                    <div className="relative">
                      <Input
                        id={`commission-${doctor.id}`}
                        type="text"
                        inputMode="decimal"
                        value={doctor.pendingCommissionPct}
                        onChange={(e) => handleCommissionChange(doctor.id, e.target.value)}
                        disabled={doctor.isSaving || doctor.isDeactivating}
                        className="h-8 pr-7 text-right text-sm"
                        placeholder="0.00"
                      />
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        %
                      </span>
                    </div>
                    {doctor.current_commission_pct !== null && !doctor.isDirty && (
                      <p className="text-[10px] text-muted-foreground">
                        Current: {pctToDisplay(doctor.current_commission_pct)}%
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label htmlFor={`salary-${doctor.id}`} className="text-xs text-muted-foreground">
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
                        disabled={doctor.isSaving || doctor.isDeactivating}
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
                    disabled={doctor.isSaving || doctor.isDeactivating}
                    className="h-8 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {doctor.isSaving ? (
                      <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Saving…</>
                    ) : (
                      <><Save className="mr-1.5 h-3.5 w-3.5" />Save</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Add Doctor dialog ─────────────────────────────────────────────────── */}
      <Dialog
        open={showAddDialog}
        onOpenChange={(open) => { if (!isAdding) setShowAddDialog(open) }}
      >
        <DialogContent className="bg-card sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground text-base">Add Doctor</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="add-doctor-name" className="text-xs text-muted-foreground">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="add-doctor-name"
                value={addForm.name}
                onChange={(e) => { patchForm({ name: e.target.value }); clearAddErrors('name') }}
                placeholder="e.g. Ahmed Raza"
                autoFocus
                disabled={isAdding}
                className={cn(addErrors.name && 'border-destructive')}
              />
              {addErrors.name && <p className="text-xs text-destructive">{addErrors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-doctor-spec" className="text-xs text-muted-foreground">
                Specialization
              </Label>
              <Input
                id="add-doctor-spec"
                value={addForm.specialization}
                onChange={(e) => patchForm({ specialization: e.target.value })}
                placeholder="e.g. General Physician"
                disabled={isAdding}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-doctor-phone" className="text-xs text-muted-foreground">
                Phone
              </Label>
              <Input
                id="add-doctor-phone"
                type="tel"
                value={addForm.phone}
                onChange={(e) => patchForm({ phone: e.target.value })}
                placeholder="e.g. 0300-1234567"
                disabled={isAdding}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Earning Model</Label>
              <div className="flex gap-2">
                {(['commission', 'salaried'] as const).map((model) => (
                  <button
                    key={model}
                    type="button"
                    onClick={() => {
                      patchForm({ earning_model: model })
                      clearAddErrors('commission_pct_display')
                      clearAddErrors('monthly_salary_pkr')
                    }}
                    disabled={isAdding}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all',
                      addForm.earning_model === model
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                    )}
                  >
                    {model}
                  </button>
                ))}
              </div>
            </div>

            {addForm.earning_model === 'commission' ? (
              <div className="space-y-1.5">
                <Label htmlFor="add-doctor-commission" className="text-xs text-muted-foreground">
                  Commission % <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="add-doctor-commission"
                    type="text"
                    inputMode="decimal"
                    value={addForm.commission_pct_display}
                    onChange={(e) => {
                      if (/^(\d{0,3}(\.\d{0,2})?)?$/.test(e.target.value)) {
                        patchForm({ commission_pct_display: e.target.value })
                        clearAddErrors('commission_pct_display')
                      }
                    }}
                    placeholder="25.00"
                    disabled={isAdding}
                    className={cn('h-9 pr-7 text-right', addErrors.commission_pct_display && 'border-destructive')}
                  />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    %
                  </span>
                </div>
                {addErrors.commission_pct_display && (
                  <p className="text-xs text-destructive">{addErrors.commission_pct_display}</p>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="add-doctor-salary" className="text-xs text-muted-foreground">
                  Monthly Salary (PKR)
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    Rs.
                  </span>
                  <Input
                    id="add-doctor-salary"
                    type="text"
                    inputMode="numeric"
                    value={addForm.monthly_salary_pkr}
                    onChange={(e) => {
                      if (/^\d*$/.test(e.target.value)) {
                        patchForm({ monthly_salary_pkr: e.target.value })
                        clearAddErrors('monthly_salary_pkr')
                      }
                    }}
                    placeholder="50000"
                    disabled={isAdding}
                    className={cn('h-9 pl-8', addErrors.monthly_salary_pkr && 'border-destructive')}
                  />
                </div>
                {addErrors.monthly_salary_pkr && (
                  <p className="text-xs text-destructive">{addErrors.monthly_salary_pkr}</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              disabled={isAdding}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddDoctor}
              disabled={isAdding}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isAdding ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding…</>
              ) : 'Add Doctor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Deactivate confirmation dialog ───────────────────────────────────── */}
      <Dialog
        open={!!deactivateConfirm}
        onOpenChange={(open) => { if (!open) setDeactivateConfirm(null) }}
      >
        <DialogContent className="bg-card sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-foreground">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Deactivate Doctor
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{deactivateConfirm?.name}</span> will
            be removed from all active dropdowns. This can be reversed directly in the database.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeactivateConfirm(null)}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeactivate}
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
