'use client'

import React, { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateInput } from '@/components/ui/date-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { Loader2, Wrench } from 'lucide-react'
import { addMaintenanceRecord } from '@/app/actions/lab'

// =============================================================================
// Types
// =============================================================================

interface MaintenanceFormProps {
  open: boolean
  machineryId: string
  machineryName: string
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

type MaintenanceType = 'routine' | 'repair' | 'calibration'

interface FormState {
  maintenance_date: string
  maintenance_type: MaintenanceType
  cost: string // PKR string, converted to paisas on submit
  performed_by: string
  notes: string
  next_due_date: string
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]!
}

const DEFAULT_FORM: FormState = {
  maintenance_date: todayISO(),
  maintenance_type: 'routine',
  cost: '',
  performed_by: '',
  notes: '',
  next_due_date: '',
}

// =============================================================================
// MaintenanceForm
// =============================================================================

export function MaintenanceForm({
  open,
  machineryId,
  machineryName,
  onOpenChange,
  onSuccess,
}: MaintenanceFormProps) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [isPending, setIsPending] = useState(false)
  const [, startTransition] = useTransition()

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormState, string>> = {}

    if (!form.maintenance_date) {
      newErrors.maintenance_date = 'Date is required'
    }
    if (!form.maintenance_type) {
      newErrors.maintenance_type = 'Type is required'
    }
    if (form.cost && isNaN(parseFloat(form.cost))) {
      newErrors.cost = 'Enter a valid amount'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSubmit() {
    if (!validate()) return

    const costPaisas = form.cost
      ? Math.round(parseFloat(form.cost) * 100)
      : 0

    setIsPending(true)
    startTransition(async () => {
      const result = await addMaintenanceRecord(machineryId, {
        maintenance_date: form.maintenance_date,
        maintenance_type: form.maintenance_type,
        cost: costPaisas,
        performed_by: form.performed_by || undefined,
        notes: form.notes || undefined,
        next_due_date: form.next_due_date || undefined,
      })

      setIsPending(false)

      if (result.success) {
        toast({
          title: 'Maintenance logged',
          description: `Record added for ${machineryName}.`,
        })
        setForm({ ...DEFAULT_FORM, maintenance_date: todayISO() })
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast({
          title: 'Failed to save',
          description: result.error,
          variant: 'destructive',
        })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Wrench className="h-4 w-4 text-primary" />
            Log Maintenance
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{machineryName}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Date + Type row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="maint-date" className="text-xs text-muted-foreground">
                Date *
              </Label>
              <DateInput
                id="maint-date"
                value={form.maintenance_date}
                onChange={(v) => set('maintenance_date', v)}
                className={cn(errors.maintenance_date && 'border-destructive')}
              />
              {errors.maintenance_date && (
                <p className="text-xs text-destructive">{errors.maintenance_date}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="maint-type" className="text-xs text-muted-foreground">
                Type *
              </Label>
              <Select
                value={form.maintenance_type}
                onValueChange={(v) => set('maintenance_type', v as MaintenanceType)}
              >
                <SelectTrigger
                  id="maint-type"
                  className={cn(
                    'bg-input',
                    errors.maintenance_type && 'border-destructive'
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="calibration">Calibration</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cost + Performed by */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="maint-cost" className="text-xs text-muted-foreground">
                Cost (Rs.)
              </Label>
              <Input
                id="maint-cost"
                type="number"
                min="0"
                step="0.01"
                value={form.cost}
                onChange={(e) => set('cost', e.target.value)}
                placeholder="0"
                className={cn(errors.cost && 'border-destructive')}
              />
              {errors.cost && (
                <p className="text-xs text-destructive">{errors.cost}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="maint-by"
                className="text-xs text-muted-foreground"
              >
                Performed By
              </Label>
              <Input
                id="maint-by"
                value={form.performed_by}
                onChange={(e) => set('performed_by', e.target.value)}
                placeholder="Technician name"
              />
            </div>
          </div>

          {/* Next due date */}
          <div className="space-y-1.5">
            <Label htmlFor="next-due" className="text-xs text-muted-foreground">
              Next Due Date
            </Label>
            <DateInput
              id="next-due"
              value={form.next_due_date}
              onChange={(v) => set('next_due_date', v)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="maint-notes" className="text-xs text-muted-foreground">
              Notes
            </Label>
            <Textarea
              id="maint-notes"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Describe work done, parts replaced, observations…"
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
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
                Saving…
              </>
            ) : (
              <>
                <Wrench className="mr-1.5 h-4 w-4" />
                Save Record
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
