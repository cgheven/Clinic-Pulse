import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import { getExpenseReport } from '@/app/actions/reports'
import { ReportsTabNav } from '@/components/reports/reports-tab-nav'
import { ExpenseSummaryChart } from '@/components/reports/expense-summary-chart'
import { PdfGenerator } from '@/components/reports/pdf-generator'
import { getTodayPKT } from '@/lib/utils'
import { format } from 'date-fns'

// =============================================================================
// Metadata
// =============================================================================

export const metadata: Metadata = {
  title: 'Expense Report — ClinicPulse',
}

export const dynamic = 'force-dynamic'

// =============================================================================
// Helpers
// =============================================================================

function getCurrentYearMonth(): string {
  return getTodayPKT().substring(0, 7)
}

function offsetMonth(ym: string, delta: number): string {
  const [year, month] = ym.split('-').map(Number)
  const d = new Date(year!, month! - 1, 1)
  d.setMonth(d.getMonth() + delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(ym: string): string {
  const [year, month] = ym.split('-').map(Number)
  const d = new Date(year!, month! - 1, 1)
  return format(d, 'MMMM yyyy')
}

// =============================================================================
// Page
// =============================================================================

interface PageProps {
  searchParams: Promise<{ month?: string }>
}

export default async function ExpensesReportPage({ searchParams }: PageProps) {
  await requireAuth()

  const params = await searchParams
  const currentMonth = getCurrentYearMonth()

  const monthParam = params.month ?? currentMonth
  const isValidMonth = /^\d{4}-\d{2}$/.test(monthParam)
  const selectedMonth = isValidMonth ? monthParam : currentMonth

  const prevMonth = offsetMonth(selectedMonth, -1)
  const nextMonth = offsetMonth(selectedMonth, +1)
  const isCurrent = selectedMonth === currentMonth

  const result = await getExpenseReport(selectedMonth)

  return (
    <div className="space-y-0">
      <ReportsTabNav />

      <div className="space-y-4 p-4">
        {/* ── Compact header ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-foreground sm:text-xl">
              Expense Report
            </h1>
            <p className="text-[12px] text-muted-foreground">
              Expenses by department and head — all departments combined
            </p>
          </div>

          {result.success && (
            <PdfGenerator
              report={{ type: 'expenses', data: result.data }}
              fileName={`expenses-${selectedMonth}`}
            />
          )}
        </div>

        {/* ── Month navigation ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <Link
            href={`/reports/expenses?month=${prevMonth}`}
            className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>

          <div className="flex flex-1 items-center justify-center gap-3">
            <span className="text-sm font-semibold text-foreground">
              {formatMonthLabel(selectedMonth)}
            </span>
            {isCurrent && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Current
              </span>
            )}
          </div>

          <Link
            href={`/reports/expenses?month=${nextMonth}`}
            className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
            aria-label="Next month"
            aria-disabled={isCurrent}
            tabIndex={isCurrent ? -1 : undefined}
          >
            <ChevronRight className={`h-4 w-4 ${isCurrent ? 'opacity-30' : ''}`} />
          </Link>

          {!isCurrent && (
            <Link
              href="/reports/expenses"
              className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
            >
              This Month
            </Link>
          )}
        </div>

        {/* ── Error banner ─────────────────────────────────────────────── */}
        {!result.success && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{result.error}</p>
          </div>
        )}

        {/* ── Report content ────────────────────────────────────────────── */}
        {result.success ? (
          <ExpenseSummaryChart data={result.data} />
        ) : (
          <div className="rounded-xl border border-border bg-card px-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No expense data available for this period.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
