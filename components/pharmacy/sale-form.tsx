'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, ShoppingCart, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { cn, formatCurrencyPaisas } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { recordSale } from '@/app/actions/pharmacy'
import type { CpPharmacyInventory } from '@/types/index'

// =============================================================================
// Types
// =============================================================================

type InventoryOption = Pick<
  CpPharmacyInventory,
  'id' | 'name' | 'generic_name' | 'unit' | 'sale_price_paisas' | 'stock_qty'
>

interface SaleLineItem {
  id: string               // client-side key
  inventory_item_id: string
  medicine_name: string
  unit: string
  available_qty: number
  quantity_sold: number
  unit_price: number       // paisas
  discount_amount: number  // paisas
}

interface SaleFormProps {
  inventory: InventoryOption[]
  paymentMethods: Array<{ method: string; label: string }>
}

function lineTotal(item: SaleLineItem): number {
  return Math.max(0, item.quantity_sold * item.unit_price - item.discount_amount)
}

let _lineId = 0
function newLineId(): string {
  return `line_${++_lineId}`
}

function emptyLine(): SaleLineItem {
  return {
    id: newLineId(),
    inventory_item_id: '',
    medicine_name: '',
    unit: '',
    available_qty: 0,
    quantity_sold: 1,
    unit_price: 0,
    discount_amount: 0,
  }
}

// =============================================================================
// Component
// =============================================================================

