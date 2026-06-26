'use client'

import { Phone } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrencyPaisas, formatBasisPoints } from '@/lib/utils'
import type { PartnerPayoutData } from '@/app/actions/xray'

// =============================================================================
// Props
// =============================================================================

interface PartnerPayoutCardProps {
  payout: PartnerPayoutData
  /** Total revenue for the period — used to render the fill bar */
  totalRevenue: number
  /** Optional rank (1-based) for ordering display */
  rank?: number
}

// =============================================================================
// Component
// =============================================================================

export function PartnerPayoutCard({ payout, totalRevenue, rank }: PartnerPayoutCardProps) {
  const { partner, payout_amount } = payout

  const fillPct =
    totalRevenue > 0
      ? Math.min(100, (payout_amount / totalRevenue) * 100)
      : 0

  return (
    <Card className="relative overflow-hidden border-border bg-card">
      {/* Amber fill bar at the bottom */}
      <div
        className="absolute bottom-0 left-0 h-0.5 bg-primary/60 transition-all duration-500"
        style={{ width: `${fillPct}%` }}
        aria-hidden
      />

      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Rank badge */}
          {rank !== undefined && (
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              {rank}
            </div>
          )}

          <div className="min-w-0 flex-1">
            {/* Name */}
            <span className="truncate text-sm font-semibold text-foreground">
              {partner.name}
            </span>

            {/* Contact info */}
            {partner.phone && (
              <div className="mt-1 flex flex-wrap gap-3">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {partner.phone}
                </span>
              </div>
            )}
          </div>

          {/* Right: split % + amount */}
          <div className="shrink-0 text-right">
            <p className="text-lg font-bold text-primary">
              {formatCurrencyPaisas(payout_amount)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {formatBasisPoints(partner.split_pct)} share
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
