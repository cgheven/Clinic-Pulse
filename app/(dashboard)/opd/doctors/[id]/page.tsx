import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  Stethoscope,
  Phone,
  Mail,
  AlertCircle,
  TrendingUp,
  Activity,
  CalendarDays,
} from 'lucide-react'
import { getDoctor } from '@/app/actions/opd'
import { DoctorEarnings } from '@/components/opd/doctor-earnings'
import { formatCurrencyPaisas, formatBasisPoints, cn } from '@/lib/utils'

interface DoctorDetailPageProps {
  params: Promise<{ id: string }>
}

async function DoctorDetailContent({ id }: { id: string }) {
  const result = await getDoctor(id)

  if (!result.success) {
    if (result.error === 'Doctor not found') notFound()
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
        <AlertCircle className="mx-auto mb-2 h-7 w-7 text-destructive" />
        <p className="text-sm text-destructive">{result.error}</p>
      </div>
    )
  }

  const doctor = result.data

  return (
    <div className="space-y-6">
      {/* Doctor Info Card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
            {doctor.name
              .split(' ')
              .slice(0, 2)
              .map((n: string) => n[0]?.toUpperCase())
              .join('')}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">Dr. {doctor.name}</h2>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide',
                  doctor.earning_model === 'salaried'
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'bg-amber-500/10 text-amber-400'
                )}
              >
                {doctor.earning_model}
              </span>
            </div>

            {doctor.specialization && (
              <p className="mt-0.5 text-sm text-muted-foreground">{doctor.specialization}</p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-4">
              {doctor.phone && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  {doctor.phone}
                </span>
              )}
              {doctor.email && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  {doctor.email}
                </span>
              )}
            </div>

            {doctor.earning_model === 'commission' && doctor.commission_pct !== null && (
              <p className="mt-2 text-xs text-muted-foreground">
                Commission rate:{' '}
                <span className="font-semibold text-amber-400">
                  {formatBasisPoints(doctor.commission_pct)}
                </span>
              </p>
            )}
            {doctor.earning_model === 'salaried' && doctor.monthly_salary && (
              <p className="mt-2 text-xs text-muted-foreground">
                Monthly salary:{' '}
                <span className="font-semibold text-blue-400">
                  {formatCurrencyPaisas(doctor.monthly_salary)}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* This month stats */}
        <div className="mt-5 grid gap-3 border-t border-border pt-5 sm:grid-cols-3">
          <StatBox
            label="This Month's Visits"
            value={String(doctor.visits_this_month)}
            icon={<Activity className="h-4 w-4 text-muted-foreground" />}
          />
          <StatBox
            label="This Month's Revenue"
            value={formatCurrencyPaisas(doctor.revenue_this_month)}
            icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
          />
          <StatBox
            label="Estimated Earnings"
            value={formatCurrencyPaisas(doctor.earnings_this_month)}
            icon={<CalendarDays className="h-4 w-4 text-primary" />}
            highlight
          />
        </div>

      </div>

      {/* Earnings Calculator */}
      <DoctorEarnings doctorId={doctor.id} />
    </div>
  )
}

function StatBox({
  label,
  value,
  icon,
  highlight,
}: {
  label: string
  value: string
  icon: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        highlight
          ? 'border-primary/20 bg-primary/5'
          : 'border-border bg-background/50'
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <p
        className={cn(
          'text-lg font-bold',
          highlight ? 'text-primary' : 'text-foreground'
        )}
      >
        {value}
      </p>
    </div>
  )
}

export default async function DoctorDetailPage({ params }: DoctorDetailPageProps) {
  const { id } = await params

  return (
    <div className="space-y-5">
      <Link
        href="/opd/doctors"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Doctors
      </Link>

      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-48 animate-pulse rounded-xl border border-border bg-card" />
            <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
          </div>
        }
      >
        <DoctorDetailContent id={id} />
      </Suspense>
    </div>
  )
}
