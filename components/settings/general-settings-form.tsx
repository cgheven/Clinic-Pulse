'use client'

import React, { useState, useTransition } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { Loader2, Save, Building2, Phone, Mail, DollarSign, CalendarDays } from 'lucide-react'
import type { GeneralSettingsData } from '@/app/actions/settings'
import { updateGeneralSettings } from '@/app/actions/settings'

// =============================================================================
// Config
// =============================================================================

const DAYS = [
  { value: 'monday', label: 'Mon', full: 'Monday' },
  { value: 'tuesday', label: 'Tue', full: 'Tuesday' },
  { value: 'wednesday', label: 'Wed', full: 'Wednesday' },
  { value: 'thursday', label: 'Thu', full: 'Thursday' },
  { value: 'friday', label: 'Fri', full: 'Friday' },
  { value: 'saturday', label: 'Sat', full: 'Saturday' },
  { value: 'sunday', label: 'Sun', full: 'Sunday' },
] as const

const formSchema = z.object({
  clinic_name: z.string().min(1, 'Clinic name is required'),
  clinic_address: z.string(),
  clinic_phone: z.string(),
  clinic_email: z.string(),
  working_days: z.array(z.string()).min(1, 'Select at least one working day'),
  currency_symbol: z.string().min(1, 'Currency symbol is required'),
})

type FormErrors = Partial<Record<keyof GeneralSettingsData, string>>

// =============================================================================
// Sub-components
// =============================================================================

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5">{children}</div>
}

function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium text-foreground"
    >
      {children}
      {required && <span className="ml-1 text-destructive">*</span>}
    </label>
  )
}

function SectionDivider({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-3 pb-1">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

// =============================================================================
// Component
// =============================================================================

interface GeneralSettingsFormProps {
  initialData: GeneralSettingsData
}

export function GeneralSettingsForm({ initialData }: GeneralSettingsFormProps) {
  const [form, setForm] = useState<GeneralSettingsData>(initialData)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isDirty, setIsDirty] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleChange(field: keyof GeneralSettingsData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
    setIsDirty(true)
  }

  function handleDayToggle(day: string) {
    setForm((prev) => {
      const days = prev.working_days.includes(day)
        ? prev.working_days.filter((d) => d !== day)
        : [...prev.working_days, day]
      return { ...prev, working_days: days }
    })
    setErrors((prev) => ({ ...prev, working_days: undefined }))
    setIsDirty(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const parsed = formSchema.safeParse(form)
    if (!parsed.success) {
      const errs: FormErrors = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FormErrors | undefined
        if (field) errs[field] = issue.message
      }
      setErrors(errs)
      return
    }

    startTransition(async () => {
      const result = await updateGeneralSettings(parsed.data)
      if (result.success) {
        setIsDirty(false)
        toast({ title: 'Settings saved', description: 'Clinic settings updated successfully.' })
      } else {
        toast({
          title: 'Save failed',
          description: result.error ?? 'Unknown error',
          variant: 'destructive',
        })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {/* ── Clinic Information ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        <SectionDivider icon={Building2} title="Clinic Information" />

        <FieldGroup>
          <FieldLabel htmlFor="clinic-name" required>
            Clinic Name
          </FieldLabel>
          <Input
            id="clinic-name"
            value={form.clinic_name}
            onChange={(e) => handleChange('clinic_name', e.target.value)}
            disabled={isPending}
            className={cn(
              'max-w-md',
              errors.clinic_name && 'border-destructive focus-visible:ring-destructive'
            )}
            placeholder="e.g. ClinicPulse Medical Center"
          />
          {errors.clinic_name && (
            <p className="text-xs text-destructive">{errors.clinic_name}</p>
          )}
        </FieldGroup>

        <FieldGroup>
          <FieldLabel htmlFor="clinic-address">Address</FieldLabel>
          <Input
            id="clinic-address"
            value={form.clinic_address}
            onChange={(e) => handleChange('clinic_address', e.target.value)}
            disabled={isPending}
            className="max-w-md"
            placeholder="e.g. 123 Main Street, Lahore"
          />
        </FieldGroup>
      </div>

      {/* ── Contact ───────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <SectionDivider icon={Phone} title="Contact Details" />

        <div className="grid max-w-md gap-4 sm:grid-cols-2">
          <FieldGroup>
            <FieldLabel htmlFor="clinic-phone">Phone</FieldLabel>
            <Input
              id="clinic-phone"
              value={form.clinic_phone}
              onChange={(e) => handleChange('clinic_phone', e.target.value)}
              disabled={isPending}
              placeholder="+92 42 1234567"
            />
          </FieldGroup>

          <FieldGroup>
            <FieldLabel htmlFor="clinic-email">Email</FieldLabel>
            <Input
              id="clinic-email"
              type="email"
              value={form.clinic_email}
              onChange={(e) => handleChange('clinic_email', e.target.value)}
              disabled={isPending}
              placeholder="info@clinic.com"
            />
          </FieldGroup>
        </div>
      </div>

      {/* ── Currency ──────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <SectionDivider icon={DollarSign} title="Currency" />

        <FieldGroup>
          <FieldLabel htmlFor="currency-symbol" required>
            Currency Symbol
          </FieldLabel>
          <Input
            id="currency-symbol"
            value={form.currency_symbol}
            onChange={(e) => handleChange('currency_symbol', e.target.value)}
            disabled={isPending}
            className={cn(
              'w-28',
              errors.currency_symbol && 'border-destructive focus-visible:ring-destructive'
            )}
            placeholder="Rs."
            maxLength={10}
          />
          {errors.currency_symbol && (
            <p className="text-xs text-destructive">{errors.currency_symbol}</p>
          )}
        </FieldGroup>
      </div>

      {/* ── Working Days ──────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <SectionDivider icon={CalendarDays} title="Working Days" />

        <FieldGroup>
          <FieldLabel required>Select working days</FieldLabel>
          <div className="flex flex-wrap gap-2 pt-0.5">
            {DAYS.map((day) => {
              const checked = form.working_days.includes(day.value)
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => handleDayToggle(day.value)}
                  disabled={isPending}
                  title={day.full}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl text-xs font-semibold transition-all select-none sm:w-14 sm:rounded-lg sm:px-3 sm:text-sm',
                    checked
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30 ring-2 ring-primary/20'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                    isPending && 'pointer-events-none opacity-50'
                  )}
                >
                  {day.label}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {form.working_days.length} day{form.working_days.length !== 1 ? 's' : ''} selected
          </p>
          {errors.working_days && (
            <p className="text-xs text-destructive">{errors.working_days}</p>
          )}
        </FieldGroup>
      </div>

      {/* ── Save button ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          {isDirty ? (
            <span className="font-medium text-warning">You have unsaved changes</span>
          ) : (
            'All changes saved'
          )}
        </p>
        <Button
          type="submit"
          disabled={isPending || !isDirty}
          size="sm"
          className={cn(
            'bg-primary text-primary-foreground hover:bg-primary/90',
            !isDirty && 'opacity-50'
          )}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="mr-2 h-3.5 w-3.5" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
