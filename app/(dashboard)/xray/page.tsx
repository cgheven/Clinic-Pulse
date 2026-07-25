import type { Metadata } from 'next'
import Link from 'next/link'
import {
  TrendingUp,
  Receipt,
  Users,
  Plus,
  AlertTriangle,
  Activity,
  Banknote,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { requireAuth } from '@/lib/auth'
import { getDailyRevenue, getMonthlyReport } from '@/app/actions/xray'
import { DailySummary } from '@/components/xray/daily-summary'
import { formatCurrencyPaisas, getTodayPKT } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'X-Ray — ClinicPulse',
}

export default async function XrayDashboardPage() {
  await requireAuth()

  const today = getTodayPKT()
  const currentMonth = today.slice(0, 7) // YYYY-MM

  const [dailyResult, monthlyResult] = await Promise.all([
    getDailyRevenue(today),
    getMonthlyReport(currentMonth),
  ])

  const dailyData = dailyResult.success ? dailyResult.data : null
  const monthlyData = monthlyResult.success ? monthlyResult.data : null

  return (
    <div className="space-y-4">
      {/* ── Page header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-bold text-foreground sm:text-xl">X-Ray</h1>
        <Link href="/xray/revenue/new">
          <Button size="sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Record Revenue
          </Button>
        </Link>
      </div>

      {/* ── Quick link pill strip ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/xray/revenue"
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Revenue Log
        </Link>
        <Link
          href="/xray/partners"
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
        >
          <Users className="h-3.5 w-3.5" />
          Partners
        </Link>
        <Link
          href="/xray/expenses"
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
        >
          <Receipt className="h-3.5 w-3.5" />
          Expenses
        </Link>
      </div>

      {/* ── Stat chips ─────────────────────────────────────────────────────────── */}
      {monthlyData ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatChip
            icon={TrendingUp}
            iconBg="bg-primary/10"
            iconColor="text-primary"
            label="Month Revenue"
            value={formatCurrencyPaisas(monthlyData.total_revenue)}
          />
          <StatChip
            icon={Receipt}
            iconBg="bg-warning/10"
            iconColor="text-warning"
            label="Month Expenses"
            value={formatCurrencyPaisas(monthlyData.total_expenses)}
          />
          <StatChip
            icon={Activity}
            iconBg={monthlyData.net_revenue >= 0 ? 'bg-success/10' : 'bg-destructive/10'}
            iconColor={monthlyData.net_revenue >= 0 ? 'text-success' : 'text-destructive'}
            label="Net Profit"
            value={formatCurrencyPaisas(monthlyData.net_revenue)}
          />
          <StatChip
            icon={Banknote}
            iconBg="bg-info/10"
            iconColor="text-info"
            label="Today Revenue"
            value={dailyData ? formatCurrencyPaisas(dailyData.total_gross) : '—'}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">
            Could not load monthly report:{' '}
            {!monthlyResult.success ? monthlyResult.error : ''}
          </p>
        </div>
      )}

      {/* ── Today's revenue ────────────────────────────────────────────────────── */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Today&apos;s Revenue</h2>
          <Link
            href="/xray/revenue"
            className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-primary transition-colors"
          >
            View all
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {dailyData ? (
          <DailySummary data={dailyData} showAddLink />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="py-8 text-center text-sm text-muted-foreground">
              {dailyResult.success
                ? 'No revenue data available.'
                : `Error: ${dailyResult.error}`}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

// =============================================================================
// StatChip
// =============================================================================

function StatChip({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
}: {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
      >
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
          {label}
        </p>
        <p className="text-sm font-bold tabular-nums text-foreground">{value}</p>
      </div>
    </div>
  )
}
