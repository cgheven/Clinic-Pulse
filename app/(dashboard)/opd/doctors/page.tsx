import { Suspense } from 'react'
import Link from 'next/link'
import { Stethoscope, Activity, TrendingUp, AlertCircle, ArrowRight } from 'lucide-react'
import { getDoctors } from '@/app/actions/opd'
import { formatCurrencyPaisas, formatBasisPoints, cn } from '@/lib/utils'

export const metadata = {
  title: 'Doctors — OPD — ClinicPulse',
}

async function DoctorList() {
  const result = await getDoctors()

  if (!result.success) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
        <AlertCircle className="mx-auto mb-2 h-7 w-7 text-destructive" />
        <p className="text-sm text-destructive">{result.error}</p>
      </div>
    )
  }

  const doctors = result.data

  if (doctors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
        <Stethoscope className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">No active doctors</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Add doctors via Settings to see them here
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {doctors.map((doctor) => (
        <Link
          key={doctor.id}
          href={`/opd/doctors/${doctor.id}`}
          className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:bg-card/80 transition-all"
        >
          {/* Doctor header */}
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {doctor.full_name
                .split(' ')
                .slice(0, 2)
                .map((n) => n[0]?.toUpperCase())
                .join('')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                Dr. {doctor.full_name}
              </p>
              {doctor.specialty && (
                <p className="truncate text-xs text-muted-foreground">{doctor.specialty}</p>
              )}
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
          </div>

          {/* Earning model badge */}
          <div className="mt-3 flex items-center gap-2">
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                doctor.earning_model === 'salaried'
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'bg-amber-500/10 text-amber-400'
              )}
            >
              {doctor.earning_model}
            </span>
            {doctor.earning_model === 'commission' && doctor.current_commission_pct !== null && (
              <span className="text-[10px] text-muted-foreground">
                {formatBasisPoints(doctor.current_commission_pct)} commission
              </span>
            )}
          </div>

          {/* Today's stats */}
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
            <div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-0.5">
                <Activity className="h-3 w-3" />
                Today's Visits
              </div>
              <p className="text-xl font-bold text-foreground">{doctor.today_visits}</p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-0.5">
                <TrendingUp className="h-3 w-3" />
                Today's Revenue
              </div>
              <p className="text-sm font-semibold text-primary">
                {formatCurrencyPaisas(doctor.today_revenue)}
              </p>
            </div>
          </div>

          {doctor.phone && (
            <p className="mt-3 text-xs text-muted-foreground/60">{doctor.phone}</p>
          )}
        </Link>
      ))}
    </div>
  )
}

export default function DoctorsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Doctors</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Active doctors with today&apos;s visit and revenue stats
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
        }
      >
        <DoctorList />
      </Suspense>
    </div>
  )
}
