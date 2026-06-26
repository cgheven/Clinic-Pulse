'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
import { updateMedicine } from '@/app/actions/pharmacy'
import type { CpPharmacyInventory } from '@/types/index'

const UNIT_OPTIONS = [
  'tablet', 'capsule', 'syrup', 'injection', 'cream', 'ointment',
  'drops', 'inhaler', 'patch', 'suppository', 'powder', 'sachet',
  'vial', 'ampoule', 'strip', 'bottle', 'tube', 'other',
]

interface MedicineEditFormProps {
  medicine: CpPharmacyInventory
}

export function MedicineEditForm({ medicine }: MedicineEditFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)

  const [form, setForm] = useState({
    medicine_name: medicine.medicine_name,
    generic_name: medicine.generic_name ?? '',
    manufacturer: medicine.manufacturer ?? '',
    batch_no: medicine.batch_no ?? '',
    barcode: medicine.barcode ?? '',
    unit: medicine.unit,
    pack_size: String(medicine.pack_size),
    cost_price_per_unit: (medicine.cost_price_per_unit / 100).toFixed(2),
    selling_price_per_unit: (medicine.selling_price_per_unit / 100).toFixed(2),
    low_stock_threshold: String(medicine.low_stock_threshold),
    expiry_date: medicine.expiry_date ?? '',
    location: medicine.location ?? '',
    notes: medicine.notes ?? '',
    is_active: medicine.is_active,
  })

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateMedicine(medicine.id, {
        medicine_name: form.medicine_name.trim(),
        generic_name: form.generic_name.trim() || null,
        manufacturer: form.manufacturer.trim() || null,
        batch_no: form.batch_no.trim() || null,
        barcode: form.barcode.trim() || null,
        unit: form.unit,
        pack_size: parseInt(form.pack_size) || 1,
        cost_price_per_unit: Math.round(parseFloat(form.cost_price_per_unit || '0') * 100),
        selling_price_per_unit: Math.round(parseFloat(form.selling_price_per_unit || '0') * 100),
        low_stock_threshold: parseInt(form.low_stock_threshold) || 10,
        expiry_date: form.expiry_date || null,
        location: form.location.trim() || null,
        notes: form.notes.trim() || null,
        is_active: form.is_active,
      })

      if (result.success) {
        toast({ title: 'Medicine updated', description: 'Details saved successfully.' })
        setIsEditing(false)
        router.refresh()
      } else {
        toast({ title: 'Update failed', description: result.error, variant: 'destructive' })
      }
    })
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Medicine Details</CardTitle>
          <button
            onClick={() => setIsEditing((v) => !v)}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
          >
            <Pencil className="h-3 w-3" />
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Medicine Name */}
        <div className="space-y-1.5">
          <Label className="text-xs">Medicine Name</Label>
          {isEditing ? (
            <Input
              value={form.medicine_name}
              onChange={(e) => set('medicine_name', e.target.value)}
              disabled={isPending}
            />
          ) : (
            <p className="text-sm text-foreground">{form.medicine_name}</p>
          )}
        </div>

        {/* Generic Name */}
        <div className="space-y-1.5">
          <Label className="text-xs">Generic Name</Label>
          {isEditing ? (
            <Input
              value={form.generic_name}
              onChange={(e) => set('generic_name', e.target.value)}
              disabled={isPending}
              placeholder="Optional"
            />
          ) : (
            <p className="text-sm text-foreground">{form.generic_name || '—'}</p>
          )}
        </div>

        {/* Manufacturer */}
        <div className="space-y-1.5">
          <Label className="text-xs">Manufacturer</Label>
          {isEditing ? (
            <Input
              value={form.manufacturer}
              onChange={(e) => set('manufacturer', e.target.value)}
              disabled={isPending}
              placeholder="Optional"
            />
          ) : (
            <p className="text-sm text-foreground">{form.manufacturer || '—'}</p>
          )}
        </div>

        <Separator className="bg-border" />

        {/* Unit */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Unit</Label>
            {isEditing ? (
              <Select value={form.unit} onValueChange={(v) => set('unit', v)} disabled={isPending}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((u) => (
                    <SelectItem key={u} value={u} className="capitalize text-xs">
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm capitalize text-foreground">{form.unit}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Pack Size</Label>
            {isEditing ? (
              <Input
                type="number"
                min="1"
                value={form.pack_size}
                onChange={(e) => set('pack_size', e.target.value)}
                disabled={isPending}
                className="h-8 text-xs"
              />
            ) : (
              <p className="text-sm text-foreground">{form.pack_size}</p>
            )}
          </div>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Cost Price</Label>
            {isEditing ? (
              <div className="relative">
                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  Rs.
                </span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost_price_per_unit}
                  onChange={(e) => set('cost_price_per_unit', e.target.value)}
                  disabled={isPending}
                  className="h-8 pl-8 text-xs"
                />
              </div>
            ) : (
              <p className="text-sm text-foreground">Rs. {form.cost_price_per_unit}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Selling Price</Label>
            {isEditing ? (
              <div className="relative">
                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  Rs.
                </span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.selling_price_per_unit}
                  onChange={(e) => set('selling_price_per_unit', e.target.value)}
                  disabled={isPending}
                  className="h-8 pl-8 text-xs"
                />
              </div>
            ) : (
              <p className="text-sm font-medium text-foreground">Rs. {form.selling_price_per_unit}</p>
            )}
          </div>
        </div>

        {/* Reorder Level */}
        <div className="space-y-1.5">
          <Label className="text-xs">Reorder Level</Label>
          {isEditing ? (
            <Input
              type="number"
              min="0"
              value={form.low_stock_threshold}
              onChange={(e) => set('low_stock_threshold', e.target.value)}
              disabled={isPending}
              className="h-8 text-xs"
            />
          ) : (
            <p className="text-sm text-foreground">{form.low_stock_threshold} {form.unit}</p>
          )}
        </div>

        {/* Expiry Date */}
        <div className="space-y-1.5">
          <Label className="text-xs">Expiry Date</Label>
          {isEditing ? (
            <Input
              type="date"
              value={form.expiry_date}
              onChange={(e) => set('expiry_date', e.target.value)}
              disabled={isPending}
              className="h-8 text-xs"
            />
          ) : (
            <p className="text-sm text-foreground">
              {form.expiry_date
                ? new Date(form.expiry_date).toLocaleDateString('en-PK', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'}
            </p>
          )}
        </div>

        {/* Location */}
        <div className="space-y-1.5">
          <Label className="text-xs">Location</Label>
          {isEditing ? (
            <Input
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              disabled={isPending}
              placeholder="e.g. Rack A, Shelf 2"
              className="h-8 text-xs"
            />
          ) : (
            <p className="text-sm text-foreground">{form.location || '—'}</p>
          )}
        </div>

        {/* Notes */}
        {isEditing && (
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              disabled={isPending}
              rows={2}
              className="text-xs"
            />
          </div>
        )}

        {/* Active toggle */}
        {isEditing && (
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <p className="text-xs font-medium text-foreground">Active</p>
              <p className="text-[11px] text-muted-foreground">
                Inactive medicines won&apos;t appear in sale forms
              </p>
            </div>
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) => set('is_active', v)}
              disabled={isPending}
            />
          </div>
        )}

        {/* Save button */}
        {isEditing && (
          <Button
            onClick={handleSave}
            disabled={isPending}
            size="sm"
            className="w-full"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
