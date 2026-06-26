import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { requireAuth } from '@/lib/auth'
import { getDailyRevenue } from '@/app/actions/xray'
import { DailySummary } from '@/components/xray/daily-summary'
import { getTodayPKT, formatDate } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'X-Ray Revenue — ClinicPulse',
}

// =============================================================================
// Page
// =============================================================================

interface PageProps {
  searchParams: Promise<{ date?: string }>
}

export default async function XrayRevenuePage({ searchParams }: PageProps) {
  await requireAuth()

  const params = await searchParams
  const today = getTodayPKT()

  // Sanitise the date param
  const dateParam = params.date ?? today
  const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
  const selectedDate = isValidDate ? dateParam : today

  // Prev / next date navigation
  const prevDate = offsetDate(selectedDate, -1)
  const nextDate = offsetDate(selectedDate, +1)
  const isToday = selectedDate === today

  // Fetch revenue for the selected date
  const result = await getDailyRevenue(selectedDate)
  const dailyData = result.success ? result.data : null

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Revenue Log</h1>
            <p className="text-sm text-muted-foreground">
              Daily X-ray revenue entries
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

      {/* ── Date navigation ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Link
          href={`/xray/revenue?date=${prevDate}`}
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
          href={`/xray/revenue?date=${nextDate}`}
          className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
          aria-label="Next day"
          aria-disabled={isToday}
          tabIndex={isToday ? -1 : undefined}
        >
          <ChevronRight className={`h-4 w-4 ${isToday ? 'opacity-30' : ''}`} />
        </Link>

        {/* Jump to today shortcut */}
        {!isToday && (
          <Link
            href="/xray/revenue"
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
          >
            Today
          </Link>
        )}
      </div>

      {/* ── Daily summary ────────────────────────────────────────────────────── */}
      {dailyData ? (
        <DailySummary data={dailyData} showAddLink />
      ) : (
        <Card className="border-border bg-card">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {result.success
                ? 'No revenue recorded for this date.'
                : `Error loading data: ${result.error}`}
            </p>
            <Link
              href="/xray/revenue/new"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              Record X-Ray Revenue
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// =============================================================================
// Helpers
// =============================================================================

/** Shift a YYYY-MM-DD date string by `days` days */
function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]!
}
