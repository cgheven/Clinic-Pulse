import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

export type TrendDirection = 'up' | 'down' | 'neutral'

export interface StatCardProps {
  label: string
  value: string
  subtext?: string
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  trend?: TrendDirection
  trendLabel?: string
  loading?: boolean
}

// =============================================================================
// Loading skeleton
// =============================================================================

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-3.5 w-28 rounded bg-muted" />
          <div className="h-7 w-36 rounded bg-muted" />
          <div className="h-3 w-24 rounded bg-muted" />
        </div>
        <div className="h-10 w-10 rounded-lg bg-muted" />
      </div>
    </div>
  )
}

// =============================================================================
// Trend indicator
// =============================================================================

function TrendBadge({
  direction,
  label,
}: {
  direction: TrendDirection
  label: string
}) {
  if (direction === 'up') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
        <TrendingUp className="h-3 w-3" />
        {label}
      </span>
    )
  }
  if (direction === 'down') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
        <TrendingDown className="h-3 w-3" />
        {label}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
      <Minus className="h-3 w-3" />
      {label}
    </span>
  )
}

// =============================================================================
// StatCard
// =============================================================================

export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
  trend,
  trendLabel,
  loading = false,
}: StatCardProps) {
  if (loading) return <StatCardSkeleton />

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-border/80">
      <div className="flex items-start justify-between gap-4">
        {/* Text */}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium text-muted-foreground truncate">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
          {(subtext || (trend && trendLabel)) && (
            <div className="flex items-center gap-2">
              {trend && trendLabel && (
                <TrendBadge direction={trend} label={trendLabel} />
              )}
              {subtext && (
                <span className="text-xs text-muted-foreground">{subtext}</span>
              )}
            </div>
          )}
        </div>

        {/* Icon */}
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', iconBg)}>
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
      </div>
    </div>
  )
}
