import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, Users, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import { getPatients } from '@/app/actions/opd'
import { PatientCard } from '@/components/opd/patient-card'
import { PatientFilters } from '@/components/opd/patient-filters'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Patients — OPD — ClinicPulse',
}

interface PatientListProps {
  search: string
  page: number
  gender: string
  registeredOn: string
}

async function PatientList({ search, page, gender, registeredOn }: PatientListProps) {
  const result = await getPatients({
    search,
    page,
    limit: 20,
    gender: gender || undefined,
    registeredOn: registeredOn || undefined,
  })

  if (!result.success) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2.5">
        <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
        <p className="text-sm text-destructive">{result.error}</p>
      </div>
    )
  }

  const { data: patients, count, totalPages } = result.data

  if (patients.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
        <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">
          {search ? 'No patients match your search' : 'No patients registered yet'}
        </p>
        {!search && (
          <p className="mt-1 text-xs text-muted-foreground/60">
            Click &quot;New Patient&quot; to register the first patient
          </p>
        )}
        <div className="mt-4">
          <Button asChild size="sm">
            <Link href="/opd/patients/new">
              <Plus className="mr-2 h-4 w-4" />
              New Patient
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Count + page indicator */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-muted-foreground">
          {count} patient{count !== 1 ? 's' : ''}
          {search && ` for "${search}"`}
          {gender && ` · ${gender}`}
          {registeredOn && ` · ${registeredOn}`}
        </p>
        {totalPages > 1 && (
          <p className="text-[12px] text-muted-foreground">
            Page {page} of {totalPages}
          </p>
        )}
      </div>

      {/* Table panel */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Column headers */}
        <div className="flex items-center border-b border-border bg-muted/20 pl-4">
          {/* Name */}
          <div className="flex-1 py-1.5 pr-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
            Patient
          </div>
          {/* Phone */}
          <div className="hidden w-[130px] shrink-0 py-1.5 pr-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60 sm:block">
            Phone
          </div>
          {/* Last Visit */}
          <div className="hidden w-[110px] shrink-0 py-1.5 pr-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60 sm:block">
            Last Visit
          </div>
          {/* Visits */}
          <div className="w-[48px] shrink-0 py-1.5 text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
            Visits
          </div>
          {/* Action spacer */}
          <div className="w-[44px] shrink-0" />
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/50">
          {patients.map((patient) => (
            <PatientCard key={patient.id} patient={patient} />
          ))}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <Link
            href={`/opd/patients?search=${encodeURIComponent(search)}&gender=${encodeURIComponent(gender)}&date=${encodeURIComponent(registeredOn)}&page=${Math.max(1, page - 1)}`}
            aria-disabled={page <= 1}
            className={
              page <= 1
                ? 'pointer-events-none opacity-40'
                : 'rounded-lg border border-border bg-card p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors'
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = i + Math.max(1, Math.min(page - 2, totalPages - 4))
              return (
                <Link
                  key={p}
                  href={`/opd/patients?search=${encodeURIComponent(search)}&gender=${encodeURIComponent(gender)}&date=${encodeURIComponent(registeredOn)}&page=${p}`}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors ${
                    p === page
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  {p}
                </Link>
              )
            })}
          </div>

          <Link
            href={`/opd/patients?search=${encodeURIComponent(search)}&gender=${encodeURIComponent(gender)}&date=${encodeURIComponent(registeredOn)}&page=${Math.min(totalPages, page + 1)}`}
            aria-disabled={page >= totalPages}
            className={
              page >= totalPages
                ? 'pointer-events-none opacity-40'
                : 'rounded-lg border border-border bg-card p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors'
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  )
}

interface PatientsPageProps {
  searchParams: Promise<{ search?: string; page?: string; gender?: string; date?: string }>
}

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
  const params = await searchParams
  const search = params.search ?? ''
  const page = Math.max(1, parseInt(params.page ?? '1'))
  const gender = params.gender ?? ''
  const registeredOn = params.date ?? ''

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-foreground sm:text-xl">Patients</h1>
        <Button asChild size="sm" className="shrink-0">
          <Link href="/opd/patients/new">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Patient
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <PatientFilters search={search} gender={gender} registeredOn={registeredOn} />

      {/* List */}
      <Suspense
        key={`${search}-${page}-${gender}-${registeredOn}`}
        fallback={
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border bg-muted/20 px-4 py-1.5" />
            <div className="divide-y divide-border/50">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2.5 px-4 py-2.5">
                  <div className="h-7 w-7 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-2.5 w-20 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        }
      >
        <PatientList search={search} page={page} gender={gender} registeredOn={registeredOn} />
      </Suspense>
    </div>
  )
}
