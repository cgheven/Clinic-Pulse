import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Zap,
  TrendingUp,
  Receipt,
  Users,
  Plus,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireAuth } from '@/lib/auth'
import { getDailyRevenue, getMonthlyReport } from '@/app/actions/xray'
import { DailySummary } from '@/components/xray/daily-summary'
import { formatCurrencyPaisas, getTodayPKT } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'X-Ray — ClinicPulse',
}

export default async function XrayDashboardPage() {
  const authUser = await requireAuth()

  const today = getTodayPKT()
  const currentMonth = today.slice(0, 7) // YYYY-MM

  // Fetch today's revenue and this month's report in parallel
  const [dailyResult, monthlyResult] = await Promise.all([
    getDailyRevenue(today),
    getMonthlyReport(currentMonth),
  ])

  const dailyData = dailyResult.success ? dailyResult.data : null
  const monthlyData = monthlyResult.success ? monthlyResult.data : null

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">X-Ray</h1>
            <p className="text-sm text-muted-foreground">
              Revenue tracking &amp; partner payouts
            </p>
          </div>
        </div>

        <Link
          href="/xray/revenue/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Record Revenue
        </Link>
      </div>

      {/* ── Quick-nav cards ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <QuickNavCard
          href="/xray/revenue"
          icon={TrendingUp}
          label="Revenue Log"
          description="Daily revenue entries"
          color="text-primary"
          bg="bg-primary/10"
        />
        <QuickNavCard
          href="/xray/partners"
          icon={Users}
          label="Partners"
          description="Split % and payouts"
          color="text-info"
          bg="bg-info/10"
        />
        <QuickNavCard
          href="/xray/expenses"
          icon={Receipt}
          label="Expenses"
          description="Shared department costs"
          color="text-warning"
          bg="bg-warning/10"
        />
      </div>

      {/* ── Monthly summary stat cards ───────────────────────────────────────── */}
      {monthlyData ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Month Revenue"
            value={formatCurrencyPaisas(monthlyData.total_revenue)}
            sub={currentMonth}
            color="text-primary"
          />
          <StatCard
            label="Month Expenses"
            value={formatCurrencyPaisas(monthlyData.total_expenses)}
            sub="shared costs"
            color="text-warning"
          />
          <StatCard
            label="Net Revenue"
            value={formatCurrencyPaisas(monthlyData.net_revenue)}
            sub="revenue − expenses"
            color={monthlyData.net_revenue >= 0 ? 'text-success' : 'text-destructive'}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">
            Could not load monthly report: {monthlyResult.success ? '' : monthlyResult.error}
          </p>
        </div>
      )}

      {/* ── Today's revenue summary ──────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Today&apos;s Revenue</h2>
          <Link
            href="/xray/revenue"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            View all
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {dailyData ? (
          <DailySummary data={dailyData} showAddLink />
        ) : (
          <Card className="border-border bg-card">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {dailyResult.success
                ? 'No revenue data available.'
                : `Error: ${dailyResult.error}`}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}

// =============================================================================
// Sub-components
// =============================================================================

function QuickNavCard({
  href,
  icon: Icon,
  label,
  description,
  color,
  bg,
}: {
  href: string
  icon: React.ElementType
  label: string
  description: string
  color: string
  bg: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:bg-card/80"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bg}`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  )
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub: string
  color: string
}) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-1 pt-4">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <p className={`text-xl font-bold ${color}`}>{value}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  )
}
