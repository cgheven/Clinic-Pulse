'use client'

import React, { useState, useTransition } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Building2,
  User,
  Cog,
} from 'lucide-react'
import type { XrayPartnerWithSplit } from '@/app/actions/settings'
import { upsertXrayPartner, deleteXrayPartner } from '@/app/actions/settings'

// =============================================================================
// Types
// =============================================================================

interface PartnerRow {
  id: string
  name: string
  phone: string | null
  split_pct: number
  // local edit state
  editing_split: string // display string like "30.00"
  isDirty: boolean
}

interface NewPartnerForm {
  partner_name: string
  partner_type: 'clinic' | 'individual' | 'equipment_owner'
  phone: string
  bank_account: string
  notes: string
  split_pct: string
}

const PARTNER_TYPES = [
  { value: 'clinic', label: 'Clinic', icon: Building2 },
  { value: 'individual', label: 'Individual', icon: User },
  { value: 'equipment_owner', label: 'Equipment Owner', icon: Cog },
] as const

const newPartnerSchema = z.object({
  partner_name: z.string().min(1, 'Name is required').max(200),
  partner_type: z.enum(['clinic', 'individual', 'equipment_owner']),
  phone: z.string().max(50),
  bank_account: z.string().max(100),
  notes: z.string().max(500),
  split_pct: z
    .string()
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0 && parseFloat(v) <= 100, {
      message: 'Must be 0–100',
    }),
})

// =============================================================================
// Helpers
// =============================================================================

function bpToDisplay(bp: number): string {
  return (bp / 100).toFixed(2)
}

function displayToBp(display: string): number {
  const n = parseFloat(display)
  if (isNaN(n)) return 0
  return Math.round(n * 100)
}

function partnerTypeIcon(type: string) {
  const found = PARTNER_TYPES.find((t) => t.value === type)
  if (!found) return Building2
  return found.icon
}

// =============================================================================
// Component
// =============================================================================

interface PartnersManagerProps {
  initialPartners: XrayPartnerWithSplit[]
}

