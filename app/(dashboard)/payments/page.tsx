import type { Metadata } from 'next'
import {
  AlertTriangle,
  Banknote,
  Building2,
  Smartphone,
  Wallet,
  TrendingUp,
} from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import {
  getDailyPayments,
  getPaymentsByDepartment,
  getDailyTrend,
} from '@/app/actions/payments'
import { MethodCard } from '@/components/payments/method-card'
import { DeptBreakdownTable } from '@/components/payments/dept-breakdown-table'
import { DailyTrendChart } from '@/components/payments/daily-trend-chart'
import { DateSelector } from '@/components/payments/date-selector'
import { formatCurrencyPaisas, getTodayPKT } from '@/lib/utils'

// =============================================================================
// Metadata
// =============================================================================

export const metadata: Metadata = {
  title: 'Payments — ClinicPulse',
  description: 'Daily payment receipts broken down by method and department.',
}

// =============================================================================
// Page props
// =============================================================================

interface PageProps {
  searchParams: Promise<{ date?: string }>
}

// =============================================================================
// Payment method cards configuration
// =============================================================================

const METHOD_CARDS = [
  {
    key: 'cash'          as const,
    name: 'Cash',
    Icon: Banknote,
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10',
  },
  {
    key: 'jazzcash'      as const,
    name: 'JazzCash',
    Icon: Smartphone,
    colorClass: 'text-info',
    bgClass: 'bg-info/10',
  },
  {
    key: 'easypaisa'     as const,
    name: 'Easypaisa',
    Icon: Wallet,
    colorClass: 'text-success',
    bgClass: 'bg-success/10',
  },
  {
    key: 'bank_transfer' as const,
    name: 'Bank',
    Icon: Building2,
    colorClass: 'text-violet-400',
    bgClass: 'bg-violet-500/10',
  },
]

// =============================================================================
// Page (Server Component)
// =============================================================================

export default async function PaymentsPage({ searchParams }: PageProps) {
  await requireAuth()

  const params = await searchParams
  const today  = getTodayPKT()
  const date   =
    typeof params.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
      ? params.date
      : today

  const isToday = date === today

  const [dailyResult, deptResult, trendResult] = await Promise.all([
    getDailyPayments(date),
    getPaymentsByDepartment(date),
    getDailyTrend(30),
  ])

  const daily = dailyResult.success ? dailyResult.data : null
  const dept  = deptResult.success  ? deptResult.data  : null
  const trend = trendResult.success ? trendResult.data  : null

  const mobileTotal = daily
    ? daily.totals.jazzcash + daily.totals.easypaisa
    : null

  return (
    <div className="space-y-4">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-bold text-foreground sm:text-xl">Payments</h1>
        <DateSelector currentDate={date} />
      </div>

      {/* ── Stat Chips ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/* Total Collected */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              {isToday ? 'Today Total' : 'Total'}
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">
              {daily ? formatCurrencyPaisas(daily.grand_total) : '—'}
            </p>
          </div>
        </div>

        {/* Cash */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Banknote className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Cash
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">
              {daily ? formatCurrencyPaisas(daily.totals.cash) : '—'}
            </p>
          </div>
        </div>

        {/* Mobile Pay */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-info/10">
            <Smartphone className="h-4 w-4 text-info" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Mobile Pay
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">
              {mobileTotal != null ? formatCurrencyPaisas(mobileTotal) : '—'}
            </p>
          </div>
        </div>

        {/* Bank */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
            <Building2 className="h-4 w-4 text-violet-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Bank
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">
              {daily ? formatCurrencyPaisas(daily.totals.bank_transfer) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Payment method breakdown ─────────────────────────────────────────── */}
      {daily ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {METHOD_CARDS.map(({ key, name, Icon, colorClass, bgClass }) => (
            <MethodCard
              key={key}
              icon={Icon}
              name={name}
              total={daily.totals[key]}
              colorClass={colorClass}
              bgClass={bgClass}
            />
          ))}
        </div>
      ) : (
        <ErrorBanner
          message={
            dailyResult.success
              ? 'No payment data available for this date.'
              : dailyResult.error
          }
        />
      )}

      {/* ── Per-department breakdown table ───────────────────────────────────── */}
      {dept ? (
        <DeptBreakdownTable rows={dept.rows} date={date} />
      ) : (
        <ErrorBanner
          message={
            deptResult.success
              ? 'No department breakdown available.'
              : deptResult.error
          }
        />
      )}

      {/* ── 30-day trend chart ───────────────────────────────────────────────── */}
      {trend ? (
        <DailyTrendChart data={trend} />
      ) : (
        <ErrorBanner
          message={
            trendResult.success
              ? 'No trend data available.'
              : trendResult.error
          }
        />
      )}
    </div>
  )
}

// =============================================================================
// Sub-components
// =============================================================================

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
      <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
      <p className="text-sm text-destructive">{message}</p>
    </div>
  )
}
