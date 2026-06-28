'use client'

import React, { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatDate } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import {
  AlertTriangle,
  Beaker,
  Loader2,
  Minus,
  Package,
  Plus,
} from 'lucide-react'
import type { ChemicalWithLowStock } from '@/app/actions/lab'
import { adjustChemicalStock, createChemical } from '@/app/actions/lab'

// =============================================================================
// Props
// =============================================================================

interface ChemicalInventoryProps {
  initialChemicals: ChemicalWithLowStock[]
}

// =============================================================================
// Adjust Stock Dialog
// =============================================================================

interface AdjustDialogState {
  open: boolean
  chemicalId: string
  chemicalName: string
  currentQty: number
  unit: string
  type: 'in' | 'out'
}

const CLOSED_DIALOG: AdjustDialogState = {
  open: false,
  chemicalId: '',
  chemicalName: '',
  currentQty: 0,
  unit: '',
  type: 'in',
}

// =============================================================================
// ChemicalInventory
// =============================================================================

const EMPTY_ADD = { name: '', quantity: '', unit: '', reorder_level: '', cost_price: '', supplier: '', expiry_date: '' }

export function ChemicalInventory({ initialChemicals }: ChemicalInventoryProps) {
  const [chemicals, setChemicals] =
    useState<ChemicalWithLowStock[]>(initialChemicals)
  const [dialog, setDialog] = useState<AdjustDialogState>(CLOSED_DIALOG)
  const [adjustQty, setAdjustQty] = useState<string>('1')
  const [, startTransition] = useTransition()
  const [isPending, setIsPending] = useState(false)

  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_ADD)
  const [addError, setAddError] = useState<string | null>(null)
  const [isAdding, startAdding] = useTransition()

  const lowStockCount = chemicals.filter((c) => c.isLowStock).length

  function handleAdd() {
    setAddError(null)
    const qty = parseFloat(addForm.quantity)
    const reorder = parseFloat(addForm.reorder_level)
    const costPkr = parseFloat(addForm.cost_price || '0')
    if (!addForm.name.trim()) { setAddError('Name is required'); return }
    if (isNaN(qty) || qty < 0) { setAddError('Quantity must be 0 or more'); return }
    if (!addForm.unit.trim()) { setAddError('Unit is required'); return }
    if (isNaN(reorder) || reorder < 0) { setAddError('Reorder level must be 0 or more'); return }

    startAdding(async () => {
      const result = await createChemical({
        name: addForm.name.trim(),
        quantity: qty,
        unit: addForm.unit.trim(),
        reorder_level: reorder,
        cost_price_paisas: Math.round(costPkr * 100),
        supplier: addForm.supplier.trim() || null,
        expiry_date: addForm.expiry_date || null,
      })
      if (!result.success) { setAddError(result.error); return }
      setChemicals((prev) => [...prev, { ...result.data, isLowStock: qty <= reorder }].sort((a, b) => a.name.localeCompare(b.name)))
      setShowAdd(false)
      setAddForm(EMPTY_ADD)
      toast({ title: 'Chemical added', description: `${result.data.name} added to inventory.` })
    })
  }

  function openDialog(
    c: ChemicalWithLowStock,
    type: 'in' | 'out'
  ) {
    setAdjustQty('1')
    setDialog({
      open: true,
      chemicalId: c.id,
      chemicalName: c.name,
      currentQty: Number(c.quantity),
      unit: c.unit,
      type,
    })
  }

  function handleAdjust() {
    const qty = parseFloat(adjustQty)
    if (!qty || qty <= 0) {
      toast({
        title: 'Invalid quantity',
        description: 'Enter a positive quantity.',
        variant: 'destructive',
      })
      return
    }

    setIsPending(true)
    startTransition(async () => {
      const result = await adjustChemicalStock(dialog.chemicalId, qty, dialog.type)
      setIsPending(false)

      if (result.success) {
        const delta = dialog.type === 'in' ? qty : -qty
        setChemicals((prev) =>
          prev.map((c) => {
            if (c.id !== dialog.chemicalId) return c
            const newQty = Math.max(0, Number(c.quantity) + delta)
            return {
              ...c,
              quantity: newQty,
              isLowStock: newQty <= Number(c.reorder_level),
            }
          })
        )
        toast({
          title: dialog.type === 'in' ? 'Stock added' : 'Stock reduced',
          description: `${dialog.chemicalName} updated successfully.`,
        })
        setDialog(CLOSED_DIALOG)
      } else {
        toast({
          title: 'Adjustment failed',
          description: result.error,
          variant: 'destructive',
        })
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-1.5">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {chemicals.length} chemicals
            </span>
          </div>
          {lowStockCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              <span className="text-xs font-medium text-destructive">
                {lowStockCount} low stock
              </span>
            </div>
          )}
        </div>
        <Button size="sm" onClick={() => { setAddError(null); setAddForm(EMPTY_ADD); setShowAdd(true) }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Chemical
        </Button>
      </div>

      {/* Table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">
            Chemical Inventory
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {chemicals.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Beaker className="h-8 w-8 opacity-30" />
              <p className="text-sm">No chemicals in inventory</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="py-2.5 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Chemical
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Stock
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Threshold
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Expiry
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </th>
                    <th className="py-2.5 pl-3 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Adjust
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {chemicals.map((c) => (
                    <tr
                      key={c.id}
                      className={cn(
                        'transition-colors hover:bg-muted/10',
                        c.isLowStock && 'bg-destructive/5'
                      )}
                    >
                      {/* Chemical name */}
                      <td className="py-3 pl-4 pr-3">
                        <div>
                          <p className="font-medium text-foreground">
                            {c.name}
                          </p>
                        </div>
                      </td>

                      {/* Stock qty */}
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            'font-semibold',
                            c.isLowStock ? 'text-destructive' : 'text-foreground'
                          )}
                        >
                          {Number(c.quantity).toFixed(2)}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            {c.unit}
                          </span>
                        </span>
                      </td>

                      {/* Threshold */}
                      <td className="px-3 py-3 text-muted-foreground">
                        {Number(c.reorder_level).toFixed(2)} {c.unit}
                      </td>

                      {/* Expiry */}
                      <td className="px-3 py-3">
                        {c.expiry_date ? (
                          <span
                            className={cn(
                              'text-sm',
                              new Date(c.expiry_date) < new Date()
                                ? 'font-medium text-destructive'
                                : 'text-foreground'
                            )}
                          >
                            {formatDate(c.expiry_date)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Status badge */}
                      <td className="px-3 py-3">
                        {c.isLowStock ? (
                          <Badge
                            variant="secondary"
                            className="bg-destructive/15 text-destructive text-[10px]"
                          >
                            <AlertTriangle className="mr-1 h-2.5 w-2.5" />
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-success/15 text-success text-[10px]"
                          >
                            OK
                          </Badge>
                        )}
                      </td>

                      {/* Adjust buttons */}
                      <td className="py-3 pl-3 pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openDialog(c, 'in')}
                            className="h-7 w-7 text-success hover:bg-success/10"
                            title="Add stock"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openDialog(c, 'out')}
                            className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Remove stock"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Chemical dialog */}
      <Dialog open={showAdd} onOpenChange={(o) => { if (!isAdding) setShowAdd(o) }}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Chemical</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {addError && <p className="text-sm text-destructive">{addError}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Name *</Label>
                <Input value={addForm.name} onChange={(e) => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Hydrochloric Acid" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Initial Quantity *</Label>
                <Input type="number" min="0" step="0.01" value={addForm.quantity} onChange={(e) => setAddForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Unit *</Label>
                <Input value={addForm.unit} onChange={(e) => setAddForm(f => ({ ...f, unit: e.target.value }))} placeholder="ml, g, L, pcs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Reorder Level *</Label>
                <Input type="number" min="0" step="0.01" value={addForm.reorder_level} onChange={(e) => setAddForm(f => ({ ...f, reorder_level: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Cost Price (PKR)</Label>
                <Input type="number" min="0" step="1" value={addForm.cost_price} onChange={(e) => setAddForm(f => ({ ...f, cost_price: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Supplier</Label>
                <Input value={addForm.supplier} onChange={(e) => setAddForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Supplier name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Expiry Date</Label>
                <Input type="date" value={addForm.expiry_date} onChange={(e) => setAddForm(f => ({ ...f, expiry_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)} disabled={isAdding}>Cancel</Button>
            <Button onClick={handleAdd} disabled={isAdding}>
              {isAdding ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding…</> : <><Plus className="mr-2 h-4 w-4" />Add Chemical</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust stock dialog */}
      <Dialog
        open={dialog.open}
        onOpenChange={(open) => {
          if (!open) setDialog(CLOSED_DIALOG)
        }}
      >
        <DialogContent className="bg-card sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {dialog.type === 'in' ? 'Add Stock' : 'Remove Stock'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm font-medium text-foreground">
                {dialog.chemicalName}
              </p>
              <p className="text-xs text-muted-foreground">
                Current: {dialog.currentQty.toFixed(2)} {dialog.unit}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="adjust-qty"
                className="text-xs text-muted-foreground"
              >
                Quantity ({dialog.unit}) *
              </Label>
              <Input
                id="adjust-qty"
                type="number"
                min="0.01"
                step="0.01"
                value={adjustQty}
                onChange={(e) => setAdjustQty(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdjust()
                }}
                placeholder="0.00"
                autoFocus
              />
            </div>

            <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              New stock:{' '}
              <span className="font-medium text-foreground">
                {Math.max(
                  0,
                  dialog.type === 'in'
                    ? dialog.currentQty + (parseFloat(adjustQty) || 0)
                    : dialog.currentQty - (parseFloat(adjustQty) || 0)
                ).toFixed(2)}{' '}
                {dialog.unit}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialog(CLOSED_DIALOG)}
              disabled={isPending}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdjust}
              disabled={isPending}
              className={cn(
                dialog.type === 'in'
                  ? 'bg-success text-white hover:bg-success/90'
                  : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              )}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : dialog.type === 'in' ? (
                <>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Stock
                </>
              ) : (
                <>
                  <Minus className="mr-1.5 h-4 w-4" />
                  Remove Stock
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
