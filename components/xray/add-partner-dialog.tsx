'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { upsertXrayPartner } from '@/app/actions/settings'

// =============================================================================
// Types
// =============================================================================

interface FormState {
  name: string
  phone: string
  split_pct: string
}

interface FieldErrors {
  name?: string
  split_pct?: string
}

const DEFAULT_FORM: FormState = {
  name: '',
  phone: '',
  split_pct: '',
}

// =============================================================================
// Validation
// =============================================================================

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {}

  if (!form.name.trim()) {
    errors.name = 'Partner name is required.'
  } else if (form.name.trim().length > 200) {
    errors.name = 'Name must be 200 characters or fewer.'
  }

  const pct = parseFloat(form.split_pct)
  if (form.split_pct.trim() === '' || isNaN(pct)) {
    errors.split_pct = 'Revenue split is required.'
  } else if (pct < 0 || pct > 100) {
    errors.split_pct = 'Must be between 0 and 100.'
  }

  return errors
}

// =============================================================================
// Component
// =============================================================================

export function AddPartnerDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isPending, startTransition] = useTransition()

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field as keyof FieldErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next && isPending) return // don't close while submitting
    setOpen(next)
    if (!next) {
      setForm(DEFAULT_FORM)
      setErrors({})
    }
  }

  function handleSubmit() {
    const fieldErrors = validate(form)
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      return
    }

    startTransition(async () => {
      const result = await upsertXrayPartner({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        split_pct: parseFloat(form.split_pct),
      })

      if (result.success) {
        toast({
          title: 'Partner added',
          description: `${form.name.trim()} has been added as an X-ray partner.`,
        })
        handleOpenChange(false)
        router.refresh()
      } else {
        toast({
          title: 'Failed to add partner',
          description: result.error ?? 'An unexpected error occurred.',
          variant: 'destructive',
        })
      }
    })
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Add Partner
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="bg-card sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add X-Ray Partner</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Partner Name */}
            <div className="space-y-1.5">
              <Label htmlFor="ap-name" className="text-xs text-muted-foreground">
                Partner Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ap-name"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Ahmad Radiology Center"
                disabled={isPending}
                className={cn(errors.name && 'border-destructive focus-visible:ring-destructive')}
                autoComplete="off"
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="ap-phone" className="text-xs text-muted-foreground">
                Phone
              </Label>
              <Input
                id="ap-phone"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+92 300 1234567"
                disabled={isPending}
                autoComplete="off"
              />
            </div>

            {/* Revenue Split % */}
            <div className="space-y-1.5">
              <Label htmlFor="ap-split" className="text-xs text-muted-foreground">
                Revenue Split % <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="ap-split"
                  type="text"
                  inputMode="decimal"
                  value={form.split_pct}
                  onChange={(e) => handleChange('split_pct', e.target.value)}
                  placeholder="0"
                  disabled={isPending}
                  className={cn(
                    'pr-7',
                    errors.split_pct && 'border-destructive focus-visible:ring-destructive'
                  )}
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
              {errors.split_pct && (
                <p className="text-xs text-destructive">{errors.split_pct}</p>
              )}
              <p className="text-[11px] text-muted-foreground/70">
                All partner splits must total 100% to distribute revenue correctly.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
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
                  Adding…
                </>
              ) : (
                'Add Partner'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
