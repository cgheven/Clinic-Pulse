import { AlertTriangle, Wrench, Package } from 'lucide-react'
import type { LowStockItem, UpcomingService } from '@/app/actions/dashboard'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

// =============================================================================
// Loading skeleton
// =============================================================================

function AlertsSkeleton() {
  return (
    <div className="animate-pulse space-y-2.5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2.5">
          <div className="h-6 w-6 rounded bg-muted shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-36 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// LowStockList
// =============================================================================

interface LowStockListProps {
  items: LowStockItem[]
  loading?: boolean
}

export function LowStockList({ items, loading = false }: LowStockListProps) {
  if (loading) return <AlertsSkeleton />

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-success/5 px-3 py-3">
        <Package className="h-4 w-4 text-success shrink-0" />
        <p className="text-sm text-muted-foreground">All stock levels are healthy.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const pct = Math.round((item.stock_qty / Math.max(item.reorder_level, 1)) * 100)
        const isCritical = item.stock_qty === 0

        return (
          <div
            key={item.id}
            className={cn(
              'flex items-start gap-3 rounded-lg px-3 py-2.5',
              isCritical
                ? 'bg-destructive/8 border border-destructive/20'
                : 'bg-warning/8 border border-warning/15'
            )}
          >
            <AlertTriangle
              className={cn(
                'mt-0.5 h-4 w-4 shrink-0',
                isCritical ? 'text-destructive' : 'text-warning'
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {item.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {isCritical
                  ? 'Out of stock'
                  : `${item.stock_qty} ${item.unit} remaining · reorder at ${item.reorder_level} (${pct}%)`}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// =============================================================================
// ServiceList
// =============================================================================

interface ServiceListProps {
  items: UpcomingService[]
  loading?: boolean
}

export function ServiceList({ items, loading = false }: ServiceListProps) {
  if (loading) return <AlertsSkeleton />

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-success/5 px-3 py-3">
        <Wrench className="h-4 w-4 text-success shrink-0" />
        <p className="text-sm text-muted-foreground">No equipment due for service soon.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const isOverdue = item.days_until < 0
        const isUrgent = item.days_until <= 7

        return (
          <div
            key={item.id}
            className={cn(
              'flex items-start gap-3 rounded-lg px-3 py-2.5 border',
              isOverdue
                ? 'bg-destructive/8 border-destructive/20'
                : isUrgent
                  ? 'bg-warning/8 border-warning/15'
                  : 'bg-info/8 border-info/15'
            )}
          >
            <Wrench
              className={cn(
                'mt-0.5 h-4 w-4 shrink-0',
                isOverdue
                  ? 'text-destructive'
                  : isUrgent
                    ? 'text-warning'
                    : 'text-info'
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {item.name}
                {item.model ? (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    ({item.model})
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {isOverdue
                  ? `Overdue by ${Math.abs(item.days_until)} day${Math.abs(item.days_until) !== 1 ? 's' : ''}`
                  : item.days_until === 0
                    ? 'Due today'
                    : `Due in ${item.days_until} day${item.days_until !== 1 ? 's' : ''}`}
                {' · '}
                {formatDate(item.next_service)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