export function PartnersManager({ initialPartners }: PartnersManagerProps) {
  const [partners, setPartners] = useState<PartnerRow[]>(() =>
    initialPartners.map((p) => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      split_pct: p.split_pct,
      editing_split: bpToDisplay(p.split_pct),
      isDirty: false,
    }))
  )

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const [newForm, setNewForm] = useState<NewPartnerForm>({
    partner_name: '',
    partner_type: 'clinic',
    phone: '',
    bank_account: '',
    notes: '',
    split_pct: '0.00',
  })
  const [newFormErrors, setNewFormErrors] = useState<Partial<Record<keyof NewPartnerForm, string>>>({})
  const [isAdding, setIsAdding] = useState(false)

  // Compute running total in basis points
  const totalBp = partners.reduce((acc, p) => {
    return acc + (p.isDirty ? displayToBp(p.editing_split) : p.split_pct)
  }, 0)
  const totalPct = (totalBp / 100).toFixed(2)
  const isValidTotal = totalBp === 10000

  // Saved total (ignoring dirty edits)
  const savedTotalBp = partners.reduce((acc, p) => acc + p.split_pct, 0)

  // ─── Editing split inline ──────────────────────────────────────────────────

  function handleSplitChange(id: string, raw: string) {
    if (/^(\d{0,3}(\.\d{0,2})?)?$/.test(raw)) {
      setPartners((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, editing_split: raw, isDirty: displayToBp(raw) !== p.split_pct }
            : p
        )
      )
    }
  }

  function handleSavePartnerSplit(partner: PartnerRow) {
    setSavingId(partner.id)
    startTransition(async () => {
      const result = await upsertXrayPartner({
        id: partner.id,
        name: partner.name,
        phone: partner.phone,
        split_pct: displayToBp(partner.editing_split),
      })

      setSavingId(null)

      if (result.success) {
        setPartners((prev) =>
          prev.map((p) =>
            p.id === partner.id
              ? { ...p, split_pct: displayToBp(partner.editing_split), isDirty: false }
              : p
          )
        )
        toast({ title: 'Partner saved', description: `${partner.name} split updated.` })
      } else {
        toast({
          title: 'Save failed',
          description: result.error ?? 'Unknown error',
          variant: 'destructive',
        })
      }
    })
  }

  // ─── Delete partner ────────────────────────────────────────────────────────

  function handleDelete(id: string) {
    setDeletingId(id)
    startTransition(async () => {
      const result = await deleteXrayPartner(id)
      setDeletingId(null)

      if (result.success) {
        setPartners((prev) => prev.filter((p) => p.id !== id))
        toast({ title: 'Partner removed', description: 'Partner has been soft-deleted.' })
      } else {
        toast({
          title: 'Delete failed',
          description: result.error ?? 'Unknown error',
          variant: 'destructive',
        })
      }
    })
  }

  // ─── Add new partner ───────────────────────────────────────────────────────

  function handleNewFormChange(
    field: keyof NewPartnerForm,
    value: NewPartnerForm[typeof field]
  ) {
    setNewForm((prev) => ({ ...prev, [field]: value }))
    setNewFormErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function handleAddPartner() {
    const parsed = newPartnerSchema.safeParse(newForm)
    if (!parsed.success) {
      const errors: Partial<Record<keyof NewPartnerForm, string>> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof NewPartnerForm | undefined
        if (field) errors[field] = issue.message
      }
      setNewFormErrors(errors)
      return
    }

    setIsAdding(true)
    startTransition(async () => {
      const result = await upsertXrayPartner({
        name: parsed.data.partner_name,
        phone: parsed.data.phone || null,
        split_pct: displayToBp(parsed.data.split_pct),
      })

      setIsAdding(false)

      if (result.success) {
        toast({ title: 'Partner added', description: `${parsed.data.partner_name} has been added.` })
        setShowAddDialog(false)
        setNewForm({ partner_name: '', partner_type: 'clinic', phone: '', bank_account: '', notes: '', split_pct: '0.00' })
        // Refresh list is handled by revalidatePath in server action — but since we're client-side,
        // we add a placeholder row that will be consistent after next page load.
        // For immediate UX, we create a temporary entry:
        const tempId = `temp-${Date.now()}`
        setPartners((prev) => [
          ...prev,
          {
            id: tempId,
            name: parsed.data.partner_name,
            phone: parsed.data.phone || null,
            split_pct: displayToBp(parsed.data.split_pct),
            editing_split: parsed.data.split_pct,
            isDirty: false,
          },
        ])
      } else {
        toast({
          title: 'Add failed',
          description: result.error ?? 'Unknown error',
          variant: 'destructive',
        })
      }
    })
  }

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">X-Ray Revenue Partners</h3>
          <p className="text-xs text-muted-foreground">
            Configure each partner&apos;s share of X-ray revenue. Total must equal 100%.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAddDialog(true)}
          className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Partner
        </Button>
      </div>

      {/* Running total pill */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Running total:</span>
        <div
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
            isValidTotal
              ? 'bg-success/15 text-success'
              : 'bg-destructive/15 text-destructive'
          )}
        >
          {isValidTotal ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <AlertCircle className="h-3 w-3" />
          )}
          {totalPct}% / 100.00%
        </div>
        {savedTotalBp !== 10000 && (
          <span className="text-xs text-warning">
            (saved: {(savedTotalBp / 100).toFixed(2)}%)
          </span>
        )}
      </div>

      {/* Visual split bar */}
      {partners.length > 0 && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          {partners.map((p, i) => {
            const bp = p.isDirty ? displayToBp(p.editing_split) : p.split_pct
            const hue = (i * 47 + 200) % 360
            return (
              <div
                key={p.id}
                className="inline-block h-full transition-all duration-300"
                style={{
                  width: `${Math.max(0, Math.min(100, bp / 100))}%`,
                  backgroundColor: `hsl(${hue}, 70%, 55%)`,
                }}
                title={`${p.name}: ${(bp / 100).toFixed(2)}%`}
              />
            )
          })}
        </div>
      )}

      {/* Partners table */}
      {partners.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-8 text-center">
          <Building2 className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No partners configured yet.</p>
          <p className="mt-0.5 text-xs text-muted-foreground/60">
            Add your first X-ray revenue partner.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="py-2.5 pl-4 pr-3 text-left text-xs font-semibold text-muted-foreground">
                  Partner
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  Type
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  Phone
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">
                  Split %
                </th>
                <th className="py-2.5 pl-3 pr-4 text-right text-xs font-semibold text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {partners.map((partner) => {
                const TypeIcon = Building2
                const isSaving = savingId === partner.id
                const isDeleting = deletingId === partner.id

                return (
                  <tr
                    key={partner.id}
                    className={cn(
                      'transition-colors hover:bg-muted/20',
                      partner.isDirty && 'bg-primary/5'
                    )}
                  >
                    {/* Name */}
                    <td className="py-3 pl-4 pr-3">
                      <span className="font-medium text-foreground">{partner.name}</span>
                    </td>

                    {/* Type badge */}
                    <td className="px-3 py-3">
                      <Badge
                        variant="secondary"
                        className="gap-1 text-[10px]"
                      >
                        <TypeIcon className="h-2.5 w-2.5" />
                        Partner
                      </Badge>
                    </td>

                    {/* Phone */}
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {partner.phone ?? '—'}
                    </td>

                    {/* Split % input */}
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <div className="relative w-24">
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={partner.editing_split}
                            onChange={(e) => handleSplitChange(partner.id, e.target.value)}
                            disabled={isSaving || isDeleting}
                            className="h-7 pr-6 text-right text-xs"
                          />
                          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                            %
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 pl-3 pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {partner.isDirty && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSavePartnerSplit(partner)}
                            disabled={isSaving || isDeleting}
                            className="h-7 px-2 text-xs text-primary hover:bg-primary/10 hover:text-primary"
                          >
                            {isSaving ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Save className="mr-1 h-3 w-3" />
                                Save
                              </>
                            )}
                          </Button>
                        )}

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(partner.id)}
                          disabled={isSaving || isDeleting}
                          className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Remove partner"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Total validity warning */}
      {!isValidTotal && partners.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          <p className="text-xs text-destructive">
            Partner splits must sum to exactly 100%. Adjust the percentages above.
          </p>
        </div>
      )}

      {/* Add Partner Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add X-Ray Partner</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="add-partner-name" className="text-xs text-muted-foreground">
                Partner Name *
              </Label>
              <Input
                id="add-partner-name"
                value={newForm.partner_name}
                onChange={(e) => handleNewFormChange('partner_name', e.target.value)}
                placeholder="e.g. Ahmad Radiology Center"
                className={cn(newFormErrors.partner_name && 'border-destructive')}
              />
              {newFormErrors.partner_name && (
                <p className="text-xs text-destructive">{newFormErrors.partner_name}</p>
              )}
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label htmlFor="add-partner-type" className="text-xs text-muted-foreground">
                Partner Type *
              </Label>
              <Select
                value={newForm.partner_type}
                onValueChange={(v) =>
                  handleNewFormChange('partner_type', v as 'clinic' | 'individual' | 'equipment_owner')
                }
              >
                <SelectTrigger id="add-partner-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PARTNER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="add-partner-phone" className="text-xs text-muted-foreground">
                Phone
              </Label>
              <Input
                id="add-partner-phone"
                value={newForm.phone}
                onChange={(e) => handleNewFormChange('phone', e.target.value)}
                placeholder="+92 300 1234567"
              />
            </div>

            {/* Bank Account */}
            <div className="space-y-1.5">
              <Label htmlFor="add-partner-bank" className="text-xs text-muted-foreground">
                Bank Account
              </Label>
              <Input
                id="add-partner-bank"
                value={newForm.bank_account}
                onChange={(e) => handleNewFormChange('bank_account', e.target.value)}
                placeholder="Account number or IBAN"
              />
            </div>

            {/* Split % */}
            <div className="space-y-1.5">
              <Label htmlFor="add-partner-split" className="text-xs text-muted-foreground">
                Default Split %
              </Label>
              <div className="relative">
                <Input
                  id="add-partner-split"
                  type="text"
                  inputMode="decimal"
                  value={newForm.split_pct}
                  onChange={(e) => handleNewFormChange('split_pct', e.target.value)}
                  placeholder="0.00"
                  className={cn(
                    'pr-7',
                    newFormErrors.split_pct && 'border-destructive'
                  )}
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
              {newFormErrors.split_pct && (
                <p className="text-xs text-destructive">{newFormErrors.split_pct}</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="add-partner-notes" className="text-xs text-muted-foreground">
                Notes
              </Label>
              <Input
                id="add-partner-notes"
                value={newForm.notes}
                onChange={(e) => handleNewFormChange('notes', e.target.value)}
                placeholder="Optional notes"
              />
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
              onClick={handleAddPartner}
              disabled={isAdding}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isAdding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding…
                </>
              ) : (
                'Add Partner'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
