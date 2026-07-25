import type { Metadata } from 'next'
import { Suspense, cache } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import { getLabDailyReport } from '@/app/actions/reports'
import { LabDailyReportTable } from '@/components/reports/lab-daily-report-table'
import { ReportSkeleton } from '@/components/reports/report-skeleton'
import { PdfGenerator } from '@/components/reports/pdf-generator'
import { getTodayPKT, formatDate } from '@/lib/utils'

// =============================================================================
// Metadata
// =============================================================================

export const metadata: Metadata = {
  title: 'Lab Daily Report — ClinicPulse',
}

export const dynamic = 'force-dynamic'

// =============================================================================
// Helpers
// =============================================================================

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]!
}

// =============================================================================
// Data loading
//
// Wrapped in React.cache so the two Suspense boundaries below share a single
// getLabDailyReport() call (and therefore a single DB round-trip) per request.
// =============================================================================

const loadReport = cache(getLabDailyReport)

async function ReportPdf({ period }: { period: string }) {
  const result = await loadReport(period)
  if (!result.success) return null
  return (
    <PdfGenerator
      report={{ type: 'lab', data: result.data }}
      fileName={`lab-report-${period}`}
    />
  )
}

async function ReportContent({ period }: { period: string }) {
  const result = await loadReport(period)

  if (!result.success) {
    return (
      <>
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{result.error}</p>
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No lab test data available for this date.
          </p>
        </div>
      </>
    )
  }

  return <LabDailyReportTable data={result.data} />
}

// =============================================================================
// Page
// =============================================================================

interface PageProps {
  searchParams: Promise<{ date?: string }>
}

export default async function LabReportPage({ searchParams }: PageProps) {
  await requireAuth()

  const params = await searchParams
  const today = getTodayPKT()

  const dateParam = params.date ?? today
  const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
  const selectedDate = isValidDate ? dateParam : today

  const prevDate = offsetDate(selectedDate, -1)
  const nextDate = offsetDate(selectedDate, +1)
  const isToday = selectedDate === today

  return (
      <div className="space-y-4 p-4">
        {/* ── Compact header ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-foreground sm:text-xl">
              Laboratory Daily Report
            </h1>
            <p className="text-[12px] text-muted-foreground">
              All lab tests — results, payment breakdown, and revenue summary
            </p>
          </div>

          <Suspense key={selectedDate} fallback={null}>
            <ReportPdf period={selectedDate} />
          </Suspense>
        </div>

        {/* ── Date navigation ──────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <Link
            href={`/reports/lab?date=${prevDate}`}
            className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>

          <div className="flex flex-1 items-center justify-center gap-3">
            <span className="text-sm font-semibold text-foreground">
              {formatDate(selectedDate, 'EEEE, dd MMM yyyy')}
            </span>
            {isToday && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Today
              </span>
            )}
          </div>

          <Link
            href={`/reports/lab?date=${nextDate}`}
            className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
            aria-label="Next day"
            aria-disabled={isToday}
            tabIndex={isToday ? -1 : undefined}
          >
            <ChevronRight className={`h-4 w-4 ${isToday ? 'opacity-30' : ''}`} />
          </Link>

          {!isToday && (
            <Link
              href="/reports/lab"
              className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
            >
              Today
            </Link>
          )}
        </div>

        {/* ── Report content (streams behind Suspense) ─────────────────── */}
        <Suspense key={selectedDate} fallback={<ReportSkeleton />}>
          <ReportContent period={selectedDate} />
        </Suspense>
      </div>
  )
}
