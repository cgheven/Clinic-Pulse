'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrencyPaisas, formatDate } from '@/lib/utils'
import {
  AlertTriangle,
  CalendarCheck,
  CalendarX,
  CheckCircle2,
  Microscope,
  Wrench,
} from 'lucide-react'
import type { MachineryWithStatus } from '@/app/actions/lab'

// =============================================================================
// Props
// =============================================================================

interface EquipmentCardProps {
  machine: MachineryWithStatus
  onAddMaintenance: (machineId: string) => void
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
// EquipmentCard
// =============================================================================

export function EquipmentCard({ machine, onAddMaintenance }: EquipmentCardProps) {
  const cfg = STATUS_CONFIG[machine.status]
  const StatusIcon = cfg.icon

  return (
    <Card
      className={cn(
        'border-border bg-card transition-all',
        machine.status === 'overdue' && 'border-destructive/30',
        machine.status === 'maintenance_due' && 'border-warning/30'
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'rounded-lg p-2',
              machine.status === 'overdue'
                ? 'bg-destructive/10'
                : machine.status === 'maintenance_due'
                  ? 'bg-warning/10'
                  : 'bg-primary/10'
            )}
          >
            <Microscope
              className={cn(
                'h-4 w-4',
                machine.status === 'overdue'
                  ? 'text-destructive'
                  : machine.status === 'maintenance_due'
                    ? 'text-warning'
                    : 'text-primary'
              )}
            />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground">{machine.name}</h3>
            {machine.model && (
              <p className="text-xs text-muted-foreground">Model: {machine.model}</p>
            )}
          </div>
        </div>

        <Badge
          variant="secondary"
          className={cn('shrink-0 flex items-center gap-1 text-[10px]', cfg.className)}
        >
          <StatusIcon className="h-2.5 w-2.5" />
          {cfg.label}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          {machine.serial_number && (
            <>
              <span className="text-muted-foreground">Serial No.</span>
              <span className="text-foreground">{machine.serial_number}</span>
            </>
          )}
          {machine.purchase_date && (
            <>
              <span className="text-muted-foreground">Purchased</span>
              <span className="text-foreground">
                {formatDate(machine.purchase_date)}
              </span>
            </>
          )}
          {machine.last_service && (
            <>
              <span className="text-muted-foreground">Last Serviced</span>
              <span className="text-foreground">
                {formatDate(machine.last_service)}
              </span>
            </>
          )}
          {machine.next_service && (
            <>
              <span className="text-muted-foreground">Next Service</span>
              <span
                className={cn(
                  'font-medium',
                  machine.status === 'overdue'
                    ? 'text-destructive'
                    : machine.status === 'maintenance_due'
                      ? 'text-warning'
                      : 'text-foreground'
                )}
              >
                {formatDate(machine.next_service)}
              </span>
            </>
          )}
        </div>

        {/* Maintenance history (last 3) */}
        {machine.maintenanceRecords.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Recent Maintenance
            </p>
            <div className="space-y-1">
              {machine.maintenanceRecords.slice(0, 3).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-md bg-muted/20 px-2.5 py-1.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="capitalize text-foreground">
                      {r.description ?? 'Service'}
                    </span>
                    {r.technician && (
                      <span className="text-muted-foreground">
                        by {r.technician}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      {formatDate(r.service_date)}
                    </span>
                    {r.cost_paisas > 0 && (
                      <span className="text-primary">
                        {formatCurrencyPaisas(r.cost_paisas)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          {machine.status !== 'operational' && (
            <div className="flex items-center gap-1.5 text-xs text-warning">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>
                {machine.status === 'overdue'
                  ? 'Maintenance overdue'
                  : 'Maintenance due within 7 days'}
              </span>
            </div>
          )}
          <div className="ml-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAddMaintenance(machine.id)}
              className="h-8 gap-1.5 border-border text-xs hover:bg-primary/10 hover:text-primary hover:border-primary"
            >
              <Wrench className="h-3.5 w-3.5" />
              Log Maintenance
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// =============================================================================
// EquipmentGrid
// =============================================================================

interface EquipmentGridProps {
  machines: MachineryWithStatus[]
  onAddMaintenance: (machineId: string) => void
}

export function EquipmentGrid({ machines, onAddMaintenance }: EquipmentGridProps) {
  if (machines.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center justify-center gap-2 py-16">
          <Microscope className="h-10 w-10 opacity-20 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No equipment registered</p>
        </CardContent>
      </Card>
    )
  }

  const overdue = machines.filter((m) => m.status === 'overdue')
  const dueSoon = machines.filter((m) => m.status === 'maintenance_due')
  const operational = machines.filter((m) => m.status === 'operational')

  const sorted = [...overdue, ...dueSoon, ...operational]

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sorted.map((m) => (
        <EquipmentCard
          key={m.id}
          machine={m}
          onAddMaintenance={onAddMaintenance}
        />
      ))}
    </div>
  )
}
