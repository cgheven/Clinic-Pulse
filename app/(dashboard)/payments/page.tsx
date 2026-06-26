import type { Metadata } from 'next'
import {
  AlertTriangle,
  Banknote,
  Building2,
  CreditCard,
  Smartphone,
  Wallet,
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
    name: 'Bank Transfer',
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

  // Resolve the date from the URL — fall back to today in PKT
  const params = await searchParams
  const today  = getTodayPKT()
  const date   =
    typeof params.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
      ? params.date
      : today

  const isToday = date === today

  // Fetch all three data sets in parallel
  const [dailyResult, deptResult, trendResult] = await Promise.all([
    getDailyPayments(date),
    getPaymentsByDepartment(date),
    getDailyTrend(30),
  ])

  const daily = dailyResult.success ? dailyResult.data : null
  const dept  = deptResult.success  ? deptResult.data  : null
  const trend = trendResult.success ? trendResult.data  : null

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payments</h1>
            <p className="text-sm text-muted-foreground">
              Daily receipts by method &amp; department
            </p>
          </div>
        </div>

        {/* Date selector — client component; navigates via URL */}
        <DateSelector currentDate={date} />
      </div>

      {/* ── Grand total banner ───────────────────────────────────────────────── */}
      {daily && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/60">
            Total Received &mdash; {isToday ? 'Today' : date}
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-primary">
            {formatCurrencyPaisas(daily.grand_total)}
          </p>
        </div>
      )}

      {/* ── Payment method cards grid ────────────────────────────────────────── */}
      {daily ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
