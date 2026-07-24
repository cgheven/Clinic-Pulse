import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import {
  Users,
  TrendingUp,
  CalendarDays,
  Plus,
  AlertCircle,
  Activity,
  ArrowRight,
  ClipboardList,
} from 'lucide-react'
import { getOpdDashboard } from '@/app/actions/opd'
import { formatCurrencyPaisas, getTodayPKT, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'OPD — ClinicPulse',
}

export const dynamic = 'force-dynamic'

// =============================================================================
// Page
// =============================================================================

export default function OpdPage() {
  const today = getTodayPKT()

  return (
    <div className="space-y-4">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">
            <span className="hidden sm:inline">{formatDate(today, 'EEEE, dd MMMM yyyy')}</span>
            <span className="sm:hidden">{formatDate(today, 'EEE, dd MMM yyyy')}</span>
          </p>
          <h1 className="mt-0.5 text-lg font-bold text-foreground sm:text-xl">OPD</h1>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link href="/opd/visits/new">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Record Visit
          </Link>
        </Button>
      </div>

      {/* ── Content (async) ───────────────────────────────────────────────── */}
      <Suspense fallback={<OpdSkeleton />}>
        <OpdDashboardContent />
      </Suspense>
    </div>
  )
}

// =============================================================================
// Skeleton
// =============================================================================

function OpdSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[58px] animate-pulse rounded-xl border border-border bg-card" />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-xl border border-border bg-card" />
      <div className="h-9 w-72 animate-pulse rounded-lg border border-border bg-card" />
    </div>
  )
}

// =============================================================================
// Dashboard content
// =============================================================================

async function OpdDashboardContent() {
  const result = await getOpdDashboard()

  if (!result.success) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2.5">
        <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
        <p className="text-sm text-destructive">{result.error}</p>
      </div>
    )
  }

  const stats = result.data

  return (
    <div className="space-y-4">
      {/* ── Stat chips ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatChip
          icon={CalendarDays}
          label="Visits Today"
          value={String(stats.today_visits)}
          color="text-blue-400"
          bg="bg-blue-400/10"
        />
        <StatChip
          icon={Users}
          label="Patients"
          value={String(stats.today_patients)}
          color="text-violet-400"
          bg="bg-violet-400/10"
        />
        <StatChip
          icon={TrendingUp}
          label="Revenue"
          value={formatCurrencyPaisas(stats.today_revenue)}
          color="text-emerald-400"
          bg="bg-emerald-400/10"
        />
        <StatChip
          icon={Activity}
          label="Month Visits"
          value={String(stats.month_visits)}
          sub={formatCurrencyPaisas(stats.month_revenue)}
          color="text-amber-400"
          bg="bg-amber-400/10"
        />
      </div>

      {/* ── Doctor activity ───────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Doctor Activity — Today
          </span>
          <Link
            href="/opd/doctors"
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
          >
            View all
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {stats.doctor_stats.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No doctor activity today.
          </p>
        ) : (
          <>
            {/* Col headers */}
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-border/50 px-4 py-1.5 sm:grid-cols-[1fr_56px_110px]">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                Doctor
              </span>
              <span className="text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                Visits
              </span>
              <span className="text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                Revenue
              </span>
            </div>

            <div className="divide-y divide-border/50">
              {[...stats.doctor_stats]
                .sort((a, b) => b.today_visits - a.today_visits)
                .map((ds) => {
                  const initials = ds.doctor_name
                    .split(' ')
                    .slice(0, 2)
                    .map((n) => n[0]?.toUpperCase() ?? '')
                    .join('')

                  return (
                    <Link
                      key={ds.doctor_id}
                      href={`/opd/doctors/${ds.doctor_id}`}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 px-4 py-2.5 hover:bg-muted/20 transition-colors sm:grid-cols-[1fr_56px_110px]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-foreground">
                            Dr. {ds.doctor_name}
                          </p>
                          {ds.specialization && (
                            <p className="truncate text-[11px] text-muted-foreground">
                              {ds.specialization}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-right text-[13px] font-semibold tabular-nums text-foreground">
                        {ds.today_visits}
                      </p>
                      <p className="text-right text-[12px] tabular-nums text-muted-foreground">
                        {formatCurrencyPaisas(ds.today_revenue)}
                      </p>
                    </Link>
                  )
                })}
            </div>
          </>
        )}
      </div>

      {/* ── Quick links ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <QuickLink href="/opd/patients/new" icon={Users} label="New Patient" />
        <QuickLink href="/opd/visits" icon={CalendarDays} label="Daily Log" />
        <QuickLink href="/opd/patients" icon={ClipboardList} label="All Patients" />
      </div>
    </div>
  )
}

// =============================================================================
// StatChip
// =============================================================================

function StatChip({
  icon: Icon,
  label,
  value,
  sub,
  color,
  bg,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  color: string
  bg: string
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${bg}`}>
        <Icon className={`h-3.5 w-3.5 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
          {label}
        </p>
        <p className="text-sm font-bold tabular-nums text-foreground">{value}</p>
        {sub && <p className="text-[10px] tabular-nums text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )
}

// =============================================================================
// QuickLink
// =============================================================================

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: React.ElementType
  label: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-[12px] font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  )
}
