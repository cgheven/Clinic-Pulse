'use client'

import React, { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn, formatCurrencyPaisas } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import Link from 'next/link'
import {
  Check,
  ChevronRight,
  FlaskConical,
  Loader2,
  Pencil,
  Plus,
  Search,
  X,
} from 'lucide-react'
import {
  createTest,
  updateTest,
} from '@/app/actions/lab'
import type { LabTestWithParameters } from '@/app/actions/lab'
import type { LabParameterWithRanges } from '@/types/index'

// =============================================================================
// Types
// =============================================================================

interface TestRow extends LabTestWithParameters {
  isEditing: boolean
  isSaving: boolean
}

const SEX_LABEL: Record<string, string> = {
  any: '',
  male: 'Male',
  female: 'Female',
}

/** Human-readable normal range, e.g. "4.5 – 5.5", "> 40", "Negative". */
function formatRange(r: {
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

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-3 py-1 text-[12px] font-medium transition-colors',
        active
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
      )}
    >
      {label}
      <span className="ml-1.5 text-[11px] opacity-60">{count}</span>
    </button>
  )
}

/** Splits parameters into their sections, preserving sort order within each. */
function groupParameters(
  params: LabParameterWithRanges[]
): Array<[string, LabParameterWithRanges[]]> {
  const map = new Map<string, LabParameterWithRanges[]>()
  for (const p of params) {
    const key = p.group_name ?? ''
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(p)
  }
  return Array.from(map.entries())
}

interface NewTestForm {
  test_name: string
  category: string
  price: string
}

const DEFAULT_NEW: NewTestForm = {
  test_name: '',
  category: '',
  price: '',
}

// =============================================================================
// Client manager
//
// Seeded with server-fetched rows (`initialTests`) so the catalog is in the
// initial HTML rather than behind a mount-effect round-trip.
// =============================================================================

