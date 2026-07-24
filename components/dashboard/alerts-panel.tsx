import { AlertTriangle, Wrench, Package } from 'lucide-react'
import type { LowStockItem, UpcomingService } from '@/app/actions/dashboard'
import { formatDate } from '@/lib/utils'

interface AlertsPanelProps {
  lowStock: LowStockItem[]
  service: UpcomingService[]
}

export function AlertsPanel({ lowStock, service }: AlertsPanelProps) {
  if (lowStock.length === 0 && service.length === 0) return null

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border bg-muted/20 px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Alerts
        </span>
      </div>

      <div className="divide-y divide-border/50">
        {/* Low stock */}
        {lowStock.length > 0 && (
          <div className="px-4 py-2.5 space-y-1.5">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
              <Package className="h-3 w-3" />
              Low Stock ({lowStock.length})
            </p>
            {lowStock.map((item) => {
              const isCritical = item.stock_qty === 0
              return (
                <div key={item.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <AlertTriangle
                      className={`h-3 w-3 shrink-0 ${isCritical ? 'text-destructive' : 'text-warning'}`}
                    />
                    <span className="truncate text-[12px] text-foreground">{item.name}</span>
                  </div>
                  <span
                    className={`shrink-0 text-[11px] font-semibold tabular-nums ${
                      isCritical ? 'text-destructive' : 'text-warning'
                    }`}
                  >
                    {isCritical ? 'Out' : `${item.stock_qty} ${item.unit}`}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Equipment service */}
        {service.length > 0 && (
          <div className="px-4 py-2.5 space-y-1.5">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-info">
              <Wrench className="h-3 w-3" />
              Equipment Service ({service.length})
            </p>
            {service.map((item) => {
              const isOverdue = item.days_until < 0
              const isUrgent = item.days_until <= 7
              return (
                <div key={item.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Wrench
                      className={`h-3 w-3 shrink-0 ${
                        isOverdue ? 'text-destructive' : isUrgent ? 'text-warning' : 'text-info'
                      }`}
                    />
                    <span className="truncate text-[12px] text-foreground">{item.name}</span>
                  </div>
                  <span
                    className={`shrink-0 text-[11px] font-semibold ${
                      isOverdue ? 'text-destructive' : isUrgent ? 'text-warning' : 'text-info'
                    }`}
                  >
                    {isOverdue
                      ? `${Math.abs(item.days_until)}d overdue`
                      : item.days_until === 0
                        ? 'Today'
                        : `${item.days_until}d`}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Legacy named exports used by older imports (keep for compat)
export function LowStockList({ items }: { items: LowStockItem[]; loading?: boolean }) {
  return <AlertsPanel lowStock={items} service={[]} />
}

export function ServiceList({ items }: { items: UpcomingService[]; loading?: boolean }) {
  return <AlertsPanel lowStock={[]} service={items} />
}
