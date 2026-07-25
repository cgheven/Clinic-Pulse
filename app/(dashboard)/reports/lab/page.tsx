import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import { getLabDailyReport } from '@/app/actions/reports'
import { ReportsTabNav } from '@/components/reports/reports-tab-nav'
import { LabDailyReportTable } from '@/components/reports/lab-daily-report-table'
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

  const result = await getLabDailyReport(selectedDate)

  return (
    <div className="space-y-0">
      <ReportsTabNav />

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

          {result.success && (
            <PdfGenerator
              report={{ type: 'lab', data: result.data }}
              fileName={`lab-report-${selectedDate}`}
            />
          )}
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

        {/* ── Error banner ─────────────────────────────────────────────── */}
        {!result.success && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{result.error}</p>
          </div>
        )}

        {/* ── Report content ────────────────────────────────────────────── */}
        {result.success ? (
          <LabDailyReportTable data={result.data} />
        ) : (
          <div className="rounded-xl border border-border bg-card px-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No lab test data available for this date.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
