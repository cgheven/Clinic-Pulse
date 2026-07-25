import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { requireAuth } from '@/lib/auth'
import { getDailyRevenue } from '@/app/actions/xray'
import { DailySummary } from '@/components/xray/daily-summary'
import { getTodayPKT, formatDate } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'X-Ray Revenue — ClinicPulse',
}

interface PageProps {
  searchParams: Promise<{ date?: string }>
}

export default async function XrayRevenuePage({ searchParams }: PageProps) {
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
  const dailyData = result.success ? result.data : null

  return (
    <div className="space-y-4">
      {/* ── Page header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-bold text-foreground sm:text-xl">Revenue Log</h1>
        <Link href="/xray/revenue/new">
          <Button size="sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Record Revenue
          </Button>
        </Link>
      </div>

      {/* ── Date navigation ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {/* Prev */}
        <Link
          href={`/xray/revenue?date=${prevDate}`}
          className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
          aria-label="Previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>

        {/* Date label */}
        <div className="flex flex-1 items-center justify-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {formatDate(selectedDate, 'EEE, dd MMM yyyy')}
          </span>
          {isToday && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
              Today
            </span>
          )}
        </div>

        {/* Next */}
        <Link
          href={`/xray/revenue?date=${nextDate}`}
          className={`rounded-lg border border-border bg-card p-2 text-muted-foreground transition-colors ${
            isToday
              ? 'opacity-30 pointer-events-none'
              : 'hover:border-primary/30 hover:text-foreground'
          }`}
          aria-label="Next day"
          aria-disabled={isToday}
          tabIndex={isToday ? -1 : undefined}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>

        {/* Jump to today */}
        {!isToday && (
          <Link
            href="/xray/revenue"
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
          >
            Today
          </Link>
        )}
      </div>

      {/* ── Daily summary panel ─────────────────────────────────────────────────── */}
      {dailyData ? (
        <DailySummary data={dailyData} showAddLink={false} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="py-10 text-center">
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
          </div>
        </div>
      )}
    </div>
  )
}

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]!
}
