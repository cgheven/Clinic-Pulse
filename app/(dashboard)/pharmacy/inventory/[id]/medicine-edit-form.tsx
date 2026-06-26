'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { updateInventoryItem } from '@/app/actions/pharmacy'
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
    name: medicine.name,
    generic_name: medicine.generic_name ?? '',
    unit: medicine.unit,
    sale_price_paisas: (medicine.sale_price_paisas / 100).toFixed(2),
    reorder_level: String(medicine.reorder_level),
    expiry_date: medicine.expiry_date ?? '',
    is_active: medicine.is_active,
  })

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateInventoryItem(medicine.id, {
        name: form.name.trim(),
        generic_name: form.generic_name.trim() || null,
        unit: form.unit,
        sale_price_paisas: Math.round(parseFloat(form.sale_price_paisas || '0') * 100),
        reorder_level: parseInt(form.reorder_level) || 0,
        expiry_date: form.expiry_date || null,
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
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              disabled={isPending}
            />
          ) : (
            <p className="text-sm text-foreground">{form.name}</p>
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

        {/* Unit */}
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

        {/* Sale Price */}
        <div className="space-y-1.5">
          <Label className="text-xs">Sale Price</Label>
          {isEditing ? (
            <div className="relative">
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                Rs.
              </span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.sale_price_paisas}
                onChange={(e) => set('sale_price_paisas', e.target.value)}
                disabled={isPending}
                className="h-8 pl-8 text-xs"
              />
            </div>
          ) : (
            <p className="text-sm font-medium text-foreground">Rs. {form.sale_price_paisas}</p>
          )}
        </div>

        {/* Reorder Level */}
        <div className="space-y-1.5">
          <Label className="text-xs">Reorder Level</Label>
          {isEditing ? (
            <Input
              type="number"
              min="0"
              value={form.reorder_level}
              onChange={(e) => set('reorder_level', e.target.value)}
              disabled={isPending}
              className="h-8 text-xs"
            />
          ) : (
            <p className="text-sm text-foreground">{form.reorder_level} {form.unit}</p>
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
