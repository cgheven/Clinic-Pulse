'use client'

import { Building2, User, Cog, Phone, Landmark } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrencyPaisas, formatBasisPoints } from '@/lib/utils'
import type { PartnerPayoutData } from '@/app/actions/xray'

// =============================================================================
// Partner type config
// =============================================================================

const PARTNER_TYPE_META: Record<
  string,
  { label: string; Icon: React.ElementType; color: string }
> = {
  clinic: { label: 'Clinic', Icon: Building2, color: 'text-info' },
  individual: { label: 'Individual', Icon: User, color: 'text-success' },
  equipment_owner: { label: 'Equipment Owner', Icon: Cog, color: 'text-warning' },
}

function getPartnerMeta(type: string) {
  return (
    PARTNER_TYPE_META[type] ?? {
      label: type,
      Icon: Building2,
      color: 'text-muted-foreground',
    }
  )
}

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
  const meta = getPartnerMeta(partner.partner_type)
  const TypeIcon = meta.Icon

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
            {/* Name + type */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-semibold text-foreground">
                {partner.partner_name}
              </span>
              <Badge
                variant="secondary"
                className={`gap-1 text-[10px] ${meta.color}`}
              >
                <TypeIcon className="h-2.5 w-2.5" />
                {meta.label}
              </Badge>
            </div>

            {/* Contact info */}
            <div className="mt-1 flex flex-wrap gap-3">
              {partner.phone && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {partner.phone}
                </span>
              )}
              {partner.bank_account && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Landmark className="h-3 w-3" />
                  {partner.bank_account}
                </span>
              )}
            </div>
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
