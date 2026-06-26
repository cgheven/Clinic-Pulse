'use client'

import React, { useState, useTransition } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertCircle, Loader2, Save } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// =============================================================================
// Types
// =============================================================================

export interface SplitField {
  key: string
  label: string
  color: string   // bg-* Tailwind class (e.g. "bg-primary")
  valueBp: number // current value in basis points (0–10000)
}

interface RevenueSplitCardProps {
  title: string
  description: string
  icon: React.ElementType
  fields: SplitField[]
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

// Text color inside the stacked bar segment for each background
const BAR_TEXT: Record<string, string> = {
  'bg-primary': 'text-primary-foreground',
  'bg-info': 'text-white',
  'bg-success': 'text-white',
  'bg-warning': 'text-white',
  'bg-destructive': 'text-white',
}

// =============================================================================
// Component
// =============================================================================

export function RevenueSplitCard({
  title,
  description,
  icon: Icon,
  fields,
  onSave,
  readOnly = false,
}: RevenueSplitCardProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const f of fields) init[f.key] = bpToPercent(f.valueBp)
    return init
  })

  const [isDirty, setIsDirty] = useState(false)
  const [isPending, startTransition] = useTransition()

  const totalBp = Object.values(values).reduce((acc, v) => acc + percentToBp(v), 0)
  const isValid = totalBp === 10000
  const remainingBp = 10000 - totalBp

  function handleChange(key: string, raw: string) {
    if (/^(\d{0,3}(\.\d{0,2})?)?$/.test(raw)) {
      setValues((prev) => ({ ...prev, [key]: raw }))
      setIsDirty(true)
    }
  }

  function handleSave() {
    if (!isValid) return
    const bpValues: Record<string, number> = {}
    for (const [key, pct] of Object.entries(values)) bpValues[key] = percentToBp(pct)
    startTransition(async () => {
      const result = await onSave(bpValues)
      if (result.success) {
        setIsDirty(false)
        toast({ title: `${title} saved`, description: 'Revenue split updated successfully.' })
      } else {
        toast({ title: 'Save failed', description: result.error ?? 'Unknown error', variant: 'destructive' })
      }
    })
  }

  const inputCols = fields.length === 2 ? 'sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'

  return (
    <div
      className={cn(
        'group relative rounded-2xl border bg-card p-5 sm:p-6 transition-all duration-200',
        isDirty
          ? 'border-primary/30 shadow-[0_0_0_1px_hsl(var(--primary)/0.12),0_4px_16px_hsl(var(--primary)/0.06)]'
          : 'border-border hover:border-border/80'
      )}
    >
      {/* Dirty left accent bar */}
      {isDirty && (
        <div className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full bg-primary" />
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground leading-tight">{title}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{description}</p>
          </div>
        </div>

        {/* Total badge */}
        <div
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold',
            isValid
              ? 'bg-success/15 text-success'
              : 'bg-destructive/15 text-destructive'
          )}
        >
          {isValid
            ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            : <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          }
          {(totalBp / 100).toFixed(0)}%
        </div>
      </div>

      {/* ── Stacked bar ────────────────────────────────────────────────────── */}
      <div className="space-y-2.5 mb-5">
        <div className="flex h-9 w-full overflow-hidden rounded-xl bg-muted/40">
          {fields.map((f) => {
            const pct = Math.max(0, Math.min(100, percentToBp(values[f.key] ?? '0') / 100))
            const textClass = BAR_TEXT[f.color] ?? 'text-white'
            return (
              <div
                key={f.key}
                className={cn(
                  'flex items-center justify-center overflow-hidden transition-all duration-300',
                  f.color
                )}
                style={{ width: `${pct}%` }}
              >
                {pct >= 20 && (
                  <span className={cn('select-none truncate px-2 text-xs font-semibold', textClass)}>
                    {f.label} · {pct.toFixed(0)}%
                  </span>
                )}
              </div>
            )
          })}
          {remainingBp > 0 && (
            <div className="flex flex-1 items-center justify-center px-2">
              <span className="truncate text-xs text-muted-foreground/40">
                {(remainingBp / 100).toFixed(0)}% unallocated
              </span>
            </div>
          )}
        </div>

        {/* Legend dots */}
        <div className="flex flex-wrap gap-4">
          {fields.map((f) => (
            <div key={f.key} className="flex items-center gap-1.5">
              <div className={cn('h-2 w-2 rounded-full shrink-0', f.color)} />
              <span className="text-xs text-muted-foreground">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Percentage inputs ───────────────────────────────────────────────── */}
      <div className={cn('grid gap-4 mb-5', inputCols)}>
        {fields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <div className={cn('h-2 w-2 rounded-full shrink-0', field.color)} />
              {field.label}
            </label>
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                value={values[field.key] ?? ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                disabled={readOnly || isPending}
                className="h-11 pr-9 text-right font-mono text-base font-semibold tracking-tight"
                placeholder="0.00"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                %
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer: status + save ───────────────────────────────────────────── */}
      {!readOnly && (
        <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
          <p className="text-xs">
            {isValid ? (
              <span className="font-medium text-success">Totals 100% — ready to save</span>
            ) : remainingBp > 0 ? (
              <span className="font-medium text-warning">
                {(remainingBp / 100).toFixed(2)}% remaining to allocate
              </span>
            ) : (
              <span className="font-medium text-destructive">
                Over by {(Math.abs(remainingBp) / 100).toFixed(2)}%
              </span>
            )}
          </p>

          <Button
            onClick={handleSave}
            disabled={!isValid || isPending || !isDirty}
            size="sm"
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Save className="h-3.5 w-3.5" />
            }
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      )}
    </div>
  )
}