export function TestCatalogManager({
  initialTests,
}: {
  initialTests: LabTestWithParameters[]
}) {
  const [tests, setTests] = useState<TestRow[]>(() =>
    initialTests.map((t) => ({ ...t, isEditing: false, isSaving: false }))
  )
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newForm, setNewForm] = useState<NewTestForm>(DEFAULT_NEW)
  const [newErrors, setNewErrors] = useState<Partial<Record<keyof NewTestForm, string>>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [, startTransition] = useTransition()

  const [editValues, setEditValues] = useState<
    Record<string, Partial<{ price: string; cost: string; is_active: boolean }>>
  >({})

  // ─── Filtering ────────────────────────────────────────────────────────────

  // Search matches the test itself OR any of its parameters, so looking up
  // "TSH" finds the Thyroid Profile and "MCV" finds the CBC.
  const q = search.trim().toLowerCase()
  const matchesParameter = (t: TestRow) =>
    t.parameters.some(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.code ?? '').toLowerCase().includes(q) ||
        (p.group_name ?? '').toLowerCase().includes(q)
    )

  // Department buckets, derived from the data so new departments appear
  // automatically without touching this component.
  const departments = Array.from(
    tests.reduce((acc, t) => {
      const d = t.department?.trim() || 'Uncategorised'
      acc.set(d, (acc.get(d) ?? 0) + 1)
      return acc
    }, new Map<string, number>())
  ).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))

  // Referring-specialty buckets — a test can belong to several.
  const specialties = Array.from(
    tests.reduce((acc, t) => {
      for (const s of t.specialties ?? []) acc.set(s, (acc.get(s) ?? 0) + 1)
      return acc
    }, new Map<string, number>())
  ).sort((a, b) => a[0].localeCompare(b[0]))

  const byDept =
    deptFilter === 'all'
      ? tests
      : tests.filter((t) => (t.department?.trim() || 'Uncategorised') === deptFilter)

  const bySpecialty =
    specialtyFilter === 'all'
      ? byDept
      : byDept.filter((t) => (t.specialties ?? []).includes(specialtyFilter))

  const filtered = !q
    ? bySpecialty
    : bySpecialty.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.category ?? '').toLowerCase().includes(q) ||
          (t.department ?? '').toLowerCase().includes(q) ||
          (t.specimen_type ?? '').toLowerCase().includes(q) ||
          matchesParameter(t)
      )

  /**
   * When the hit came from a parameter rather than the test name, open the row
   * automatically — otherwise the user searches "MCV", sees "Complete Blood
   * Count", and still has to click to find out why it matched.
   */
  const isExpanded = (t: TestRow) =>
    expanded.has(t.id) || (q.length > 0 && !t.name.toLowerCase().includes(q) && matchesParameter(t))

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const byCategory: Record<string, TestRow[]> = {}
  for (const t of filtered) {
    const cat = t.category ?? 'Uncategorized'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat]!.push(t)
  }

  // ─── Toggle active ─────────────────────────────────────────────────────────

  function handleToggleActive(id: string, enabled: boolean) {
    setTests((prev) => prev.map((t) => (t.id === id ? { ...t, isSaving: true } : t)))
    startTransition(async () => {
      const res = await updateTest(id, { is_active: enabled })
      if (res.success) {
        setTests((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, is_active: enabled, isSaving: false } : t
          )
        )
      } else {
        setTests((prev) => prev.map((t) => (t.id === id ? { ...t, isSaving: false } : t)))
        toast({ title: 'Update failed', description: res.error, variant: 'destructive' })
      }
    })
  }

  // ─── Inline edit ──────────────────────────────────────────────────────────

  function startEdit(t: TestRow) {
    setEditValues((prev) => ({
      ...prev,
      [t.id]: { price: (t.price_paisas / 100).toFixed(2) },
    }))
    setTests((prev) => prev.map((r) => (r.id === t.id ? { ...r, isEditing: true } : r)))
  }

  function cancelEdit(id: string) {
    setTests((prev) => prev.map((t) => (t.id === id ? { ...t, isEditing: false } : t)))
    setEditValues((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function saveEdit(id: string) {
    const vals = editValues[id]
    if (!vals) return
    const price = parseFloat(vals.price ?? '0')
    if (isNaN(price) || price < 0) {
      toast({ title: 'Invalid price', variant: 'destructive' })
      return
    }

    setTests((prev) => prev.map((t) => (t.id === id ? { ...t, isSaving: true } : t)))
    startTransition(async () => {
      const res = await updateTest(id, { price_paisas: Math.round(price * 100) })
      if (res.success) {
        setTests((prev) =>
          prev.map((t) =>
            t.id === id
              ? { ...t, price_paisas: Math.round(price * 100), isEditing: false, isSaving: false }
              : t
          )
        )
        toast({ title: 'Test updated' })
      } else {
        setTests((prev) => prev.map((t) => (t.id === id ? { ...t, isSaving: false } : t)))
        toast({ title: 'Update failed', description: res.error, variant: 'destructive' })
      }
    })
  }

  // ─── Add new test ──────────────────────────────────────────────────────────

  function validateNew(): boolean {
    const e: Partial<Record<keyof NewTestForm, string>> = {}
    if (!newForm.test_name.trim()) e.test_name = 'Test name is required'
    if (!newForm.price || isNaN(parseFloat(newForm.price)) || parseFloat(newForm.price) < 0) {
      e.price = 'Enter a valid price'
    }
    setNewErrors(e)
    return Object.keys(e).length === 0
  }

  function handleAddTest() {
    if (!validateNew()) return
    setIsAdding(true)
    startTransition(async () => {
      const res = await createTest({
        name: newForm.test_name.trim(),
        category: newForm.category.trim() || undefined,
        price_paisas: Math.round(parseFloat(newForm.price) * 100),
      })
      setIsAdding(false)
      if (res.success) {
        setTests((prev) => [
          // A brand-new test has no parameters until they're added in the editor.
          { ...res.data, parameters: [], isEditing: false, isSaving: false },
          ...prev,
        ])
        toast({ title: 'Test added', description: `"${res.data.name}" added to catalog.` })
        setShowAddDialog(false)
        setNewForm(DEFAULT_NEW)
      } else {
        toast({ title: 'Failed', description: res.error, variant: 'destructive' })
      }
    })
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground sm:text-xl">
          Test Catalog
          <span className="ml-2 text-[12px] font-normal text-muted-foreground">
            {filtered.length === tests.length
              ? `${tests.length} tests`
              : `${filtered.length} of ${tests.length} tests`}
          </span>
        </h1>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Test
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by test, parameter, department or specimen…"
          className="pl-9 h-8 text-sm"
        />
      </div>

      {/* Specialty — who orders the test. A test can sit in several. */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/50">
          Specialty
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip
            label="All"
            count={tests.length}
            active={specialtyFilter === 'all'}
            onClick={() => setSpecialtyFilter('all')}
          />
          {specialties.map(([name, count]) => (
            <FilterChip
              key={name}
              label={name}
              count={count}
              active={specialtyFilter === name}
              onClick={() => setSpecialtyFilter(name === specialtyFilter ? 'all' : name)}
            />
          ))}
        </div>
      </div>

      {/* Lab department — which bench runs it */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/50">
          Department
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip
            label="All"
            count={tests.length}
            active={deptFilter === 'all'}
            onClick={() => setDeptFilter('all')}
          />
          {departments.map(([dept, count]) => (
            <FilterChip
              key={dept}
              label={dept}
              count={count}
              active={deptFilter === dept}
              onClick={() => setDeptFilter(dept === deptFilter ? 'all' : dept)}
            />
          ))}
        </div>
      </div>

      {/* Catalog grouped by category */}
      {Object.keys(byCategory).length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <FlaskConical className="h-8 w-8 opacity-20 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {search || deptFilter !== 'all' || specialtyFilter !== 'all'
                ? 'No tests match the current filter'
                : 'No tests in catalog yet'}
            </p>
            {(search || deptFilter !== 'all' || specialtyFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setDeptFilter('all')
                  setSpecialtyFilter('all')
                }}
                className="text-xs text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      ) : (
        Object.entries(byCategory).map(([category, catTests]) => (
          <div key={category} className="overflow-hidden rounded-xl border border-border bg-card">
            {/* Section header */}
            <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {category}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {catTests.length} test{catTests.length !== 1 ? 's' : ''}
              </span>
            </div>
            {/* Column headers */}
            <div className="flex items-center border-b border-border/50 px-4 py-1.5">
              <span className="flex-1 text-[10px] uppercase tracking-wide text-muted-foreground">Name</span>
              <span className="w-28 text-right text-[10px] uppercase tracking-wide text-muted-foreground">Price</span>
              <span className="w-14 text-center text-[10px] uppercase tracking-wide text-muted-foreground">Active</span>
              <span className="w-16 text-right text-[10px] uppercase tracking-wide text-muted-foreground">Edit</span>
            </div>
            {/* Data rows */}
            <div className="divide-y divide-border/50">
              {catTests.map((t) => (
                <div key={t.id}>
                <div
                  className={cn(
                    'flex items-center px-4 py-2.5 hover:bg-muted/20 transition-colors',
                    !t.is_active && 'opacity-50'
                  )}
                >
                  {/* Name — single line, clicking opens the parameters &
                      ranges page. The chevron is an optional inline peek so
                      the list itself stays compact. */}
                  <div className="flex min-w-0 flex-1 items-center gap-1.5 pr-2">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(t.id)}
                      disabled={t.parameters.length === 0}
                      className="shrink-0 rounded p-0.5 text-muted-foreground/40 transition-colors hover:text-foreground disabled:opacity-0"
                      aria-expanded={isExpanded(t)}
                      aria-label={`${isExpanded(t) ? 'Hide' : 'Preview'} parameters for ${t.name}`}
                      title={isExpanded(t) ? 'Hide parameters' : 'Preview parameters'}
                    >
                      <ChevronRight
                        className={cn(
                          'h-3.5 w-3.5 transition-transform',
                          isExpanded(t) && 'rotate-90'
                        )}
                      />
                    </button>

                    <Link
                      href={`/lab/catalog/${t.id}`}
                      className="group/name flex min-w-0 flex-1 items-baseline gap-2"
                      title={`Open parameters & reference ranges for ${t.name}`}
                    >
                      <span className="truncate text-sm font-medium text-foreground transition-colors group-hover/name:text-primary">
                        {t.name}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground/50">
                        {t.parameters.length > 0
                          ? `${t.parameters.length} param${t.parameters.length === 1 ? '' : 's'}`
                          : 'no params'}
                      </span>
                    </Link>
                  </div>

                  {/* Price (editable) */}
                  <div className="w-28 flex justify-end">
                    {t.isEditing ? (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editValues[t.id]?.price ?? ''}
                        onChange={(e) =>
                          setEditValues((prev) => ({
                            ...prev,
                            [t.id]: { ...prev[t.id], price: e.target.value },
                          }))
                        }
                        className="h-7 w-24 text-right text-sm"
                      />
                    ) : (
                      <span className="text-sm font-medium text-foreground">
                        {formatCurrencyPaisas(t.price_paisas)}
                      </span>
                    )}
                  </div>

                  {/* Active toggle */}
                  <div className="w-14 flex justify-center">
                    <Switch
                      checked={t.is_active}
                      onCheckedChange={(v) => handleToggleActive(t.id, v)}
                      disabled={t.isSaving || t.isEditing}
                      aria-label={`Toggle ${t.name}`}
                    />
                  </div>

                  {/* Edit actions */}
                  <div className="w-16 flex items-center justify-end gap-1">
                    {t.isEditing ? (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => saveEdit(t.id)}
                          disabled={t.isSaving}
                          className="h-7 w-7 text-success hover:bg-success/10"
                          title="Save"
                        >
                          {t.isSaving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => cancelEdit(t.id)}
                          disabled={t.isSaving}
                          className="h-7 w-7 text-muted-foreground hover:bg-muted"
                          title="Cancel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEdit(t)}
                        disabled={t.isSaving}
                        className="h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Edit price only — use Parameters to change ranges"
                        aria-label={`Edit price for ${t.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* ── Expanded parameter reference ─────────────────────── */}
                {isExpanded(t) && t.parameters.length > 0 && (
                  <div className="border-t border-border/50 bg-muted/10 px-4 py-3">
                    {/* No edit button here — clicking the test name above
                        already opens the parameters & ranges page. */}
                    {(t.department || t.methodology) && (
                      <p className="mb-2 text-[11px] text-muted-foreground/70">
                        {[t.department, t.methodology].filter(Boolean).join(' · ')}
                      </p>
                    )}

                    {/* Current specialty tags, shown here so they can be
                        audited by scrolling the catalog rather than opening
                        every test's detail page one at a time. */}
                    <div className="mb-2 flex flex-wrap items-center gap-1">
                      {(t.specialties ?? []).length === 0 ? (
                        <span className="text-[11px] text-muted-foreground/50">
                          No specialty tags
                        </span>
                      ) : (
                        (t.specialties ?? []).map((s) => (
                          <span
                            key={s}
                            className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {s}
                          </span>
                        ))
                      )}
                    </div>

                    {/* Reference table headers */}
                    <div className="hidden items-center border-b border-border/40 pb-1 sm:flex">
                      <span className="min-w-0 flex-1 pr-3 text-[10px] uppercase tracking-wide text-muted-foreground/60">
                        Parameter
                      </span>
                      <span className="w-[100px] shrink-0 pr-3 text-[10px] uppercase tracking-wide text-muted-foreground/60">
                        Unit
                      </span>
                      <span className="min-w-0 flex-1 text-[10px] uppercase tracking-wide text-muted-foreground/60">
                        Normal Range
                      </span>
                    </div>

                    {groupParameters(t.parameters).map(([group, items]) => (
                      <div key={group || '__none'}>
                        {group && (
                          <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                            {group}
                          </p>
                        )}
                        <div className="divide-y divide-border/30">
                          {items.map((p) => (
                            <div
                              key={p.id}
                              className="flex flex-wrap items-start py-1.5 sm:flex-nowrap sm:items-center"
                            >
                              <span className="min-w-0 flex-1 truncate pr-3 text-[12px] text-foreground">
                                {p.name}
                                {p.input_type === 'formula' && (
                                  <span className="ml-1.5 text-[10px] text-primary">calc</span>
                                )}
                              </span>
                              <span className="w-[100px] shrink-0 pr-3 text-[12px] text-muted-foreground">
                                {p.unit ?? '—'}
                              </span>
                              <span className="min-w-0 flex-1 text-[12px] text-muted-foreground">
                                {p.ranges.length === 0
                                  ? '—'
                                  : p.ranges.map((r) => (
                                      <span key={r.id} className="mr-3 inline-block">
                                        {SEX_LABEL[r.sex] && (
                                          <span className="text-muted-foreground/60">
                                            {SEX_LABEL[r.sex]}:{' '}
                                          </span>
                                        )}
                                        {formatRange(r)}
                                      </span>
                                    ))}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Add test dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <FlaskConical className="h-4 w-4 text-primary" />
              Add Test to Catalog
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="new-name" className="text-xs text-muted-foreground">
                  Test Name *
                </Label>
                <Input
                  id="new-name"
                  value={newForm.test_name}
                  onChange={(e) =>
                    setNewForm((p) => ({ ...p, test_name: e.target.value }))
                  }
                  placeholder="e.g. Complete Blood Count"
                  className={cn(newErrors.test_name && 'border-destructive')}
                  autoFocus
                />
                {newErrors.test_name && (
                  <p className="text-xs text-destructive">{newErrors.test_name}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-category" className="text-xs text-muted-foreground">
                  Category
                </Label>
                <Input
                  id="new-category"
                  value={newForm.category}
                  onChange={(e) =>
                    setNewForm((p) => ({ ...p, category: e.target.value }))
                  }
                  placeholder="e.g. Hematology"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-price" className="text-xs text-muted-foreground">
                  Price (Rs.) *
                </Label>
                <Input
                  id="new-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newForm.price}
                  onChange={(e) =>
                    setNewForm((p) => ({ ...p, price: e.target.value }))
                  }
                  placeholder="0.00"
                  className={cn(newErrors.price && 'border-destructive')}
                />
                {newErrors.price && (
                  <p className="text-xs text-destructive">{newErrors.price}</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false)
                setNewForm(DEFAULT_NEW)
                setNewErrors({})
              }}
              disabled={isAdding}
              className="border-border"
            >
              Cancel
            </Button>
            <Button onClick={handleAddTest} disabled={isAdding}>
              {isAdding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding…
                </>
              ) : (
                'Add Test'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
