'use client'

import React, { useMemo, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import {
  ArrowDown,
  ArrowUp,
  FlaskConical,
  Loader2,
  Pencil,
  Plus,
  Sigma,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { SpecialtyPicker } from '@/components/lab/specialty-picker'
import {
  createTestParameter,
  updateTestParameter,
  deleteTestParameter,
  reorderTestParameters,
} from '@/app/actions/lab'
import type {
  CpLabTest,
  LabParameterWithRanges,
  LabParameterInputType,
  LabRangeSex,
} from '@/types/index'

// =============================================================================
// Range formatting — the single most-read thing in this table
// =============================================================================

interface RangeDraft {
  sex: LabRangeSex
  low: string
  high: string
  text_value: string
  critical_low: string
  critical_high: string
}

const EMPTY_RANGE: RangeDraft = {
  sex: 'any',
  low: '',
  high: '',
  text_value: '',
  critical_low: '',
  critical_high: '',
}

const SEX_LABEL: Record<LabRangeSex, string> = {
  any: 'All',
  male: 'Male',
  female: 'Female',
}

function formatRange(r: {
  sex: string
  low: number | null
  high: number | null
  text_value: string | null
}): string {
  if (r.text_value) return r.text_value
  if (r.low != null && r.high != null) return `${r.low} – ${r.high}`
  if (r.low != null) return `> ${r.low}`
  if (r.high != null) return `< ${r.high}`
  return '—'
}

// =============================================================================
// Component
// =============================================================================

interface ParameterEditorProps {
  test: CpLabTest
  initialParameters: LabParameterWithRanges[]
  /** Specialty vocabulary already in use across the catalog. */
  knownSpecialties: string[]
}

export function ParameterEditor({
  test,
  initialParameters,
  knownSpecialties,
}: ParameterEditorProps) {
  const [params, setParams] = useState<LabParameterWithRanges[]>(initialParameters)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<LabParameterWithRanges | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [, startTransition] = useTransition()

  // Form state
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [unit, setUnit] = useState('')
  const [groupName, setGroupName] = useState('')
  const [inputType, setInputType] = useState<LabParameterInputType>('numeric')
  const [formula, setFormula] = useState('')
  const [optionsCsv, setOptionsCsv] = useState('')
  const [decimals, setDecimals] = useState('2')
  const [ranges, setRanges] = useState<RangeDraft[]>([{ ...EMPTY_RANGE }])
  const [error, setError] = useState<string | null>(null)

  // Parameters grouped into sections, preserving sort_order within each.
  const grouped = useMemo(() => {
    const map = new Map<string, LabParameterWithRanges[]>()
    for (const p of params) {
      const key = p.group_name ?? ''
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    return Array.from(map.entries())
  }, [params])

  /** Codes available to formulas — shown as a hint so users don't guess. */
  const availableCodes = useMemo(
    () => params.filter((p) => p.code && p.id !== editing?.id).map((p) => p.code!),
    [params, editing]
  )

  function openCreate() {
    setEditing(null)
    setName('')
    setCode('')
    setUnit('')
    setGroupName('')
    setInputType('numeric')
    setFormula('')
    setOptionsCsv('')
    setDecimals('2')
    setRanges([{ ...EMPTY_RANGE }])
    setError(null)
    setDialogOpen(true)
  }

  function openEdit(p: LabParameterWithRanges) {
    setEditing(p)
    setName(p.name)
    setCode(p.code ?? '')
    setUnit(p.unit ?? '')
    setGroupName(p.group_name ?? '')
    setInputType(p.input_type)
    setFormula(p.formula ?? '')
    setOptionsCsv((p.options ?? []).join(', '))
    setDecimals(String(p.decimals))
    setRanges(
      p.ranges.length > 0
        ? p.ranges.map((r) => ({
            sex: r.sex,
            low: r.low != null ? String(r.low) : '',
            high: r.high != null ? String(r.high) : '',
            text_value: r.text_value ?? '',
            critical_low: r.critical_low != null ? String(r.critical_low) : '',
            critical_high: r.critical_high != null ? String(r.critical_high) : '',
          }))
        : [{ ...EMPTY_RANGE }]
    )
    setError(null)
    setDialogOpen(true)
  }

  function buildPayload() {
    const num = (s: string) => (s.trim() === '' ? null : Number(s))
    return {
      name: name.trim(),
      code: code.trim() ? code.trim().toLowerCase() : null,
      unit: unit.trim() || null,
      group_name: groupName.trim() || null,
      sort_order: editing?.sort_order ?? (params.length + 1) * 10,
      input_type: inputType,
      formula: inputType === 'formula' ? formula.trim() || null : null,
      options:
        inputType === 'option'
          ? optionsCsv
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : null,
      decimals: Number(decimals) || 0,
      ranges: ranges
        // Drop rows the user left completely blank.
        .filter(
          (r) =>
            r.low.trim() || r.high.trim() || r.text_value.trim() ||
            r.critical_low.trim() || r.critical_high.trim()
        )
        .map((r) => ({
          sex: r.sex,
          low: num(r.low),
          high: num(r.high),
          text_value: r.text_value.trim() || null,
          critical_low: num(r.critical_low),
          critical_high: num(r.critical_high),
        })),
    }
  }

  function handleSave() {
    if (!name.trim()) {
      setError('Parameter name is required')
      return
    }
    if (inputType === 'formula' && !formula.trim()) {
      setError('A formula parameter needs a formula')
      return
    }
    if (inputType === 'option' && !optionsCsv.trim()) {
      setError('An option parameter needs at least one option')
      return
    }

    setIsSaving(true)
    setError(null)
    const payload = buildPayload()

    startTransition(async () => {
      const res = editing
        ? await updateTestParameter(editing.id, payload)
        : await createTestParameter(test.id, payload)
      setIsSaving(false)

      if (!res.success) {
        setError(res.error)
        return
      }

      setParams((prev) => {
        const next = editing
          ? prev.map((p) => (p.id === res.data.id ? res.data : p))
          : [...prev, res.data]
        return next.sort((a, b) => a.sort_order - b.sort_order)
      })
      toast({ title: editing ? 'Parameter updated' : 'Parameter added' })
      setDialogOpen(false)
    })
  }

  function handleDelete(p: LabParameterWithRanges) {
    startTransition(async () => {
      const res = await deleteTestParameter(p.id)
      if (res.success) {
        setParams((prev) => prev.filter((x) => x.id !== p.id))
        toast({ title: 'Parameter removed', description: p.name })
      } else {
        toast({ title: 'Could not remove', description: res.error, variant: 'destructive' })
      }
    })
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= params.length) return

    const next = [...params]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved!)
    // Renumber so the optimistic order survives a refresh.
    const renumbered = next.map((p, i) => ({ ...p, sort_order: (i + 1) * 10 }))
    setParams(renumbered)

    startTransition(async () => {
      const res = await reorderTestParameters(test.id, renumbered.map((p) => p.id))
      if (!res.success) {
        setParams(params) // roll back
        toast({ title: 'Reorder failed', description: res.error, variant: 'destructive' })
      }
    })
  }

  const indexOf = (id: string) => params.findIndex((p) => p.id === id)

  return (
    <div className="space-y-4">
      {/* ── Test summary ─────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
              <FlaskConical className="h-4 w-4 shrink-0 text-primary" />
              {test.name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-muted-foreground">
              {test.department && <span>{test.department}</span>}
              {test.specimen_type && <span>Specimen: {test.specimen_type}</span>}
              <span>
                {params.length} parameter{params.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Parameter
          </Button>
        </div>

        {/* Referring specialties — editable, because the seeded tags were an
            editorial starting point rather than a validated standard. */}
        <div className="border-t border-border/70 px-4 py-3">
          <SpecialtyPicker
            testId={test.id}
            value={test.specialties ?? []}
            knownSpecialties={knownSpecialties}
          />
        </div>
      </div>

      {/* ── Parameter table ──────────────────────────────────────────────── */}
      {params.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 py-14 text-center">
          <FlaskConical className="mx-auto mb-3 h-9 w-9 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">No parameters yet</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground/60">
            Add the analytes this test reports — each with its unit and normal range —
            so results can be entered and flagged automatically.
          </p>
          <div className="mt-4">
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Parameter
            </Button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {/* Column headers */}
          <div className="hidden items-center border-b border-border/50 px-4 py-1.5 sm:flex">
            <div className="w-[64px] shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Order
            </div>
            <div className="min-w-0 flex-1 pr-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Parameter
            </div>
            <div className="w-[110px] shrink-0 pr-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Unit
            </div>
            <div className="min-w-0 flex-1 pr-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Normal Range
            </div>
            <div className="w-[84px] shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Type
            </div>
            <div className="w-[76px] shrink-0" />
          </div>

          {grouped.map(([group, items]) => (
            <div key={group || '__ungrouped'}>
              {group && (
                <div className="border-b border-border/50 bg-muted/20 px-4 py-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group}
                  </span>
                </div>
              )}
              <div className="divide-y divide-border/50">
                {items.map((p) => {
                  const i = indexOf(p.id)
                  const hasCritical = p.ranges.some(
                    (r) => r.critical_low != null || r.critical_high != null
                  )
                  return (
                    <div
                      key={p.id}
                      className="flex flex-wrap items-center px-4 py-2.5 transition-colors hover:bg-muted/20 sm:flex-nowrap"
                    >
                      {/* Reorder */}
                      <div className="flex w-[64px] shrink-0 items-center gap-0.5">
                        <button
                          onClick={() => move(i, -1)}
                          disabled={i === 0}
                          className="rounded p-1 text-muted-foreground/60 transition-colors hover:text-foreground disabled:opacity-25"
                          aria-label={`Move ${p.name} up`}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => move(i, 1)}
                          disabled={i === params.length - 1}
                          className="rounded p-1 text-muted-foreground/60 transition-colors hover:text-foreground disabled:opacity-25"
                          aria-label={`Move ${p.name} down`}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Name + code */}
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="flex items-center gap-1.5 truncate text-[13px] font-medium text-foreground">
                          {p.name}
                          {p.input_type === 'formula' && (
                            <Sigma className="h-3 w-3 shrink-0 text-primary" />
                          )}
                          {hasCritical && (
                            <TriangleAlert className="h-3 w-3 shrink-0 text-amber-500" />
                          )}
                        </p>
                        {p.code && (
                          <p className="truncate font-mono text-[10px] text-muted-foreground/60">
                            {p.code}
                            {p.formula ? ` = ${p.formula}` : ''}
                          </p>
                        )}
                      </div>

                      {/* Unit */}
                      <div className="w-[110px] shrink-0 pr-3">
                        <span className="text-[12px] text-muted-foreground">
                          {p.unit ?? '—'}
                        </span>
                      </div>

                      {/* Ranges — one line per sex variant */}
                      <div className="min-w-0 flex-1 pr-3">
                        {p.ranges.length === 0 ? (
                          <span className="text-[12px] text-muted-foreground/50">—</span>
                        ) : (
                          p.ranges.map((r) => (
                            <p key={r.id} className="truncate text-[12px] text-muted-foreground">
                              {r.sex !== 'any' && (
                                <span className="text-muted-foreground/60">
                                  {SEX_LABEL[r.sex]}:{' '}
                                </span>
                              )}
                              {formatRange(r)}
                            </p>
                          ))
                        )}
                      </div>

                      {/* Type */}
                      <div className="w-[84px] shrink-0">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                            p.input_type === 'formula'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {p.input_type}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex w-[76px] shrink-0 items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(p)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title={`Edit ${p.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(p)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title={`Remove ${p.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / edit dialog ────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-card sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <FlaskConical className="h-4 w-4 text-primary" />
              {editing ? 'Edit Parameter' : 'Add Parameter'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Haemoglobin (Hb)"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Unit</Label>
                <Input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g. g/dL"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Section</Label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Differential Count"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <select
                  value={inputType}
                  onChange={(e) => setInputType(e.target.value as LabParameterInputType)}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="numeric">Numeric</option>
                  <option value="text">Text</option>
                  <option value="option">Option list</option>
                  <option value="formula">Formula (calculated)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Decimal places</Label>
                <Input
                  type="number"
                  min="0"
                  max="6"
                  value={decimals}
                  onChange={(e) => setDecimals(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">
                  Code{' '}
                  <span className="text-muted-foreground/60">
                    — lets other parameters reference this one in a formula
                  </span>
                </Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. hb"
                  className="font-mono"
                />
              </div>

              {inputType === 'formula' && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Formula *</Label>
                  <Input
                    value={formula}
                    onChange={(e) => setFormula(e.target.value)}
                    placeholder="e.g. (hct / rbc) * 10"
                    className="font-mono"
                  />
                  {availableCodes.length > 0 && (
                    <p className="text-[11px] text-muted-foreground/70">
                      Available codes:{' '}
                      <span className="font-mono">{availableCodes.join(', ')}</span>
                    </p>
                  )}
                </div>
              )}

              {inputType === 'option' && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">
                    Options * <span className="text-muted-foreground/60">— comma separated</span>
                  </Label>
                  <Input
                    value={optionsCsv}
                    onChange={(e) => setOptionsCsv(e.target.value)}
                    placeholder="Negative, Trace, 1+, 2+, 3+"
                  />
                </div>
              )}
            </div>

            {/* Reference ranges */}
            <div className="space-y-2 rounded-lg border border-border/70 bg-background/40 p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">
                  Reference Ranges
                </Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRanges((r) => [...r, { ...EMPTY_RANGE }])}
                  className="h-7 border-border text-xs"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add range
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground/70">
                Add one row per variant — e.g. separate Male and Female ranges. Critical
                values flag results needing immediate attention.
              </p>

              {ranges.map((r, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-2 gap-2 rounded-md border border-border/50 p-2 sm:grid-cols-6"
                >
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground/70">Applies to</Label>
                    <select
                      value={r.sex}
                      onChange={(e) =>
                        setRanges((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, sex: e.target.value as LabRangeSex } : x
                          )
                        )
                      }
                      className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="any">All</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>

                  {(['low', 'high', 'critical_low', 'critical_high'] as const).map((field) => (
                    <div key={field} className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground/70">
                        {field === 'low'
                          ? 'Low'
                          : field === 'high'
                          ? 'High'
                          : field === 'critical_low'
                          ? 'Crit. low'
                          : 'Crit. high'}
                      </Label>
                      <Input
                        value={r[field]}
                        onChange={(e) =>
                          setRanges((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, [field]: e.target.value } : x
                            )
                          )
                        }
                        className="h-8 text-xs"
                        inputMode="decimal"
                      />
                    </div>
                  ))}

                  <div className="flex items-end gap-1">
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px] text-muted-foreground/70">Text</Label>
                      <Input
                        value={r.text_value}
                        onChange={(e) =>
                          setRanges((prev) =>
                            prev.map((x, i) =>
                              i === idx ? { ...x, text_value: e.target.value } : x
                            )
                          )
                        }
                        placeholder="Negative"
                        className="h-8 text-xs"
                      />
                    </div>
                    {ranges.length > 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setRanges((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label="Remove range"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
                <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-destructive" />
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isSaving}
              className="border-border"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : editing ? (
                'Save changes'
              ) : (
                'Add parameter'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
