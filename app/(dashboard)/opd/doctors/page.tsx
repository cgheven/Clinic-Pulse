import { Suspense } from 'react'
import Link from 'next/link'
import { Stethoscope, AlertCircle, ChevronRight } from 'lucide-react'
import { getDoctors } from '@/app/actions/opd'
import { formatCurrencyPaisas, formatBasisPoints, cn } from '@/lib/utils'

export const metadata = {
  title: 'Doctors — OPD — ClinicPulse',
}

async function DoctorList() {
  const result = await getDoctors()

  if (!result.success) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2.5">
        <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
        <p className="text-sm text-destructive">{result.error}</p>
      </div>
    )
  }

  const doctors = result.data

  if (doctors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
        <Stethoscope className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">No doctors found</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Add doctors via Settings to see them here
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Section header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          All Doctors
        </span>
        <span className="text-[11px] text-muted-foreground">{doctors.length} active</span>
      </div>

      {/* Column headers */}
      <div className="flex items-center border-b border-border/50 px-4 py-1.5">
        <div className="w-[260px] shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
          Doctor
        </div>
        <div className="hidden flex-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60 sm:block">
          Specialization
        </div>
        <div className="hidden w-[120px] shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60 sm:block">
          Model
        </div>
        <div className="w-[80px] shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
          Today
        </div>
        <div className="w-[44px] shrink-0" />
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/50">
        {doctors.map((doctor) => {
          const initials = doctor.name
            .split(' ')
            .slice(0, 2)
            .map((n: string) => n[0]?.toUpperCase())
            .join('')

          return (
            <Link
              key={doctor.id}
              href={`/opd/doctors/${doctor.id}`}
              className="group flex items-center px-4 py-2.5 hover:bg-muted/20 transition-colors"
            >
              {/* Avatar + Name */}
              <div className="flex w-[260px] shrink-0 items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">
                    Dr. {doctor.name}
                  </p>
                  {/* Sub-text on mobile: specialization + model */}
                  <p className="truncate text-[11px] text-muted-foreground sm:hidden">
                    {[
                      doctor.specialization,
                      doctor.earning_model === 'salaried'
                        ? 'Salaried'
                        : doctor.commission_pct !== null
                        ? `${formatBasisPoints(doctor.commission_pct)} commission`
                        : 'Commission',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
              </div>

              {/* Specialization (sm+) */}
              <p className="hidden min-w-0 flex-1 truncate text-center text-[12px] text-muted-foreground sm:block">
                {doctor.specialization ?? '—'}
              </p>

              {/* Model badge (sm+) */}
              <div className="hidden w-[120px] shrink-0 sm:block">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    doctor.earning_model === 'salaried'
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'bg-emerald-500/10 text-emerald-400'
                  )}
                >
                  {doctor.earning_model === 'salaried'
                    ? 'Salaried'
                    : doctor.commission_pct !== null
                    ? `${formatBasisPoints(doctor.commission_pct)}`
                    : 'Commission'}
                </span>
              </div>

              {/* Today visits + revenue */}
              <div className="w-[80px] shrink-0">
                <p className="text-[13px] font-semibold tabular-nums text-foreground">
                  {doctor.today_visits}
                  <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                    {doctor.today_visits === 1 ? 'visit' : 'visits'}
                  </span>
                </p>
                <p className="text-[10px] tabular-nums text-muted-foreground">
                  {formatCurrencyPaisas(doctor.today_revenue)}
                </p>
              </div>

              {/* Chevron */}
              <div className="flex w-[44px] shrink-0 items-center justify-center">
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-primary/60" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default function DoctorsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">
            OPD
          </p>
          <h1 className="mt-0.5 text-lg font-bold text-foreground sm:text-xl">Doctors</h1>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border bg-muted/20 px-4 py-2">
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 border-b border-border/50 px-4 py-2.5"
              >
                <div className="h-7 w-7 animate-pulse rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-28 animate-pulse rounded bg-muted" />
                  <div className="h-2.5 w-16 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        }
      >
        <DoctorList />
      </Suspense>
    </div>
  )
}
