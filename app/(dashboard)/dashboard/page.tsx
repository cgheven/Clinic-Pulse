import type { Metadata } from 'next'
import {
  DollarSign,
  Users,
  ShoppingBag,
  FlaskConical,
  AlertTriangle,
  Wrench,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/dashboard/stat-card'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { PaymentSummary } from '@/components/dashboard/payment-summary'
import { RecentVisits } from '@/components/dashboard/recent-visits'
import { LowStockList, ServiceList } from '@/components/dashboard/alerts-panel'
import { getDashboardStats } from '@/app/actions/dashboard'
import { formatCurrencyPaisas, getTodayPKT, formatDate } from '@/lib/utils'

// =============================================================================
// Metadata
// =============================================================================

export const metadata: Metadata = {
  title: 'Dashboard — ClinicPulse',
}

// Always fetch fresh data on every request
export const dynamic = 'force-dynamic'

// =============================================================================
// Page
// =============================================================================

export default async function DashboardPage() {
  const today = getTodayPKT()

  // Fetch stats; on error show empty-state UI rather than crashing
  let stats: Awaited<ReturnType<typeof getDashboardStats>> | null = null
  let fetchError: string | null = null

  try {
    stats = await getDashboardStats(today)
  } catch (err) {
    fetchError = err instanceof Error ? err.message : 'Failed to load dashboard data.'
  }

  const loading = false // data is already resolved (SSR)
  const hasError = fetchError !== null

  // ── Stat card values
  const totalRevenue = stats ? formatCurrencyPaisas(stats.revenue) : '—'
  const opdPatients = stats ? String(stats.patients) : '—'
  const pharmSales = stats ? formatCurrencyPaisas(stats.pharmSales) : '—'
  const labTests = stats ? String(stats.labTests) : '—'

  return (
    <div className="space-y-6">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Today at a glance &mdash;{' '}
            <span className="font-medium text-foreground/70">
              {formatDate(today, 'EEEE, dd MMMM yyyy')}
            </span>
          </p>
        </div>
      </div>

      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {hasError && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{fetchError}</p>
        </div>
      )}

      {/* ── Stats row ────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's Total Revenue"
          value={totalRevenue}
          subtext="All departments"
          icon={DollarSign}
          iconColor="text-primary"
          iconBg="bg-primary/10"
          loading={loading}
        />
        <StatCard
          label="OPD Patients"
          value={opdPatients}
          subtext="Visits today"
          icon={Users}
          iconColor="text-info"
          iconBg="bg-info/10"
          loading={loading}
        />
        <StatCard
          label="Pharmacy Sales"
          value={pharmSales}
          subtext="Revenue today"
          icon={ShoppingBag}
          iconColor="text-success"
          iconBg="bg-success/10"
          loading={loading}
        />
        <StatCard
          label="Lab Tests"
          value={labTests}
          subtext="Tests processed"
          icon={FlaskConical}
          iconColor="text-warning"
          iconBg="bg-warning/10"
          loading={loading}
        />
      </div>

      {/* ── Revenue chart + Payment summary ──────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">
              Revenue by Department
            </CardTitle>
            <p className="text-xs text-muted-foreground">Today&apos;s breakdown</p>
          </CardHeader>
          <CardContent>
            <RevenueChart
              data={stats?.revenueByDept ?? []}
              loading={loading}
            />
          </CardContent>
        </Card>

        {/* Payment methods */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">
              Payment Methods
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Today&apos;s totals across all departments
            </p>
          </CardHeader>
          <CardContent>
            <PaymentSummary
              data={stats?.paymentTotals ?? []}
              loading={loading}
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Recent visits ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground">
            Recent OPD Visits
          </CardTitle>
          <p className="text-xs text-muted-foreground">Last 5 visits today</p>
        </CardHeader>
        <CardContent>
          <RecentVisits
            data={stats?.recentVisits ?? []}
            loading={loading}
          />
        </CardContent>
      </Card>

      {/* ── Alerts row ──────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Low stock */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">
                Low Stock Alerts
              </CardTitle>
              {stats && stats.lowStockCount > 0 && (
                <span className="flex h-5 items-center rounded-full bg-warning/15 px-2 text-xs font-semibold text-warning">
                  {stats.lowStockCount}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Pharmacy items below reorder level
            </p>
          </CardHeader>
          <CardContent>
            <LowStockList
              items={stats?.lowStockItems ?? []}
              loading={loading}
            />
          </CardContent>
        </Card>

        {/* Upcoming equipment service */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">
                Upcoming Equipment Service
              </CardTitle>
              {stats && stats.upcomingService.length > 0 && (
                <span className="flex h-5 items-center rounded-full bg-info/15 px-2 text-xs font-semibold text-info">
                  <Wrench className="mr-1 h-3 w-3" />
                  {stats.upcomingService.length}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Lab machinery due within 30 days
            </p>
          </CardHeader>
          <CardContent>
            <ServiceList
              items={stats?.upcomingService ?? []}
              loading={loading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
