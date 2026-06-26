import { Suspense } from 'react'
import Link from 'next/link'
import {
  Users,
  TrendingUp,
  CalendarDays,
  Stethoscope,
  Plus,
  AlertCircle,
  Activity,
  ArrowRight,
} from 'lucide-react'
import { getOpdDashboard } from '@/app/actions/opd'
import { formatCurrencyPaisas } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'OPD — ClinicPulse',
}

async function OpdDashboardContent() {
  const result = await getOpdDashboard()

  if (!result.success) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
        <AlertCircle className="mx-auto mb-2 h-8 w-8 text-destructive" />
        <p className="text-sm font-medium text-destructive">Failed to load dashboard</p>
        <p className="mt-1 text-xs text-muted-foreground">{result.error}</p>
      </div>
    )
  }

  const stats = result.data

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's Visits"
          value={String(stats.today_visits)}
          sub="OPD consultations today"
          icon={<CalendarDays className="h-5 w-5" />}
          color="text-primary"
          bg="bg-primary/10"
        />
        <StatCard
          label="Today's Patients"
          value={String(stats.today_patients)}
          sub="Unique patients seen"
          icon={<Users className="h-5 w-5" />}
          color="text-blue-400"
          bg="bg-blue-500/10"
        />
        <StatCard
          label="Today's Revenue"
          value={formatCurrencyPaisas(stats.today_revenue)}
          sub="Net consultation fees"
          icon={<TrendingUp className="h-5 w-5" />}
          color="text-emerald-400"
          bg="bg-emerald-500/10"
        />
        <StatCard
          label="Month Visits"
          value={String(stats.month_visits)}
          sub={`Revenue: ${formatCurrencyPaisas(stats.month_revenue)}`}
          icon={<Activity className="h-5 w-5" />}
          color="text-amber-400"
          bg="bg-amber-500/10"
        />
      </div>

      {/* Doctor Stats */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Stethoscope className="h-4 w-4 text-primary" />
            Doctor Activity — Today
          </h2>
          <Link
            href="/opd/doctors"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {stats.doctor_stats.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-background/50 py-8 text-center">
            <Stethoscope className="mx-auto mb-2 h-7 w-7 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No doctor activity today</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stats.doctor_stats
              .sort((a, b) => b.today_visits - a.today_visits)
              .map((ds) => (
                <Link
                  key={ds.doctor_id}
                  href={`/opd/doctors/${ds.doctor_id}`}
                  className="group flex items-center gap-4 rounded-lg border border-border bg-background/30 px-4 py-3 hover:border-primary/30 hover:bg-card transition-all"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {ds.doctor_name
                      .split(' ')
                      .slice(0, 2)
                      .map((n) => n[0]?.toUpperCase())
                      .join('')}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      Dr. {ds.doctor_name}
                    </p>
                    {ds.specialty && (
                      <p className="text-[11px] text-muted-foreground">{ds.specialty}</p>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-foreground">{ds.today_visits}</p>
                    <p className="text-[10px] text-muted-foreground">visits</p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-primary">
                      {formatCurrencyPaisas(ds.today_revenue)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">revenue</p>
                  </div>

                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
                </Link>
              ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <QuickAction
          href="/opd/visits/new"
          icon={<Plus className="h-5 w-5" />}
          label="Record Visit"
          description="Log a new patient consultation"
          primary
        />
        <QuickAction
          href="/opd/patients/new"
          icon={<Users className="h-5 w-5" />}
          label="New Patient"
          description="Register a new patient"
        />
        <QuickAction
          href="/opd/visits"
          icon={<CalendarDays className="h-5 w-5" />}
          label="Daily Log"
          description="View today's visit log"
        />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  icon,
  color,
  bg,
}: {
  label: string
  value: string
  sub: string
  icon: React.ReactNode
  color: string
  bg: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${bg} ${color}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground/80">{label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}

function QuickAction({
  href,
  icon,
  label,
  description,
  primary,
}: {
  href: string
  icon: React.ReactNode
  label: string
  description: string
  primary?: boolean
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-4 rounded-xl border p-4 transition-all ${
        primary
          ? 'border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/60'
          : 'border-border bg-card hover:border-border/80 hover:bg-card/80'
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
          primary
            ? 'bg-primary/20 text-primary group-hover:bg-primary/30'
            : 'bg-muted text-muted-foreground group-hover:bg-muted/80'
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </Link>
  )
}

export default function OpdPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">OPD Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Outpatient department overview and quick actions
          </p>
        </div>
        <Button asChild>
          <Link href="/opd/visits/new">
            <Plus className="mr-2 h-4 w-4" />
            Record Visit
          </Link>
        </Button>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
        }
      >
        <OpdDashboardContent />
      </Suspense>
    </div>
  )
}
