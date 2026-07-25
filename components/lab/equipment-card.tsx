'use client'

import React, { useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn, formatCurrencyPaisas, formatDate } from '@/lib/utils'
import {
  AlertTriangle,
  CalendarCheck,
  CalendarX,
  CheckCircle2,
  Loader2,
  Microscope,
  Trash2,
  Wrench,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { deleteEquipment } from '@/app/actions/lab'
import type { MachineryWithStatus } from '@/app/actions/lab'

// =============================================================================
// Props
// =============================================================================

interface EquipmentRowProps {
  machine: MachineryWithStatus
  onAddMaintenance: (machineId: string) => void
  onDeleted: (machineId: string) => void
}

// =============================================================================
// Status config
// =============================================================================

const STATUS_CONFIG = {
  operational: {
    label: 'Operational',
    className: 'bg-success/15 text-success',
    icon: CheckCircle2,
  },
  maintenance_due: {
    label: 'Due Soon',
    className: 'bg-warning/15 text-warning',
    icon: CalendarCheck,
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-destructive/15 text-destructive',
    icon: CalendarX,
  },
} as const

// =============================================================================
// EquipmentRow (panel table row)
// =============================================================================

export function EquipmentCard({ machine, onAddMaintenance, onDeleted }: EquipmentRowProps) {
  const cfg = STATUS_CONFIG[machine.status]
  const StatusIcon = cfg.icon
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isDeleting, startDeleting] = useTransition()

  function handleDelete() {
    startDeleting(async () => {
      const result = await deleteEquipment(machine.id)
      if (!result.success) {
        toast({ title: 'Failed to delete', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Equipment removed', description: `${machine.name} has been removed.` })
      onDeleted(machine.id)
    })
  }

  return (
    <>
      <Dialog
        open={confirmOpen}
        onOpenChange={(o) => {
          if (!isDeleting) setConfirmOpen(o)
        }}
      >
        <DialogContent className="bg-card sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Remove Equipment?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove{' '}
            <span className="font-semibold text-foreground">{machine.name}</span> and all its
            maintenance records. This cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing…
                </>
              ) : (
                'Remove'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Panel table row */}
      <div
        className={cn(
          'flex items-center px-4 py-2.5 hover:bg-muted/20 transition-colors',
          machine.status === 'overdue' && 'bg-destructive/[0.03] border-l-2 border-l-destructive/40',
          machine.status === 'maintenance_due' && 'bg-warning/[0.03] border-l-2 border-l-warning/40'
        )}
      >
        {/* Name + model */}
        <div className="flex flex-1 items-center gap-2.5 min-w-0 pr-2">
          <div
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
              machine.status === 'overdue'
                ? 'bg-destructive/10'
                : machine.status === 'maintenance_due'
                  ? 'bg-warning/10'
                  : 'bg-primary/10'
            )}
          >
            <Microscope
              className={cn(
                'h-3.5 w-3.5',
                machine.status === 'overdue'
                  ? 'text-destructive'
                  : machine.status === 'maintenance_due'
                    ? 'text-warning'
                    : 'text-primary'
              )}
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{machine.name}</p>
            {machine.model && (
              <p className="text-[10px] text-muted-foreground">{machine.model}</p>
            )}
            {/* Mobile: show service dates inline */}
            <p className="text-[10px] text-muted-foreground sm:hidden">
              {machine.next_service
                ? `Next service: ${formatDate(machine.next_service)}`
                : 'No service scheduled'}
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="w-28 shrink-0">
          <Badge
            variant="secondary"
            className={cn('flex items-center gap-1 text-[10px]', cfg.className)}
          >
            <StatusIcon className="h-2.5 w-2.5" />
            {cfg.label}
          </Badge>
        </div>

        {/* Last Service */}
        <div className="w-28 hidden sm:block shrink-0">
          {machine.last_service ? (
            <span className="text-[12px] text-muted-foreground">
              {formatDate(machine.last_service)}
            </span>
          ) : (
            <span className="text-[12px] text-muted-foreground">—</span>
          )}
        </div>

        {/* Next Service */}
        <div className="w-28 hidden sm:block shrink-0">
          {machine.next_service ? (
            <span
              className={cn(
                'text-[12px] font-medium',
                machine.status === 'overdue'
                  ? 'text-destructive'
                  : machine.status === 'maintenance_due'
                    ? 'text-warning'
                    : 'text-foreground'
              )}
            >
              {formatDate(machine.next_service)}
            </span>
          ) : (
            <span className="text-[12px] text-muted-foreground">—</span>
          )}
        </div>

        {/* Maintenance count */}
        <div className="w-20 hidden md:block shrink-0">
          {machine.maintenanceRecords.length > 0 ? (
            <span className="text-[12px] text-muted-foreground">
              {machine.maintenanceRecords.length} record{machine.maintenanceRecords.length !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-[12px] text-muted-foreground">—</span>
          )}
        </div>

        {/* Purchase price */}
        <div className="w-28 hidden lg:block shrink-0">
          {machine.purchase_price_paisas != null && machine.purchase_price_paisas > 0 ? (
            <span className="text-[12px] text-muted-foreground">
              {formatCurrencyPaisas(machine.purchase_price_paisas)}
            </span>
          ) : (
            <span className="text-[12px] text-muted-foreground">—</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {machine.status !== 'operational' && (
            <AlertTriangle className="h-3.5 w-3.5 text-warning hidden sm:block" />
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onAddMaintenance(machine.id)}
            className="h-7 w-7 text-muted-foreground hover:bg-primary/10 hover:text-primary"
            title="Log Maintenance"
          >
            <Wrench className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setConfirmOpen(true)}
            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Remove equipment"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </>
  )
}

// =============================================================================
// EquipmentGrid — panel table wrapper
// =============================================================================

interface EquipmentGridProps {
  machines: MachineryWithStatus[]
  onAddMaintenance: (machineId: string) => void
  onDeleted: (machineId: string) => void
}

export function EquipmentGrid({ machines, onAddMaintenance, onDeleted }: EquipmentGridProps) {
  if (machines.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col items-center justify-center gap-2 py-16">
          <Microscope className="h-10 w-10 opacity-20 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No equipment registered</p>
        </div>
      </div>
    )
  }

  const overdue = machines.filter((m) => m.status === 'overdue')
  const dueSoon = machines.filter((m) => m.status === 'maintenance_due')
  const operational = machines.filter((m) => m.status === 'operational')
  const sorted = [...overdue, ...dueSoon, ...operational]

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Column headers */}
      <div className="flex items-center border-b border-border bg-muted/20 px-4 py-1.5">
        <span className="flex-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          Equipment
        </span>
        <span className="w-28 text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">
          Status
        </span>
        <span className="w-28 text-[10px] uppercase tracking-wide text-muted-foreground hidden sm:block shrink-0">
          Last Service
        </span>
        <span className="w-28 text-[10px] uppercase tracking-wide text-muted-foreground hidden sm:block shrink-0">
          Next Service
        </span>
        <span className="w-20 text-[10px] uppercase tracking-wide text-muted-foreground hidden md:block shrink-0">
          Maintenance
        </span>
        <span className="w-28 text-[10px] uppercase tracking-wide text-muted-foreground hidden lg:block shrink-0">
          Purchase Price
        </span>
        <span className="w-[74px] text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">
          Actions
        </span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/50">
        {sorted.map((m) => (
          <EquipmentCard
            key={m.id}
            machine={m}
            onAddMaintenance={onAddMaintenance}
            onDeleted={onDeleted}
          />
        ))}
      </div>
    </div>
  )
}
