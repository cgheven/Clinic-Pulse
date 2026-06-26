'use client'

import React, { useState, useTransition } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { Loader2, Save } from 'lucide-react'
import type { GeneralSettingsData } from '@/app/actions/settings'
import { updateGeneralSettings } from '@/app/actions/settings'

// =============================================================================
// Working days config
// =============================================================================

const DAYS = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
] as const

// =============================================================================
// Zod schema (client-side validation mirror)
// =============================================================================

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
// Component
// =============================================================================

interface GeneralSettingsFormProps {
  initialData: GeneralSettingsData
}

export function GeneralSettingsForm({ initialData }: GeneralSettingsFormProps) {
  const [form, setForm] = useState<GeneralSettingsData>(initialData)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isPending, startTransition] = useTransition()

  function handleChange(field: keyof GeneralSettingsData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function handleDayToggle(day: string, checked: boolean) {
    setForm((prev) => {
      const days = checked
        ? [...prev.working_days, day]
        : prev.working_days.filter((d) => d !== day)
      return { ...prev, working_days: days }
    })
    setErrors((prev) => ({ ...prev, working_days: undefined }))
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
        toast({ title: 'Settings saved', description: 'General settings updated successfully.' })
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
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
      {/* Clinic Name */}
      <div className="space-y-1.5">
        <Label htmlFor="clinic-name" className="text-xs text-muted-foreground">
          Clinic Name *
        </Label>
        <Input
          id="clinic-name"
          value={form.clinic_name}
          onChange={(e) => handleChange('clinic_name', e.target.value)}
          disabled={isPending}
          className={cn(errors.clinic_name && 'border-destructive')}
          placeholder="ClinicPulse Medical Center"
        />
        {errors.clinic_name && (
          <p className="text-xs text-destructive">{errors.clinic_name}</p>
        )}
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <Label htmlFor="clinic-address" className="text-xs text-muted-foreground">
          Address
        </Label>
        <Input
          id="clinic-address"
          value={form.clinic_address}
          onChange={(e) => handleChange('clinic_address', e.target.value)}
          disabled={isPending}
          placeholder="123 Main Street, Lahore"
        />
      </div>

      {/* Phone & Email row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="clinic-phone" className="text-xs text-muted-foreground">
            Phone
          </Label>
          <Input
            id="clinic-phone"
            value={form.clinic_phone}
            onChange={(e) => handleChange('clinic_phone', e.target.value)}
            disabled={isPending}
            placeholder="+92 42 1234567"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="clinic-email" className="text-xs text-muted-foreground">
            Email
          </Label>
          <Input
            id="clinic-email"
            type="email"
            value={form.clinic_email}
            onChange={(e) => handleChange('clinic_email', e.target.value)}
            disabled={isPending}
            placeholder="info@clinic.com"
          />
        </div>
      </div>

      {/* Currency Symbol */}
      <div className="space-y-1.5">
        <Label htmlFor="currency-symbol" className="text-xs text-muted-foreground">
          Currency Symbol *
        </Label>
        <Input
          id="currency-symbol"
          value={form.currency_symbol}
          onChange={(e) => handleChange('currency_symbol', e.target.value)}
          disabled={isPending}
          className={cn('w-28', errors.currency_symbol && 'border-destructive')}
          placeholder="Rs."
          maxLength={10}
        />
        {errors.currency_symbol && (
          <p className="text-xs text-destructive">{errors.currency_symbol}</p>
        )}
      </div>

      {/* Working Days */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Working Days *</Label>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day) => {
            const checked = form.working_days.includes(day.value)
            return (
              <label
                key={day.value}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors select-none',
                  checked
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-muted/30 text-muted-foreground hover:border-border/80 hover:bg-muted/50',
                  isPending && 'pointer-events-none opacity-50'
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => handleDayToggle(day.value, !!v)}
                  disabled={isPending}
                  className="sr-only"
                />
                {day.label}
              </label>
            )
          })}
        </div>
        {errors.working_days && (
          <p className="text-xs text-destructive">{errors.working_days}</p>
        )}
      </div>

      {/* Submit */}
      <div className="pt-1">
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
              <Save className="mr-2 h-4 w-4" />
              Save General Settings
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
