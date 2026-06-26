'use client'

import React, { useState, useTransition } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
  Tag,
} from 'lucide-react'
import type { CpExpenseHead } from '@/types/index'
import { createExpenseHead, updateExpenseHead, deleteExpenseHead } from '@/app/actions/settings'

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

interface ExpenseHeadsManagerProps {
  initialHeads: CpExpenseHead[]
}

const createSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
})

// =============================================================================
// Component
// =============================================================================

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

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function handleToggleActive(id: string, enabled: boolean) {
    setHeads((prev) => prev.map((h) => (h.id === id ? { ...h, isTogglingActive: true } : h)))
    startTransition(async () => {
      const result = await updateExpenseHead(id, { is_active: enabled })
      if (result.success) {
        setHeads((prev) =>
          prev.map((h) => (h.id === id ? { ...h, is_active: enabled, isTogglingActive: false } : h))
        )
        toast({ title: enabled ? 'Activated' : 'Deactivated' })
      } else {
        setHeads((prev) => prev.map((h) => (h.id === id ? { ...h, isTogglingActive: false } : h)))
        toast({ title: 'Update failed', description: result.error, variant: 'destructive' })
      }
    })
  }

  function startEditName(id: string) {
    setHeads((prev) =>
      prev.map((h) => (h.id === id ? { ...h, isEditingName: true, editingNameValue: h.name } : h))
    )
  }

  function cancelEditName(id: string) {
    setHeads((prev) => prev.map((h) => (h.id === id ? { ...h, isEditingName: false } : h)))
  }

  function handleNameInputChange(id: string, value: string) {
    setHeads((prev) => prev.map((h) => (h.id === id ? { ...h, editingNameValue: value } : h)))
  }

  function handleSaveName(head: ExpenseHeadRow) {
    const trimmed = head.editingNameValue.trim()
    if (!trimmed) return
    setHeads((prev) => prev.map((h) => (h.id === head.id ? { ...h, isSavingName: true } : h)))
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
        toast({ title: 'Renamed', description: `"${trimmed}" saved.` })
      } else {
        setHeads((prev) => prev.map((h) => (h.id === head.id ? { ...h, isSavingName: false } : h)))
        toast({ title: 'Update failed', description: result.error, variant: 'destructive' })
      }
    })
  }

  function handleDelete(id: string) {
    setHeads((prev) => prev.map((h) => (h.id === id ? { ...h, isDeleting: true } : h)))
    startTransition(async () => {
      const result = await deleteExpenseHead(id)
      if (result.success) {
        setHeads((prev) => prev.filter((h) => h.id !== id))
        toast({ title: 'Deleted' })
      } else {
        setHeads((prev) => prev.map((h) => (h.id === id ? { ...h, isDeleting: false } : h)))
        toast({ title: 'Delete failed', description: result.error, variant: 'destructive' })
      }
    })
  }

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
        toast({ title: 'Created', description: `"${result.data.name}" added.` })
        setShowAddDialog(false)
        setNewName('')
      } else {
        toast({ title: 'Create failed', description: result.error, variant: 'destructive' })
      }
    })
  }

  // ─── Row sub-component ────────────────────────────────────────────────────

  function HeadRow({ head }: { head: ExpenseHeadRow }) {
    return (
      <div
        className={cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/30',
          !head.is_active && 'opacity-40'
        )}
      >
        {/* Active dot */}
        <div
          className={cn(
            'h-1.5 w-1.5 shrink-0 rounded-full transition-colors',
            head.is_active ? 'bg-success' : 'bg-muted-foreground/40'
          )}
        />

        {/* Name / inline edit */}
        {head.isEditingName ? (
          <div className="flex flex-1 items-center gap-1.5 min-w-0">
            <Input
              value={head.editingNameValue}
              onChange={(e) => handleNameInputChange(head.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName(head)
                if (e.key === 'Escape') cancelEditName(head.id)
              }}
              className="h-7 flex-1 text-sm"
              autoFocus
              disabled={head.isSavingName}
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleSaveName(head)}
              disabled={head.isSavingName}
              className="h-7 w-7 shrink-0 text-success hover:bg-success/10 hover:text-success"
            >
              {head.isSavingName
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Check className="h-3.5 w-3.5" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => cancelEditName(head.id)}
              disabled={head.isSavingName}
              className="h-7 w-7 shrink-0 text-muted-foreground hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <span className="flex-1 min-w-0 truncate text-sm text-foreground">
            {head.name}
          </span>
        )}

        {/* Right side */}
        {!head.isEditingName && (
          <div className="flex items-center gap-1 shrink-0">
            {/* Edit / delete — custom only, appear on hover */}
            {!head.is_system && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => startEditName(head.id)}
                  disabled={head.isDeleting}
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(head.id)}
                  disabled={head.isDeleting || head.isEditingName}
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  {head.isDeleting
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Trash2 className="h-3 w-3" />}
                </Button>
              </>
            )}

            {/* Lock icon for system heads */}
            {head.is_system && (
              <Lock className="h-3 w-3 text-muted-foreground/25 mr-1" />
            )}

            {/* Toggle */}
            {head.isTogglingActive
              ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground mx-1" />
              : (
                <Switch
                  checked={head.is_active}
                  onCheckedChange={(v) => handleToggleActive(head.id, v)}
                  disabled={head.isTogglingActive || head.isDeleting}
                  aria-label={`Toggle ${head.name}`}
                />
              )
            }
          </div>
        )}
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const systemHeads = heads.filter((h) => h.is_system)
  const customHeads = heads.filter((h) => !h.is_system)

  return (
    <div className="space-y-5">

      {/* ── Top bar: Add button ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground/60">
          {heads.filter(h => h.is_active).length} of {heads.length} active
        </p>
        <Button
          size="sm"
          onClick={() => setShowAddDialog(true)}
          className="h-8 px-3 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Head
        </Button>
      </div>

      {/* ── System heads — 2-column compact grid ──────────────────────────── */}
      {systemHeads.length > 0 && (
        <div className="space-y-1">
          <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
            System
          </p>
          <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
            {systemHeads.map((head) => (
              <HeadRow key={head.id} head={head} />
            ))}
          </div>
        </div>
      )}

      {/* ── Custom heads — single column ──────────────────────────────────── */}
      <div className="space-y-1">
        <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
          Custom
        </p>
        {customHeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-8 text-center">
            <Tag className="h-5 w-5 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground/50">
              No custom expense heads yet.{' '}
              <button
                onClick={() => setShowAddDialog(true)}
                className="text-primary underline-offset-2 hover:underline"
              >
                Add one
              </button>
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {customHeads.map((head) => (
              <HeadRow key={head.id} head={head} />
            ))}
          </div>
        )}
      </div>

      {/* ── Add dialog ────────────────────────────────────────────────────── */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-card sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground text-base">New Expense Head</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="new-head-name" className="text-xs text-muted-foreground">
                Name *
              </Label>
              <Input
                id="new-head-name"
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setNewNameError('') }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddHead() }}
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
              {isAdding
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</>
                : 'Create'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
