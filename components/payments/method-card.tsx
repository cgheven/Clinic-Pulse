import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrencyPaisas } from '@/lib/utils'

// =============================================================================
// Props
// =============================================================================

interface MethodCardProps {
  /** Lucide icon component to render */
  icon: LucideIcon
  /** Payment method display name (e.g. "Cash", "JazzCash") */
  name: string
  /** Total received via this method today — in paisas */
  total: number
  /** Tailwind text colour class for the icon and amount */
  colorClass: string
  /** Tailwind background colour class for the icon container */
  bgClass: string
}

// =============================================================================
// Component
// =============================================================================

export function MethodCard({
  icon: Icon,
  name,
  total,
  colorClass,
  bgClass,
}: MethodCardProps) {
  return (
    <Card className="border-border bg-card transition-colors hover:border-primary/20">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          {/* Icon badge */}
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bgClass}`}
          >
            <Icon className={`h-5 w-5 ${colorClass}`} />
          </div>

          {/* Text */}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {name}
            </p>
            <p
              className={`mt-0.5 text-xl font-bold tabular-nums leading-tight ${colorClass}`}
            >
              {formatCurrencyPaisas(total)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
