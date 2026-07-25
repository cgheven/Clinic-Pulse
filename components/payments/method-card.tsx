import type { LucideIcon } from 'lucide-react'
import { formatCurrencyPaisas } from '@/lib/utils'

// =============================================================================
// Props
// =============================================================================

interface MethodCardProps {
  icon: LucideIcon
  name: string
  total: number
  colorClass: string
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
    <div className="overflow-hidden rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/20">
      <div className="flex items-center gap-3">
        {/* Icon badge */}
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bgClass}`}
        >
          <Icon className={`h-4 w-4 ${colorClass}`} />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            {name}
          </p>
          <p className={`mt-0.5 text-base font-bold tabular-nums leading-tight ${colorClass}`}>
            {formatCurrencyPaisas(total)}
          </p>
        </div>
      </div>
    </div>
  )
}