export function SaleForm({ inventory, paymentMethods }: SaleFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [lines, setLines] = useState<SaleLineItem[]>([emptyLine()])
  const [paymentMethod, setPaymentMethod] = useState<string>(
    paymentMethods[0]?.method ?? ''
  )
  const [notes, setNotes] = useState('')

  // Running total
  const grandTotal = lines.reduce((sum, l) => sum + lineTotal(l), 0)
  const hasValidLines = lines.every(
    (l) => l.inventory_item_id && l.quantity_sold > 0 && l.quantity_sold <= l.available_qty
  )

  // ── Line handlers ──────────────────────────────────────────────────────────

  function addLine() {
    setLines((prev) => [...prev, emptyLine()])
  }

  function removeLine(id: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev))
  }

  function updateLine(id: string, updates: Partial<SaleLineItem>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)))
  }

  function selectMedicine(lineId: string, inventoryId: string) {
    const inv = inventory.find((i) => i.id === inventoryId)
    if (!inv) return

    updateLine(lineId, {
      inventory_item_id: inv.id,
      medicine_name: inv.name,
      unit: inv.unit,
      available_qty: inv.stock_qty,
      unit_price: inv.sale_price_paisas,
      quantity_sold: 1,
      discount_amount: 0,
    })
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!paymentMethod) {
      toast({ title: 'Select a payment method', variant: 'destructive' })
      return
    }

    if (!hasValidLines) {
      toast({
        title: 'Invalid sale items',
        description: 'Check quantities do not exceed available stock.',
        variant: 'destructive',
      })
      return
    }

    startTransition(async () => {
      const totalDiscountPaisas = lines.reduce((s, l) => s + l.discount_amount, 0)

      const result = await recordSale({
        items: lines.map((l) => ({
          inventory_id: l.inventory_item_id,
          qty: l.quantity_sold,
        })),
        payment_method: paymentMethod as 'cash' | 'jazzcash' | 'easypaisa' | 'bank_transfer',
        discount_paisas: totalDiscountPaisas,
        notes: notes.trim() || null,
      })

      if (result.success) {
        toast({
          title: 'Sale recorded',
          description: `Total: ${formatCurrencyPaisas(result.data.total_paisas)}.`,
        })
        router.push('/pharmacy/sales')
      } else {
        toast({
          title: 'Failed to record sale',
          description: result.error,
          variant: 'destructive',
        })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Line items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Sale Items</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLine}
            disabled={isPending}
            className="h-8 gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Item
          </Button>
        </div>

        {/* Column headers */}
        <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-1 md:grid">
          <p className="text-xs font-medium text-muted-foreground">Medicine</p>
          <p className="text-xs font-medium text-muted-foreground">Qty</p>
          <p className="text-xs font-medium text-muted-foreground">Unit Price (Rs)</p>
          <p className="text-xs font-medium text-muted-foreground">Discount (Rs)</p>
          <p className="text-xs font-medium text-muted-foreground">Total</p>
        </div>

        {/* Line rows */}
        <div className="space-y-2">
          {lines.map((line, idx) => (
            <LineItemRow
              key={line.id}
              line={line}
              index={idx}
              inventory={inventory}
              isPending={isPending}
              canRemove={lines.length > 1}
              onSelectMedicine={(invId) => selectMedicine(line.id, invId)}
              onUpdateQty={(qty) => updateLine(line.id, { quantity_sold: qty })}
              onUpdatePrice={(p) => updateLine(line.id, { unit_price: p })}
              onUpdateDiscount={(d) => updateLine(line.id, { discount_amount: d })}
              onRemove={() => removeLine(line.id)}
            />
          ))}
        </div>
      </div>

      <Separator className="bg-border" />

      {/* Running total */}
      <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Grand Total</p>
            <p className="text-lg font-bold text-primary sm:text-xl">{formatCurrencyPaisas(grandTotal)}</p>
          </div>

          <div className="text-right">
            <p className="text-xs text-muted-foreground">{lines.length} item(s)</p>
            <p className="text-xs text-muted-foreground">
              Discount:{' '}
              {formatCurrencyPaisas(lines.reduce((s, l) => s + l.discount_amount, 0))}
            </p>
          </div>
        </div>
      </div>

      {/* Payment + meta */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Payment method */}
        <div className="space-y-1.5">
          <Label htmlFor="payment_method" className="text-sm">
            Payment Method <span className="text-destructive">*</span>
          </Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={isPending}>
            <SelectTrigger id="payment_method">
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              {paymentMethods.map((pm) => (
                <SelectItem key={pm.method} value={pm.method}>
                  {pm.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="notes" className="text-sm">
            Notes <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Prescription no., patient name, etc."
            disabled={isPending}
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => router.back()}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          disabled={isPending || !hasValidLines || !paymentMethod || grandTotal === 0}
          className="gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Recording…
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" />
              Record Sale — {formatCurrencyPaisas(grandTotal)}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

// =============================================================================
// LineItemRow
// =============================================================================

interface LineItemRowProps {
  line: SaleLineItem
  index: number
  inventory: InventoryOption[]
  isPending: boolean
  canRemove: boolean
  onSelectMedicine: (id: string) => void
  onUpdateQty: (qty: number) => void
  onUpdatePrice: (p: number) => void
  onUpdateDiscount: (d: number) => void
  onRemove: () => void
}

function LineItemRow({
  line,
  index,
  inventory,
  isPending,
  canRemove,
  onSelectMedicine,
  onUpdateQty,
  onUpdatePrice,
  onUpdateDiscount,
  onRemove,
}: LineItemRowProps) {
  const total = lineTotal(line)
  const qtyError = line.inventory_item_id && line.quantity_sold > line.available_qty

  return (
    <div className="rounded-lg border border-border bg-card/50 p-3">
      <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        {/* Medicine select */}
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground md:hidden">
            Medicine
          </Label>
          <Select
            value={line.inventory_item_id}
            onValueChange={onSelectMedicine}
            disabled={isPending}
          >
            <SelectTrigger className={cn(!line.inventory_item_id && 'text-muted-foreground')}>
              <SelectValue placeholder="Select medicine…" />
            </SelectTrigger>
            <SelectContent>
              {inventory.map((inv) => (
                <SelectItem key={inv.id} value={inv.id}>
                  <div className="flex items-center gap-2">
                    <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span>{inv.name}</span>
                    <span className="text-muted-foreground">
                      ({inv.stock_qty} {inv.unit})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {line.inventory_item_id && (
            <p className="text-[11px] text-muted-foreground">
              Available: {line.available_qty} {line.unit}
            </p>
          )}
        </div>

        {/* Quantity */}
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground md:hidden">Qty</Label>
          <Input
            type="number"
            min={1}
            max={line.available_qty || undefined}
            value={line.quantity_sold}
            onChange={(e) => onUpdateQty(Math.max(1, parseInt(e.target.value) || 1))}
            disabled={isPending || !line.inventory_item_id}
            className={cn('text-center', qtyError && 'border-destructive ring-destructive/20')}
          />
          {qtyError && (
            <p className="text-[11px] text-destructive">
              Max {line.available_qty}
            </p>
          )}
        </div>

        {/* Unit price */}
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground md:hidden">
            Unit Price (Rs)
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              Rs.
            </span>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={(line.unit_price / 100).toFixed(2)}
              onChange={(e) => {
                const pkr = parseFloat(e.target.value) || 0
                onUpdatePrice(Math.round(pkr * 100))
              }}
              disabled={isPending || !line.inventory_item_id}
              className="pl-9 text-right"
            />
          </div>
        </div>

        {/* Discount */}
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground md:hidden">
            Discount (Rs)
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              Rs.
            </span>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={(line.discount_amount / 100).toFixed(2)}
              onChange={(e) => {
                const pkr = parseFloat(e.target.value) || 0
                onUpdateDiscount(Math.round(pkr * 100))
              }}
              disabled={isPending || !line.inventory_item_id}
              className="pl-9 text-right"
            />
          </div>
        </div>

        {/* Line total + remove */}
        <div className="flex items-center justify-between gap-2 md:flex-col md:items-end md:justify-center">
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground md:hidden">Total</p>
            <p className="font-semibold text-foreground">{formatCurrencyPaisas(total)}</p>
          </div>

          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              disabled={isPending}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              aria-label={`Remove item ${index + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
