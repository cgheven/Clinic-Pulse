'use client'

import React, { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

// =============================================================================
// Types
// =============================================================================

export interface SplitField {
  key: string
  label: string
  color: string // tailwind text-* class for the bar color
  valueBp: number // current value in basis points (0-10000)
}

interface RevenueSplitCardProps {
  title: string
  description: string
  fields: SplitField[]
  /** Called with the new values in basis points keyed by SplitField.key */
  onSave: (values: Record<string, number>) => Promise<{ success: boolean; error?: string }>
  readOnly?: boolean
}

// =============================================================================
// Helpers
// =============================================================================

function bpToPercent(bp: number): string {
  return (bp / 100).toFixed(2)
}

function percentToBp(pct: string): number {
  const n = parseFloat(pct)
  if (isNaN(n)) return 0
  return Math.round(n * 100)
}

// =============================================================================
// Component
// =============================================================================

export function RevenueSplitCard({
  title,
  description,
  fields,
  onSave,
  readOnly = false,
}: RevenueSplitCardProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const f of fields) {
      init[f.key] = bpToPercent(f.valueBp)
    }
    return init
  })

  const [isPending, startTransition] = useTransition()

  // Compute total in basis points
  const totalBp = Object.values(values).reduce((acc, v) => acc + percentToBp(v), 0)
  const isValid = totalBp === 10000
  const totalPct = (totalBp / 100).toFixed(2)

  function handleChange(key: string, raw: string) {
    // Allow free typing; only digits and dot
    if (/^(\d{0,3}(\.\d{0,2})?)?$/.test(raw)) {
      setValues((prev) => ({ ...prev, [key]: raw }))
    }
  }

  function handleSave() {
    if (!isValid) return

    const bpValues: Record<string, number> = {}
    for (const [key, pct] of Object.entries(values)) {
      bpValues[key] = percentToBp(pct)
    }

    startTransition(async () => {
      const result = await onSave(bpValues)
      if (result.success) {
        toast({ title: `${title} saved`, description: 'Revenue split updated successfully.' })
      } else {
        toast({
          title: 'Save failed',
          description: result.error ?? 'Unknown error',
          variant: 'destructive',
        })
      }
    })
  }

  // Visual bar data — normalize to show relative widths
  const barSegments = fields.map((f) => ({
    ...f,
    currentBp: percentToBp(values[f.key] ?? '0'),
  }))

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          </div>

          {/* Total badge */}
          <div
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
              isValid
                ? 'bg-success/15 text-success'
                : 'bg-destructive/15 text-destructive'
            )}
          >
            {isValid ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
            {totalPct}%
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Visual bar */}
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
          {barSegments.map((seg) => (
            <div
              key={seg.key}
              className={cn('h-full transition-all duration-300', seg.color)}
              style={{ width: `${Math.max(0, Math.min(100, seg.currentBp / 100))}%` }}
            />
          ))}
        </div>

        {/* Input fields */}
        <div className="grid gap-3">
          {fields.map((field) => (
            <div key={field.key} className="flex items-center gap-3">
              {/* Color dot */}
              <div className={cn('h-2.5 w-2.5 shrink-0 rounded-full', field.color)} />

              <Label
                htmlFor={`split-${field.key}`}
                className="w-28 shrink-0 text-sm text-muted-foreground"
              >
                {field.label}
              </Label>

              <div className="relative flex-1">
                <Input
                  id={`split-${field.key}`}
                  type="text"
                  inputMode="decimal"
                  value={values[field.key] ?? ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  disabled={readOnly || isPending}
                  className="h-8 pr-8 text-right text-sm"
                  placeholder="0.00"
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>

              {/* Basis points display */}
              <span className="w-24 text-right text-xs text-muted-foreground">
                {percentToBp(values[field.key] ?? '0').toLocaleString()} bp
              </span>
            </div>
          ))}
        </div>

        {/* Validation message */}
        {!isValid && (
          <p className="text-xs text-destructive">
            Total must equal 100.00% — currently {totalPct}%
          </p>
        )}

        {/* Doctor vs Clinic breakdown summary */}
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Breakdown
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
            {fields.map((f) => (
              <div key={f.key} className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{f.label}</span>
                <span className="text-xs font-semibold text-foreground">
                  {values[f.key] ?? '0'}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {!readOnly && (
          <Button
            onClick={handleSave}
            disabled={!isValid || isPending}
            size="sm"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              'Save Split'
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
