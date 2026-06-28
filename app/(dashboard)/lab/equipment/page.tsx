'use client'

import React, { useState, useEffect, useCallback, useTransition } from 'react'
import { EquipmentGrid } from '@/components/lab/equipment-card'
import { MaintenanceForm } from '@/components/lab/maintenance-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { AlertTriangle, CheckCircle2, CalendarCheck, Loader2, Plus } from 'lucide-react'
import { getEquipment, createEquipment } from '@/app/actions/lab'
import type { MachineryWithStatus } from '@/app/actions/lab'

// =============================================================================
// Maintenance dialog state
// =============================================================================

interface MaintenanceDialogState {
  open: boolean
  machineryId: string
  machineryName: string
}

const CLOSED: MaintenanceDialogState = {
  open: false,
  machineryId: '',
  machineryName: '',
}

const EMPTY_EQUIP = { name: '', model: '', serial_number: '', purchase_date: '', next_service: '', notes: '', purchase_price: '' }

// =============================================================================
// Page
// =============================================================================

export default function LabEquipmentPage() {
  const [machines, setMachines] = useState<MachineryWithStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [maintenanceDialog, setMaintenanceDialog] = useState<MaintenanceDialogState>(CLOSED)

  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_EQUIP)
  const [addError, setAddError] = useState<string | null>(null)
  const [isAdding, startAdding] = useTransition()

  const loadMachines = useCallback(async () => {
    const res = await getEquipment()
    if (res.success) {
      setMachines(res.data)
    } else {
      toast({
        title: 'Failed to load equipment',
        description: res.error,
        variant: 'destructive',
      })
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    void loadMachines()
  }, [loadMachines])

  function handleOpenMaintenance(machineId: string) {
    const machine = machines.find((m) => m.id === machineId)
    if (!machine) return
    setMaintenanceDialog({
      open: true,
      machineryId: machineId,
      machineryName: machine.name,
    })
  }

  async function handleMaintenanceSuccess() {
    setIsLoading(true)
    await loadMachines()
  }

  function handleAddEquipment() {
    setAddError(null)
    if (!addForm.name.trim()) { setAddError('Name is required'); return }
    startAdding(async () => {
      const result = await createEquipment({
        name: addForm.name.trim(),
        model: addForm.model.trim() || null,
        serial_number: addForm.serial_number.trim() || null,
        purchase_date: addForm.purchase_date || null,
        next_service: addForm.next_service || null,
        notes: addForm.notes.trim() || null,
        purchase_price_paisas: addForm.purchase_price ? Math.round(parseFloat(addForm.purchase_price) * 100) : null,
      })
      if (!result.success) { setAddError(result.error); return }
      setMachines((prev) => [...prev, { ...result.data, status: 'operational' as const, maintenanceRecords: [] }].sort((a, b) => a.name.localeCompare(b.name)))
      setShowAdd(false)
      setAddForm(EMPTY_EQUIP)
      toast({ title: 'Equipment added', description: `${result.data.name} added successfully.` })
    })
  }

  const overdueCount = machines.filter((m) => m.status === 'overdue').length
  const dueSoonCount = machines.filter((m) => m.status === 'maintenance_due').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Equipment</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lab machinery status and maintenance history
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status summary */}
          {!isLoading && machines.length > 0 && (
          <div className="flex items-center gap-2">
            {overdueCount > 0 && (
              <Badge
                variant="secondary"
                className="bg-destructive/15 text-destructive flex items-center gap-1"
              >
                <AlertTriangle className="h-3 w-3" />
                {overdueCount} overdue
              </Badge>
            )}
            {dueSoonCount > 0 && (
              <Badge
                variant="secondary"
                className="bg-warning/15 text-warning flex items-center gap-1"
              >
                <CalendarCheck className="h-3 w-3" />
                {dueSoonCount} due soon
              </Badge>
            )}
            {overdueCount === 0 && dueSoonCount === 0 && (
              <Badge
                variant="secondary"
                className="bg-success/15 text-success flex items-center gap-1"
              >
                <CheckCircle2 className="h-3 w-3" />
                All operational
              </Badge>
            )}
          </div>
        )}
          <Button size="sm" onClick={() => { setAddError(null); setAddForm(EMPTY_EQUIP); setShowAdd(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Equipment
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <EquipmentGrid
          machines={machines}
          onAddMaintenance={handleOpenMaintenance}
          onDeleted={(id) => setMachines((prev) => prev.filter((m) => m.id !== id))}
        />
      )}

      {/* Add Equipment dialog */}
      <Dialog open={showAdd} onOpenChange={(o) => { if (!isAdding) setShowAdd(o) }}>
        <DialogContent className="bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Equipment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {addError && <p className="text-sm text-destructive">{addError}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Name *</Label>
                <Input value={addForm.name} onChange={(e) => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Hematology Analyzer" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Model</Label>
                <Input value={addForm.model} onChange={(e) => setAddForm(f => ({ ...f, model: e.target.value }))} placeholder="Model number" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Serial Number</Label>
                <Input value={addForm.serial_number} onChange={(e) => setAddForm(f => ({ ...f, serial_number: e.target.value }))} placeholder="SN-XXXX" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Purchase Date</Label>
                <Input type="date" value={addForm.purchase_date} onChange={(e) => setAddForm(f => ({ ...f, purchase_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Next Service Due</Label>
                <Input type="date" value={addForm.next_service} onChange={(e) => setAddForm(f => ({ ...f, next_service: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Purchase Price (PKR)</Label>
                <Input type="number" min="0" step="1" value={addForm.purchase_price} onChange={(e) => setAddForm(f => ({ ...f, purchase_price: e.target.value }))} placeholder="0" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Textarea value={addForm.notes} onChange={(e) => setAddForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes..." rows={2} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)} disabled={isAdding}>Cancel</Button>
            <Button onClick={handleAddEquipment} disabled={isAdding}>
              {isAdding ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding…</> : <><Plus className="mr-2 h-4 w-4" />Add Equipment</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Maintenance form dialog */}
      <MaintenanceForm
        open={maintenanceDialog.open}
        machineryId={maintenanceDialog.machineryId}
        machineryName={maintenanceDialog.machineryName}
        onOpenChange={(open) => {
          if (!open) setMaintenanceDialog(CLOSED)
        }}
        onSuccess={handleMaintenanceSuccess}
      />
    </div>
  )
}
