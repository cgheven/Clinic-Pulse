import type { Metadata } from 'next'
import { Suspense, cache } from 'react'
import {
  Users,
  ShoppingBag,
  FlaskConical,
  Zap,
  AlertTriangle,
} from 'lucide-react'
import { RevenueBreakdown } from '@/components/dashboard/revenue-chart'
import { PaymentBreakdown } from '@/components/dashboard/payment-summary'
import { RecentVisitsPanel } from '@/components/dashboard/recent-visits'
import { AlertsPanel } from '@/components/dashboard/alerts-panel'
import { DoctorStatsPanel } from '@/components/dashboard/doctor-stats'
import { getDashboardStats } from '@/app/actions/dashboard'
import { formatCurrencyPaisas, getTodayPKT, formatDate } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Dashboard — ClinicPulse',
}

export const dynamic = 'force-dynamic'

// =============================================================================
// Page
// =============================================================================

// Shared by the two Suspense boundaries below, so the whole dashboard still
// costs exactly one getDashboardStats() call per request.
const loadStats = cache(getDashboardStats)

type Stats = Awaited<ReturnType<typeof getDashboardStats>>

async function loadStatsSafe(
  today: string
): Promise<{ stats: Stats | null; fetchError: string | null }> {
  try {
    return { stats: await loadStats(today), fetchError: null }
  } catch (err) {
    return {
      stats: null,
      fetchError: err instanceof Error ? err.message : 'Failed to load dashboard data.',
    }
  }
}

// ── Revenue figure (header, right) ──────────────────────────────────────────

function RevenueFigure({ stats }: { stats: Stats | null }) {
  return (
    <p className="text-xl font-bold tabular-nums text-primary sm:text-2xl">
      {stats ? formatCurrencyPaisas(stats.revenue) : '—'}
    </p>
  )
}

async function AsyncRevenueFigure({ today }: { today: string }) {
  const { stats } = await loadStatsSafe(today)
  return <RevenueFigure stats={stats} />
}

// ── Body ────────────────────────────────────────────────────────────────────
//
// Rendered twice: once with `stats = null` as the Suspense fallback (which is
// byte-for-byte the placeholder state this page already rendered before the
// data arrived), and once with the resolved stats.

function DashboardBody({
  stats,
  fetchError,
}: {
  stats: Stats | null
  fetchError: string | null
}) {
  const xrayRevenue = stats?.revenueByDept.find((d) => d.dept === 'X-Ray')?.revenue ?? 0
  const hasAlerts =
    (stats?.lowStockItems.length ?? 0) > 0 || (stats?.upcomingService.length ?? 0) > 0

  return (
    <>
      {/* ── Error banner ──────────────────────────────────────────────────── */}
      {fetchError && (
        <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{fetchError}</p>
        </div>
      )}

      {/* ── Stat chips ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatChip
          icon={Users}
          label="OPD Visits"
          value={stats ? String(stats.patients) : '—'}
          color="text-blue-400"
          bg="bg-blue-400/10"
        />
        <StatChip
          icon={ShoppingBag}
          label="Pharmacy"
          value={stats ? formatCurrencyPaisas(stats.pharmSales) : '—'}
          color="text-emerald-400"
          bg="bg-emerald-400/10"
        />
        <StatChip
          icon={FlaskConical}
          label="Lab Tests"
          value={stats ? String(stats.labTests) : '—'}
          color="text-amber-400"
          bg="bg-amber-400/10"
        />
        <StatChip
          icon={Zap}
          label="X-Ray"
          value={stats ? formatCurrencyPaisas(xrayRevenue) : '—'}
          color="text-violet-400"
          bg="bg-violet-400/10"
        />
      </div>

      {/* ── Doctor performance ────────────────────────────────────────────── */}
      {(stats?.doctorStats.length ?? 0) > 0 && (
        <DoctorStatsPanel data={stats!.doctorStats} />
      )}

      {/* ── Main grid ─────────────────────────────────────────────────────── */}
      {/*
        Source order (mobile): Revenue → Visits → Payments → Alerts
        Desktop (lg): Revenue top-left, Visits+Alerts right col spanning 2 rows, Payments bottom-left
      */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Revenue — top-left on desktop, 1st on mobile */}
        <div className="lg:col-span-3 lg:col-start-1 lg:row-start-1">
          <RevenueBreakdown data={stats?.revenueByDept ?? []} />
        </div>

        {/* Visits + Alerts — right col on desktop, 2nd on mobile */}
        <div className="space-y-4 lg:col-span-2 lg:col-start-4 lg:row-start-1 lg:row-end-3">
          <RecentVisitsPanel data={stats?.recentVisits ?? []} />
          {hasAlerts && (
            <AlertsPanel
              lowStock={stats?.lowStockItems ?? []}
              service={stats?.upcomingService ?? []}
            />
          )}
        </div>

        {/* Payments — bottom-left on desktop, 3rd on mobile */}
        <div className="lg:col-span-3 lg:col-start-1 lg:row-start-2">
          <PaymentBreakdown data={stats?.paymentTotals ?? []} />
        </div>
      </div>
    </>
  )
}

async function DashboardContent({ today }: { today: string }) {
  const { stats, fetchError } = await loadStatsSafe(today)
  return <DashboardBody stats={stats} fetchError={fetchError} />
}

// =============================================================================
// Page
//
// The header (date + "Today at a glance") paints immediately; the stats stream
// in behind Suspense instead of blocking the whole tree on getDashboardStats().
// =============================================================================

export default async function DashboardPage() {
  const today = getTodayPKT()

  return (
    <div className="space-y-4">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">
            <span className="hidden sm:inline">{formatDate(today, 'EEEE, dd MMMM yyyy')}</span>
            <span className="sm:hidden">{formatDate(today, 'EEE, dd MMM yyyy')}</span>
          </p>
          <h1 className="mt-0.5 text-lg font-bold text-foreground sm:text-xl">
            Today at a glance
          </h1>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
            Revenue
          </p>
          <Suspense fallback={<RevenueFigure stats={null} />}>
            <AsyncRevenueFigure today={today} />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={<DashboardBody stats={null} fetchError={null} />}>
        <DashboardContent today={today} />
      </Suspense>
    </div>
  )
}

// =============================================================================
// StatChip — compact inline stat
// =============================================================================

function StatChip({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ElementType
  label: string
  value: string
  color: string
  bg: string
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${bg}`}>
        <Icon className={`h-3.5 w-3.5 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60 truncate">
          {label}
        </p>
        <p className="text-sm font-bold tabular-nums text-foreground">{value}</p>
      </div>
    </div>
  )
}
