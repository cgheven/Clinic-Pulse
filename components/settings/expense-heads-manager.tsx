'use client'

import React, { useState, useTransition } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import {
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Lock,
  Check,
  X,
} from 'lucide-react'
import type { CpExpenseHead } from '@/types/index'
import {
  createExpenseHead,
  updateExpenseHead,
  deleteExpenseHead,
} from '@/app/actions/settings'

// =============================================================================
// Types
// =============================================================================

interface ExpenseHeadRow extends CpExpenseHead {
  isEditingName: boolean
  editingNameValue: string
  isSavingName: boolean
  isTogglingActive: boolean
  isDeleting: boolean
}

// =============================================================================
// Component
// =============================================================================

interface ExpenseHeadsManagerProps {
  initialHeads: CpExpenseHead[]
}

const createSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
})

export function ExpenseHeadsManager({ initialHeads }: ExpenseHeadsManagerProps) {
  const [heads, setHeads] = useState<ExpenseHeadRow[]>(() =>
    initialHeads.map((h) => ({
      ...h,
      isEditingName: false,
      editingNameValue: h.name,
      isSavingName: false,
      isTogglingActive: false,
      isDeleting: false,
    }))
  )

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newName, setNewName] = useState('')
  const [newNameError, setNewNameError] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [, startTransition] = useTransition()

  // ─── Toggle active ─────────────────────────────────────────────────────────

  function handleToggleActive(id: string, enabled: boolean) {
    setHeads((prev) =>
      prev.map((h) => (h.id === id ? { ...h, isTogglingActive: true } : h))
    )

    startTransition(async () => {
      const result = await updateExpenseHead(id, { is_active: enabled })

      if (result.success) {
        setHeads((prev) =>
          prev.map((h) =>
            h.id === id ? { ...h, is_active: enabled, isTogglingActive: false } : h
          )
        )
        toast({
          title: enabled ? 'Expense head activated' : 'Expense head deactivated',
          description: `Status updated successfully.`,
        })
      } else {
        setHeads((prev) =>
          prev.map((h) => (h.id === id ? { ...h, isTogglingActive: false } : h))
        )
        toast({
          title: 'Update failed',
          description: result.error ?? 'Unknown error',
          variant: 'destructive',
        })
      }
    })
  }

  // ─── Edit name inline ──────────────────────────────────────────────────────

  function startEditName(id: string) {
    setHeads((prev) =>
      prev.map((h) =>
        h.id === id ? { ...h, isEditingName: true, editingNameValue: h.name } : h
      )
    )
  }

  function cancelEditName(id: string) {
    setHeads((prev) =>
      prev.map((h) => (h.id === id ? { ...h, isEditingName: false } : h))
    )
  }

  function handleNameInputChange(id: string, value: string) {
    setHeads((prev) =>
      prev.map((h) => (h.id === id ? { ...h, editingNameValue: value } : h))
    )
  }

  function handleSaveName(head: ExpenseHeadRow) {
    const trimmed = head.editingNameValue.trim()
    if (!trimmed) return

    setHeads((prev) =>
      prev.map((h) => (h.id === head.id ? { ...h, isSavingName: true } : h))
    )

    startTransition(async () => {
      const result = await updateExpenseHead(head.id, { name: trimmed })

      if (result.success) {
        setHeads((prev) =>
          prev.map((h) =>
            h.id === head.id
              ? { ...h, name: trimmed, isEditingName: false, isSavingName: false }
              : h
          )
        )
        toast({ title: 'Name updated', description: `Expense head renamed to "${trimmed}".` })
      } else {
        setHeads((prev) =>
          prev.map((h) => (h.id === head.id ? { ...h, isSavingName: false } : h))
        )
        toast({
          title: 'Update failed',
          description: result.error ?? 'Unknown error',
          variant: 'destructive',
        })
      }
    })
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  function handleDelete(id: string) {
    setHeads((prev) =>
      prev.map((h) => (h.id === id ? { ...h, isDeleting: true } : h))
    )

    startTransition(async () => {
      const result = await deleteExpenseHead(id)

      if (result.success) {
        setHeads((prev) => prev.filter((h) => h.id !== id))
        toast({ title: 'Expense head deleted', description: 'Removed successfully.' })
      } else {
        setHeads((prev) =>
          prev.map((h) => (h.id === id ? { ...h, isDeleting: false } : h))
        )
        toast({
          title: 'Delete failed',
          description: result.error ?? 'Unknown error',
          variant: 'destructive',
        })
      }
    })
  }

  // ─── Add new ───────────────────────────────────────────────────────────────

  function handleAddHead() {
    const parsed = createSchema.safeParse({ name: newName })
    if (!parsed.success) {
      setNewNameError(parsed.error.issues[0]?.message ?? 'Invalid')
      return
    }

    setIsAdding(true)
    startTransition(async () => {
      const result = await createExpenseHead({ name: parsed.data.name })

      setIsAdding(false)

      if (result.success) {
        setHeads((prev) => [
          ...prev,
          {
            ...result.data,
            isEditingName: false,
            editingNameValue: result.data.name,
            isSavingName: false,
            isTogglingActive: false,
            isDeleting: false,
          },
        ])
        toast({ title: 'Expense head created', description: `"${result.data.name}" added.` })
        setShowAddDialog(false)
        setNewName('')
      } else {
        toast({
          title: 'Create failed',
          description: result.error ?? 'Unknown error',
          variant: 'destructive',
        })
      }
    })
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const systemHeads = heads.filter((h) => h.is_system)
  const customHeads = heads.filter((h) => !h.is_system)

  function HeadsTable({ rows, label }: { rows: ExpenseHeadRow[]; label: string }) {
    return (
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-4 text-center text-xs text-muted-foreground">
            No entries
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="py-2 pl-4 pr-3 text-left text-xs font-semibold text-muted-foreground">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                    Status
                  </th>
                  <th className="py-2 pl-3 pr-4 text-right text-xs font-semibold text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((head) => (
                  <tr
                    key={head.id}
                    className={cn(
                      'transition-colors hover:bg-muted/20',
                      !head.is_active && 'opacity-50'
                    )}
                  >
                    {/* Name — editable */}
                    <td className="py-2.5 pl-4 pr-3">
                      {head.isEditingName ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={head.editingNameValue}
                            onChange={(e) =>
                              handleNameInputChange(head.id, e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveName(head)
                              if (e.key === 'Escape') cancelEditName(head.id)
                            }}
                            className="h-7 text-sm"
                            autoFocus
                            disabled={head.isSavingName}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleSaveName(head)}
                            disabled={head.isSavingName}
                            className="h-7 w-7 text-success hover:bg-success/10 hover:text-success"
                          >
                            {head.isSavingName ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => cancelEditName(head.id)}
                            disabled={head.isSavingName}
                            className="h-7 w-7 text-muted-foreground hover:bg-muted"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{head.name}</span>
                          {head.is_system && (
                            <Lock className="h-3 w-3 text-muted-foreground/50" />
                          )}
                        </div>
                      )}
                    </td>

                    {/* Active badge */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={head.is_active}
                          onCheckedChange={(checked) =>
                            handleToggleActive(head.id, checked)
                          }
                          disabled={head.isTogglingActive || head.isDeleting}
                          aria-label={`Toggle ${head.name}`}
                        />
                        {head.isTogglingActive && (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px]',
                            head.is_active
                              ? 'bg-success/15 text-success'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {head.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 pl-3 pr-4">
                      <div className="flex items-center justify-end gap-1">
                        {!head.is_system && !head.isEditingName && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => startEditName(head.id)}
                            disabled={head.isDeleting}
                            className="h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Rename"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {!head.is_system && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(head.id)}
                            disabled={head.isDeleting || head.isEditingName}
                            className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Delete"
                          >
                            {head.isDeleting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Expense Heads</h3>
          <p className="text-xs text-muted-foreground">
            Manage expense categories across all departments. System heads cannot be deleted.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAddDialog(true)}
          className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Head
        </Button>
      </div>

      <HeadsTable rows={systemHeads} label="System Heads" />
      <HeadsTable rows={customHeads} label="Custom Heads" />

      {/* Add dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-card sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">New Expense Head</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-head-name" className="text-xs text-muted-foreground">
                Name *
              </Label>
              <Input
                id="new-head-name"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value)
                  setNewNameError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddHead()
                }}
                placeholder="e.g. Equipment Purchase"
                autoFocus
                className={cn(newNameError && 'border-destructive')}
              />
              {newNameError && (
                <p className="text-xs text-destructive">{newNameError}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              disabled={isAdding}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddHead}
              disabled={isAdding}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isAdding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
