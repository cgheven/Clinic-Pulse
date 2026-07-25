'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Loader2 } from 'lucide-react'
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
import { toast } from '@/hooks/use-toast'
import { createInventoryItem } from '@/app/actions/pharmacy'

// =============================================================================
// Constants
// =============================================================================

const UNIT_OPTIONS = [
  'tablet',
  'capsule',
  'syrup',
  'injection',
  'cream',
  'ointment',
  'drops',
  'inhaler',
  'patch',
  'suppository',
  'powder',
  'sachet',
  'vial',
  'ampoule',
  'strip',
  'bottle',
  'tube',
  'other',
]

// =============================================================================
// Page
// =============================================================================

export default function AddMedicinePage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    name: '',
    generic_name: '',
    unit: 'tablet',
    cost_price_paisas: '',
    sale_price_paisas: '',
    stock_qty: '0',
    reorder_level: '10',
    expiry_date: '',
  })

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.name.trim()) {
      toast({ title: 'Medicine name is required', variant: 'destructive' })
      return
    }

    const costPaisas = Math.round(parseFloat(form.cost_price_paisas || '0') * 100)
    const salePaisas = Math.round(parseFloat(form.sale_price_paisas || '0') * 100)
    const stockQty = parseInt(form.stock_qty) || 0
    const reorderLevel = parseInt(form.reorder_level) || 0

    startTransition(async () => {
      const result = await createInventoryItem({
        name: form.name.trim(),
        generic_name: form.generic_name.trim() || null,
        unit: form.unit,
        cost_price_paisas: costPaisas,
        sale_price_paisas: salePaisas,
        stock_qty: stockQty,
        reorder_level: reorderLevel,
        expiry_date: form.expiry_date || null,
      })

      if (result.success) {
        toast({
          title: 'Medicine added',
          description: `${result.data.name} added to inventory.`,
        })
        router.push('/pharmacy/inventory')
      } else {
        toast({
          title: 'Failed to add medicine',
          description: result.error,
          variant: 'destructive',
        })
      }
    })
  }

  // ── Margin calculation ─────────────────────────────────────────────────────
  const cost = parseFloat(form.cost_price_paisas) || 0
  const selling = parseFloat(form.sale_price_paisas) || 0
  const margin = selling - cost
  const marginPct = cost > 0 ? ((margin / cost) * 100).toFixed(1) : null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/pharmacy/inventory"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-bold text-foreground sm:text-xl">Add Medicine</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Main form — unified panel */}
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {/* Basic Information */}
              <div className="border-b border-border bg-muted/20 px-4 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Basic Information
                </span>
              </div>
              <div className="space-y-4 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">
                      Medicine Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      placeholder="e.g. Panadol 500mg"
                      disabled={isPending}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="generic_name">Generic Name</Label>
                    <Input
                      id="generic_name"
                      value={form.generic_name}
                      onChange={(e) => set('generic_name', e.target.value)}
                      placeholder="e.g. Paracetamol"
                      disabled={isPending}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="unit">
                      Unit <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={form.unit}
                      onValueChange={(v) => set('unit', v)}
                      disabled={isPending}
                    >
                      <SelectTrigger id="unit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_OPTIONS.map((u) => (
                          <SelectItem key={u} value={u} className="capitalize">
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="expiry_date">Expiry Date</Label>
                    <Input
                      id="expiry_date"
                      type="date"
                      value={form.expiry_date}
                      onChange={(e) => set('expiry_date', e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar — Pricing & Stock unified panel */}
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {/* Pricing section */}
              <div className="border-b border-border bg-muted/20 px-4 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Pricing
                </span>
              </div>
              <div className="space-y-4 p-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cost_price">Cost Price / Unit</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      Rs.
                    </span>
                    <Input
                      id="cost_price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.cost_price_paisas}
                      onChange={(e) => set('cost_price_paisas', e.target.value)}
                      placeholder="0.00"
                      className="pl-10"
                      disabled={isPending}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="selling_price">
                    Sale Price / Unit <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      Rs.
                    </span>
                    <Input
                      id="selling_price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.sale_price_paisas}
                      onChange={(e) => set('sale_price_paisas', e.target.value)}
                      placeholder="0.00"
                      className="pl-10"
                      disabled={isPending}
                    />
                  </div>
                </div>

                {/* Margin preview */}
                {form.cost_price_paisas && form.sale_price_paisas && (
                  <div className="rounded-lg bg-muted/30 px-3 py-2.5">
                    <p className="text-[12px] text-muted-foreground">Gross Margin</p>
                    <p
                      className={`mt-0.5 text-sm font-semibold ${margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                    >
                      Rs. {margin.toFixed(2)}
                      {marginPct !== null && ` (${marginPct}%)`}
                    </p>
                  </div>
                )}
              </div>

              {/* Stock section */}
              <div className="border-t border-border">
                <div className="border-b border-border bg-muted/20 px-4 py-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Stock
                  </span>
                </div>
                <div className="space-y-4 p-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="stock_qty">
                      Opening Stock <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="stock_qty"
                      type="number"
                      min="0"
                      value={form.stock_qty}
                      onChange={(e) => set('stock_qty', e.target.value)}
                      disabled={isPending}
                    />
                    <p className="text-[12px] text-muted-foreground">Units currently in stock</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reorder_level">
                      Reorder Level <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="reorder_level"
                      type="number"
                      min="0"
                      value={form.reorder_level}
                      onChange={(e) => set('reorder_level', e.target.value)}
                      disabled={isPending}
                    />
                    <p className="text-[12px] text-muted-foreground">
                      Alert when stock falls to or below this level
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex flex-col gap-2">
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding Medicine…
                  </>
                ) : (
                  'Add to Inventory'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => router.back()}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
