'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrencyPaisas } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import {
  Check,
  FlaskConical,
  Loader2,
  Pencil,
  Plus,
  Search,
  X,
} from 'lucide-react'
import {
  getTestCatalog,
  createTest,
  updateTest,
} from '@/app/actions/lab'
import type { CpLabTest } from '@/types/index'

// =============================================================================
// Types
// =============================================================================

interface TestRow extends CpLabTest {
  isEditing: boolean
  isSaving: boolean
}

interface NewTestForm {
  test_name: string
  test_code: string
  category: string
  price: string // PKR
  cost: string // PKR
  reference_range: string
  unit: string
  turnaround_time: string
  notes: string
}

const DEFAULT_NEW: NewTestForm = {
  test_name: '',
  test_code: '',
  category: '',
  price: '',
  cost: '',
  reference_range: '',
  unit: '',
  turnaround_time: '',
  notes: '',
}

// =============================================================================
// Page
// =============================================================================

export default function LabCatalogPage() {
  const [tests, setTests] = useState<TestRow[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newForm, setNewForm] = useState<NewTestForm>(DEFAULT_NEW)
  const [newErrors, setNewErrors] = useState<Partial<Record<keyof NewTestForm, string>>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [, startTransition] = useTransition()

  // Edit state per row
  const [editValues, setEditValues] = useState<
    Record<string, Partial<{ price: string; cost: string; is_active: boolean }>>
  >({})

  useEffect(() => {
    async function load() {
      const res = await getTestCatalog()
      if (res.success) {
        setTests(
          res.data.map((t) => ({ ...t, isEditing: false, isSaving: false }))
        )
      } else {
        toast({ title: 'Failed to load catalog', description: res.error, variant: 'destructive' })
      }
      setIsLoading(false)
    }
    void load()
  }, [])

  // ─── Filtering ────────────────────────────────────────────────────────────

  const filtered = tests.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.category ?? '').toLowerCase().includes(search.toLowerCase())
  )

  // Group by category
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
      [t.id]: {
        price: (t.price_paisas / 100).toFixed(2),
      },
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
      const res = await updateTest(id, {
        price_paisas: Math.round(price * 100),
      })
      if (res.success) {
        setTests((prev) =>
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  price_paisas: Math.round(price * 100),
                  isEditing: false,
                  isSaving: false,
                }
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
          { ...res.data, isEditing: false, isSaving: false },
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Test Catalog</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tests.length} tests — manage pricing and availability
          </p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add Test
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, code, or category…"
          className="pl-9"
        />
      </div>

      {/* Catalog grouped by category */}
      {Object.keys(byCategory).length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16">
            <FlaskConical className="h-8 w-8 opacity-20 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {search ? 'No tests match your search' : 'No tests in catalog yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(byCategory).map(([category, catTests]) => (
          <div key={category}>
            <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {category}
            </h2>
            <Card className="border-border bg-card">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        <th className="py-2.5 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Test Name
                        </th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Code
                        </th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">
                          Reference
                        </th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Price
                        </th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden lg:table-cell">
                          Cost
                        </th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Active
                        </th>
                        <th className="py-2.5 pl-3 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Edit
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {catTests.map((t) => (
                        <tr
                          key={t.id}
                          className={cn(
                            'transition-colors hover:bg-muted/10',
                            !t.is_active && 'opacity-50'
                          )}
                        >
                          {/* Name */}
                          <td className="py-3 pl-4 pr-3">
                            <div>
                              <p className="font-medium text-foreground">{t.name}</p>
                            </div>
                          </td>

                          {/* Code */}
                          <td className="px-3 py-3">
                            {t.test_code ? (
                              <Badge variant="secondary" className="text-[10px] bg-muted">
                                {t.test_code}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* Reference range */}
                          <td className="px-3 py-3 text-xs text-muted-foreground hidden md:table-cell">
                            {t.reference_range ?? '—'}
                          </td>

                          {/* Price (editable) */}
                          <td className="px-3 py-3 text-right">
                            {t.isEditing ? (
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editValues[t.id]?.price ?? ''}
                                onChange={(e) =>
                                  setEditValues((prev) => ({
                                    ...prev,
                                    [t.id]: {
                                      ...prev[t.id],
                                      price: e.target.value,
                                    },
                                  }))
                                }
                                className="h-7 w-24 text-right text-sm"
                              />
                            ) : (
                              <span className="font-medium text-foreground">
                                {formatCurrencyPaisas(t.price_paisas)}
                              </span>
                            )}
                          </td>

                          {/* Cost (editable) */}
                          <td className="px-3 py-3 text-right hidden lg:table-cell">
                            {t.isEditing ? (
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editValues[t.id]?.cost ?? ''}
                                onChange={(e) =>
                                  setEditValues((prev) => ({
                                    ...prev,
                                    [t.id]: {
                                      ...prev[t.id],
                                      cost: e.target.value,
                                    },
                                  }))
                                }
                                className="h-7 w-24 text-right text-sm"
                              />
                            ) : (
                              <span className="text-muted-foreground">
                                {formatCurrencyPaisas(0)}
                              </span>
                            )}
                          </td>

                          {/* Active toggle */}
                          <td className="px-3 py-3">
                            <Switch
                              checked={t.is_active}
                              onCheckedChange={(v) => handleToggleActive(t.id, v)}
                              disabled={t.isSaving || t.isEditing}
                              aria-label={`Toggle ${t.name}`}
                            />
                          </td>

                          {/* Edit actions */}
                          <td className="py-3 pl-3 pr-4">
                            <div className="flex items-center justify-end gap-1">
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
                                  title="Edit pricing"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
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
                <Label htmlFor="new-code" className="text-xs text-muted-foreground">
                  Test Code
                </Label>
                <Input
                  id="new-code"
                  value={newForm.test_code}
                  onChange={(e) =>
                    setNewForm((p) => ({ ...p, test_code: e.target.value }))
                  }
                  placeholder="e.g. CBC"
                />
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

              <div className="space-y-1.5">
                <Label htmlFor="new-cost" className="text-xs text-muted-foreground">
                  Cost (Rs.)
                </Label>
                <Input
                  id="new-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newForm.cost}
                  onChange={(e) =>
                    setNewForm((p) => ({ ...p, cost: e.target.value }))
                  }
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-unit" className="text-xs text-muted-foreground">
                  Unit
                </Label>
                <Input
                  id="new-unit"
                  value={newForm.unit}
                  onChange={(e) =>
                    setNewForm((p) => ({ ...p, unit: e.target.value }))
                  }
                  placeholder="e.g. mg/dL"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-tat" className="text-xs text-muted-foreground">
                  Turnaround Time
                </Label>
                <Input
                  id="new-tat"
                  value={newForm.turnaround_time}
                  onChange={(e) =>
                    setNewForm((p) => ({ ...p, turnaround_time: e.target.value }))
                  }
                  placeholder="e.g. 2 hours"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="new-ref" className="text-xs text-muted-foreground">
                  Reference Range
                </Label>
                <Input
                  id="new-ref"
                  value={newForm.reference_range}
                  onChange={(e) =>
                    setNewForm((p) => ({ ...p, reference_range: e.target.value }))
                  }
                  placeholder="e.g. 4.5–5.5 g/dL"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="new-notes" className="text-xs text-muted-foreground">
                  Notes
                </Label>
                <Textarea
                  id="new-notes"
                  value={newForm.notes}
                  onChange={(e) =>
                    setNewForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  placeholder="Optional notes…"
                  rows={2}
                  className="resize-none"
                />
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
            <Button
              onClick={handleAddTest}
              disabled={isAdding}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
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
