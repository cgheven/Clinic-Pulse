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
  color: string       // hex — bar segment + dot
  barTextColor?: string
  valueBp: number
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
        toast({ title: `${title} saved`, description: 'Revenue split updated.' })
      } else {
        toast({ title: 'Save failed', description: result.error ?? 'Unknown error', variant: 'destructive' })
      }
    })
  }

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border bg-card p-4 transition-all duration-200',
        isDirty
          ? 'border-primary/30 shadow-[0_0_0_1px_hsl(var(--primary)/0.08)]'
          : 'border-border hover:border-border/60'
      )}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight truncate">
              {title}
            </p>
            <p className="text-[11px] text-muted-foreground/60 leading-tight mt-0.5 truncate">
              {description}
            </p>
          </div>
        </div>

        {/* Validity badge */}
        <div
          className={cn(
            'flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
            isValid
              ? 'bg-success/10 text-success'
              : 'bg-destructive/10 text-destructive'
          )}
        >
          {isValid
            ? <CheckCircle2 className="h-2.5 w-2.5" />
            : <AlertCircle className="h-2.5 w-2.5" />}
          {(totalBp / 100).toFixed(0)}%
        </div>
      </div>

      {/* ── Stacked bar ─────────────────────────────────────────────────────── */}
      <div className="mb-4 space-y-1.5">
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/40">
          {fields.map((f) => {
            const pct = Math.max(0, Math.min(100, percentToBp(values[f.key] ?? '0') / 100))
            return (
              <div
                key={f.key}
                className="h-full transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: f.color }}
              />
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {fields.map((f) => {
            const pct = (percentToBp(values[f.key] ?? '0') / 100).toFixed(0)
            return (
              <div key={f.key} className="flex items-center gap-1">
                <div
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: f.color }}
                />
                <span className="text-[10px] text-muted-foreground/70">
                  {f.label} <span className="font-medium text-muted-foreground">{pct}%</span>
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Percentage inputs — stacked, one per field ───────────────────────── */}
      <div className="flex-1 space-y-2">
        {fields.map((field) => (
          <div key={field.key} className="flex items-center gap-2">
            <div
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: field.color }}
            />
            <span className="w-11 shrink-0 text-xs text-muted-foreground">
              {field.label}
            </span>
            <div className="relative flex-1">
              <Input
                type="text"
                inputMode="decimal"
                value={values[field.key] ?? ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                disabled={readOnly || isPending}
                className="h-8 pr-7 text-right text-sm font-semibold font-mono"
                placeholder="0.00"
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                %
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      {!readOnly && (
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
          <p className="text-[11px] leading-tight">
            {isValid ? (
              <span className="text-success font-medium">✓ Totals 100%</span>
            ) : remainingBp > 0 ? (
              <span className="text-muted-foreground/60">
                {(remainingBp / 100).toFixed(0)}% left
              </span>
            ) : (
              <span className="text-destructive text-[10px]">
                Over {(Math.abs(remainingBp) / 100).toFixed(0)}%
              </span>
            )}
          </p>

          <Button
            onClick={handleSave}
            disabled={!isValid || isPending || !isDirty}
            size="sm"
            className="h-7 px-3 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30"
          >
            {isPending
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Save className="h-3 w-3" />}
            {isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      )}
    </div>
  )
}
