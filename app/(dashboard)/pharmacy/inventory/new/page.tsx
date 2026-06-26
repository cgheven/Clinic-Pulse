'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Loader2, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/hooks/use-toast'
import { createMedicine } from '@/app/actions/pharmacy'

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
    medicine_name: '',
    generic_name: '',
    manufacturer: '',
    batch_no: '',
    barcode: '',
    unit: 'tablet',
    pack_size: '1',
    cost_price_per_unit: '',  // PKR input
    selling_price_per_unit: '', // PKR input
    quantity: '0',
    low_stock_threshold: '10',
    expiry_date: '',
    location: '',
    notes: '',
  })

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Basic validation
    if (!form.medicine_name.trim()) {
      toast({ title: 'Medicine name is required', variant: 'destructive' })
      return
    }

    const costPaisas = Math.round(parseFloat(form.cost_price_per_unit || '0') * 100)
    const sellingPaisas = Math.round(parseFloat(form.selling_price_per_unit || '0') * 100)
    const packSize = parseInt(form.pack_size) || 1
    const quantity = parseInt(form.quantity) || 0
    const lowStockThreshold = parseInt(form.low_stock_threshold) || 10

    startTransition(async () => {
      const result = await createMedicine({
        medicine_name: form.medicine_name.trim(),
        generic_name: form.generic_name.trim() || null,
        manufacturer: form.manufacturer.trim() || null,
        batch_no: form.batch_no.trim() || null,
        barcode: form.barcode.trim() || null,
        unit: form.unit,
        pack_size: packSize,
        cost_price_per_unit: costPaisas,
        selling_price_per_unit: sellingPaisas,
        quantity,
        low_stock_threshold: lowStockThreshold,
        expiry_date: form.expiry_date || null,
        location: form.location.trim() || null,
        notes: form.notes.trim() || null,
      })

      if (result.success) {
        toast({
          title: 'Medicine added',
          description: `${result.data.medicine_name} added to inventory.`,
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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/pharmacy/inventory"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add Medicine</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Add a new medicine to the pharmacy inventory
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main form */}
          <div className="space-y-6 lg:col-span-2">
            {/* Basic Info */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-base">Basic Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="medicine_name">
                      Medicine Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="medicine_name"
                      value={form.medicine_name}
                      onChange={(e) => set('medicine_name', e.target.value)}
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
                    <Label htmlFor="manufacturer">Manufacturer</Label>
                    <Input
                      id="manufacturer"
                      value={form.manufacturer}
                      onChange={(e) => set('manufacturer', e.target.value)}
                      placeholder="e.g. GSK Pakistan"
                      disabled={isPending}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="batch_no">Batch No.</Label>
                    <Input
                      id="batch_no"
                      value={form.batch_no}
                      onChange={(e) => set('batch_no', e.target.value)}
                      placeholder="e.g. BT-2024-001"
                      disabled={isPending}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="barcode">Barcode</Label>
                    <Input
                      id="barcode"
                      value={form.barcode}
                      onChange={(e) => set('barcode', e.target.value)}
                      placeholder="Optional"
                      disabled={isPending}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="location">Shelf / Location</Label>
                    <Input
                      id="location"
                      value={form.location}
                      onChange={(e) => set('location', e.target.value)}
                      placeholder="e.g. Rack A, Shelf 2"
                      disabled={isPending}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Unit & Packaging */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Unit &amp; Packaging</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
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
                    <Label htmlFor="pack_size">Pack Size</Label>
                    <Input
                      id="pack_size"
                      type="number"
                      min="1"
                      value={form.pack_size}
                      onChange={(e) => set('pack_size', e.target.value)}
                      disabled={isPending}
                    />
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
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Additional information about this medicine…"
                  rows={3}
                  disabled={isPending}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right sidebar: Pricing & Stock */}
          <div className="space-y-6">
            <Card className="border-border bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Pricing</CardTitle>
                <p className="text-xs text-muted-foreground">All prices in PKR</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cost_price">
                    Cost Price / Unit <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      Rs.
                    </span>
                    <Input
                      id="cost_price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.cost_price_per_unit}
                      onChange={(e) => set('cost_price_per_unit', e.target.value)}
                      placeholder="0.00"
                      className="pl-10"
                      disabled={isPending}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="selling_price">
                    Selling Price / Unit <span className="text-destructive">*</span>
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
                      value={form.selling_price_per_unit}
                      onChange={(e) => set('selling_price_per_unit', e.target.value)}
                      placeholder="0.00"
                      className="pl-10"
                      disabled={isPending}
                    />
                  </div>
                </div>

                {/* Margin preview */}
                {form.cost_price_per_unit && form.selling_price_per_unit && (
                  <>
                    <Separator className="bg-border" />
                    <div className="rounded-lg bg-muted/30 px-3 py-2.5">
                      <p className="text-xs text-muted-foreground">Gross Margin</p>
                      {(() => {
                        const cost = parseFloat(form.cost_price_per_unit) || 0
                        const selling = parseFloat(form.selling_price_per_unit) || 0
                        const margin = selling - cost
                        const marginPct = cost > 0 ? ((margin / cost) * 100).toFixed(1) : '—'
                        return (
                          <p
                            className={`mt-0.5 text-sm font-semibold ${margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                          >
                            Rs. {margin.toFixed(2)} ({marginPct}%)
                          </p>
                        )
                      })()}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Stock</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="quantity">
                    Opening Stock <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={(e) => set('quantity', e.target.value)}
                    disabled={isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Units currently in stock
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="low_stock_threshold">
                    Reorder Level <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="low_stock_threshold"
                    type="number"
                    min="0"
                    value={form.low_stock_threshold}
                    onChange={(e) => set('low_stock_threshold', e.target.value)}
                    disabled={isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Alert when stock falls to or below this level
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                disabled={isPending}
                className="w-full"
              >
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
