import type { Metadata } from 'next'
import { Suspense, cache } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, CalendarDays, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { requireAuth } from '@/lib/auth'
import { getDailyRevenue } from '@/app/actions/reports'
import { DailyRevenueTable } from '@/components/reports/daily-revenue-table'
import { ReportSkeleton } from '@/components/reports/report-skeleton'
import { PdfGenerator } from '@/components/reports/pdf-generator'
import { DatePickerNav } from '@/components/reports/date-picker-nav'
import { getTodayPKT } from '@/lib/utils'

// =============================================================================
// Metadata
// =============================================================================

export const metadata: Metadata = {
  title: 'Daily Revenue Report — ClinicPulse',
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
// getDailyRevenue() call (and therefore a single DB round-trip) per request.
// =============================================================================

const loadReport = cache(getDailyRevenue)

async function ReportPdf({ period }: { period: string }) {
  const result = await loadReport(period)
  if (!result.success) return null
  return (
    <PdfGenerator
      report={{ type: 'daily', data: result.data }}
      fileName={`daily-revenue-${period}`}
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

        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No revenue data available for this date.
            </p>
          </CardContent>
        </Card>
      </>
    )
  }

  return <DailyRevenueTable data={result.data} />
}

// =============================================================================
// Page
// =============================================================================

interface PageProps {
  searchParams: Promise<{ date?: string }>
}

export default async function DailyReportPage({ searchParams }: PageProps) {
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
      <div className="space-y-6 p-6">
        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Daily Revenue Report
              </h1>
              <p className="text-sm text-muted-foreground">
                OPD · Pharmacy · Laboratory · X-Ray totals with payment breakdown
              </p>
            </div>
          </div>

          <Suspense key={selectedDate} fallback={null}>
            <ReportPdf period={selectedDate} />
          </Suspense>
        </div>

        {/* ── Date navigation ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <Link
            href={`/reports/daily?date=${prevDate}`}
            className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>

          <DatePickerNav selectedDate={selectedDate} isToday={isToday} />

          <Link
            href={`/reports/daily?date=${nextDate}`}
            className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
            aria-label="Next day"
            aria-disabled={isToday}
            tabIndex={isToday ? -1 : undefined}
          >
            <ChevronRight className={`h-4 w-4 ${isToday ? 'opacity-30' : ''}`} />
          </Link>

          {!isToday && (
            <Link
              href="/reports/daily"
              className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
            >
              Today
            </Link>
          )}
        </div>

        {/* ── Report content (streams behind Suspense) ────────────────────── */}
        <Suspense key={selectedDate} fallback={<ReportSkeleton />}>
          <ReportContent period={selectedDate} />
        </Suspense>
      </div>
  )
}
