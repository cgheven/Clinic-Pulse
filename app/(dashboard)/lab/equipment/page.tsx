'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { EquipmentGrid } from '@/components/lab/equipment-card'
import { MaintenanceForm } from '@/components/lab/maintenance-form'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { AlertTriangle, CheckCircle2, CalendarCheck, Loader2 } from 'lucide-react'
import { getEquipment } from '@/app/actions/lab'
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

// =============================================================================
// Page
// =============================================================================

export default function LabEquipmentPage() {
  const [machines, setMachines] = useState<MachineryWithStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [maintenanceDialog, setMaintenanceDialog] =
    useState<MaintenanceDialogState>(CLOSED)

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
      machineryName: machine.machine_name,
    })
  }

  // Refresh after logging maintenance
  async function handleMaintenanceSuccess() {
    setIsLoading(true)
    await loadMachines()
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
        />
      )}

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
