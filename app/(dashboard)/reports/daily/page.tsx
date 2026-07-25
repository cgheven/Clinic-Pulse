import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, CalendarDays, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { requireAuth } from '@/lib/auth'
import { getDailyRevenue } from '@/app/actions/reports'
import { ReportsTabNav } from '@/components/reports/reports-tab-nav'
import { DailyRevenueTable } from '@/components/reports/daily-revenue-table'
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

  const result = await getDailyRevenue(selectedDate)

  return (
    <div className="space-y-0">
      {/* ── Tab navigation ──────────────────────────────────────────────────── */}
      <ReportsTabNav />

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

          {result.success && (
            <PdfGenerator
              report={{ type: 'daily', data: result.data }}
              fileName={`daily-revenue-${selectedDate}`}
            />
          )}
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

        {/* ── Error banner ────────────────────────────────────────────────── */}
        {!result.success && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{result.error}</p>
          </div>
        )}

        {/* ── Report content ──────────────────────────────────────────────── */}
        {result.success ? (
          <DailyRevenueTable data={result.data} />
        ) : (
          <Card className="border-border bg-card">
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No revenue data available for this date.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
