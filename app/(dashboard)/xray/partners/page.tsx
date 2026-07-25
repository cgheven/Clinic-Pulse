import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Users,
  Building2,
  User,
  Cog,
  Phone,
  Landmark,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Settings,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { requireAuth } from '@/lib/auth'
import { getPartners, getPartnerPayouts } from '@/app/actions/xray'
import { formatCurrencyPaisas, formatBasisPoints, getTodayPKT } from '@/lib/utils'
import type { XrayPartnerWithSplit } from '@/app/actions/xray'
import { AddPartnerDialog } from '@/components/xray/add-partner-dialog'

export const metadata: Metadata = {
  title: 'X-Ray Partners — ClinicPulse',
}

// =============================================================================
// Partner type meta
// =============================================================================

const PARTNER_TYPE_META: Record<
  string,
  { label: string; Icon: React.ElementType; color: string; bg: string }
> = {
  clinic: {
    label: 'Clinic',
    Icon: Building2,
    color: 'text-info',
    bg: 'bg-info/10',
  },
  individual: {
    label: 'Individual',
    Icon: User,
    color: 'text-success',
    bg: 'bg-success/10',
  },
  equipment_owner: {
    label: 'Equipment Owner',
    Icon: Cog,
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
}

function getPartnerMeta(type: string) {
  return (
    PARTNER_TYPE_META[type] ?? {
      label: type,
      Icon: Building2,
      color: 'text-muted-foreground',
      bg: 'bg-muted/20',
    }
  )
}

// =============================================================================
// Page
// =============================================================================

export default async function XrayPartnersPage() {
  const authUser = await requireAuth()
  const isAdmin = authUser.profile.role === 'admin'

  const today = getTodayPKT()
  const currentMonth = today.slice(0, 7)

  const [partnersResult, payoutsResult] = await Promise.all([
    getPartners(),
    getPartnerPayouts(currentMonth),
  ])

  const partners = partnersResult.success ? partnersResult.data : []
  const payoutsData = payoutsResult.success ? payoutsResult.data : null

  const splitTotalBp = partners.reduce((sum, p) => sum + p.split_pct, 0)
  const splitValid = splitTotalBp === 100

  // Build a lookup: partner_id → payout_amount for this month
  const payoutMap = new Map<string, number>(
    (payoutsData?.partner_payouts ?? []).map((pp) => [
      pp.partner.id,
      pp.payout_amount,
    ])
  )

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-info/10">
            <Users className="h-5 w-5 text-info" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">X-Ray Partners</h1>
            <p className="text-sm text-muted-foreground">
              Revenue sharing partners and monthly payouts
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <AddPartnerDialog />
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
            >
              <Settings className="h-4 w-4" />
              Manage in Settings
              <ExternalLink className="h-3.5 w-3.5 opacity-60" />
            </Link>
          </div>
        )}
      </div>

      {/* ── Split validation banner ──────────────────────────────────────────── */}
      {partners.length > 0 && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 ${
            splitValid
              ? 'border-success/30 bg-success/10'
              : 'border-warning/30 bg-warning/10'
          }`}
        >
          {splitValid ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
          )}
          <p
            className={`text-sm ${splitValid ? 'text-success' : 'text-warning'}`}
          >
            {splitValid
              ? 'Partner splits total 100% — all revenue will be fully distributed.'
              : `Partner splits total ${splitTotalBp.toFixed(2)}% — configure 100% in Settings.`}
          </p>
        </div>
      )}

      {/* ── Month summary ────────────────────────────────────────────────────── */}
      {payoutsData && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-border bg-card">
            <CardHeader className="pb-1 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Month Revenue ({currentMonth})
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-xl font-bold text-primary">
                {formatCurrencyPaisas(payoutsData.total_revenue)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-1 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Active Partners
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-xl font-bold text-foreground">{partners.length}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Visual split bar ────────────────────────────────────────────────── */}
      {partners.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs text-muted-foreground">Split distribution</p>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            {partners.map((p, i) => {
              const hue = (i * 47 + 200) % 360
              return (
                <div
                  key={p.id}
                  className="inline-block h-full transition-all duration-500"
                  style={{
                    width: `${Math.max(0, Math.min(100, p.split_pct))}%`,
                    backgroundColor: `hsl(${hue}, 70%, 55%)`,
                  }}
                  title={`${p.name}: ${formatBasisPoints(p.split_pct)}`}
                />
              )
            })}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-3">
            {partners.map((p, i) => {
              const hue = (i * 47 + 200) % 360
              return (
                <span key={p.id} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: `hsl(${hue}, 70%, 55%)` }}
                  />
                  {p.name} ({formatBasisPoints(p.split_pct)})
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Partners list ────────────────────────────────────────────────────── */}
      {partners.length === 0 ? (
        <Card className="border-dashed border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="mb-2 h-7 w-7 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No active partners configured.</p>
            {isAdmin && (
              <Link
                href="/settings"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Add partners in Settings
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((partner) => (
            <PartnerCard
              key={partner.id}
              partner={partner}
              monthPayout={payoutMap.get(partner.id) ?? 0}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* ── Admin note ─────────────────────────────────────────────────────── */}
      {isAdmin && partners.length > 0 && (
        <p className="text-center text-xs text-muted-foreground/50">
          To add, remove or rename partners, go to{' '}
          <Link href="/settings" className="text-primary hover:underline">
            Settings › X-Ray Partners
          </Link>
          .
        </p>
      )}
    </div>
  )
}

// =============================================================================
// PartnerCard sub-component
// =============================================================================

function PartnerCard({
  partner,
  monthPayout,
  isAdmin,
}: {
  partner: XrayPartnerWithSplit
  monthPayout: number
  isAdmin: boolean
}) {
  return (
    <Card className="overflow-hidden border-border bg-card">
      {/* Amber split bar */}
      <div
        className="h-0.5 bg-primary/50"
        style={{ width: `${Math.min(100, partner.split_pct)}%` }}
        aria-hidden
      />

      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-sm font-semibold text-foreground">
              {partner.name}
            </CardTitle>
          </div>
        </div>

        {partner.phone && (
          <div className="mt-1 space-y-0.5">
            <CardDescription className="flex items-center gap-1 text-[11px]">
              <Phone className="h-3 w-3" />
              {partner.phone}
            </CardDescription>
          </div>
        )}
      </CardHeader>

      <CardContent className="pb-4">
        <div className="flex items-end justify-between border-t border-border pt-3">
          {/* Split % */}
          <div>
            <p className="text-[10px] text-muted-foreground">Split</p>
            <p className="text-lg font-bold text-foreground">
              {formatBasisPoints(partner.split_pct)}
            </p>
          </div>

          {/* Month payout */}
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">This Month</p>
            <p className="text-lg font-bold text-primary">
              {formatCurrencyPaisas(monthPayout)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
