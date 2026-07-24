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
  const result = await getPatients({ search, page, limit: 20, gender: gender || undefined, registeredOn: registeredOn || undefined })

  if (!result.success) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
        <AlertCircle className="mx-auto mb-2 h-7 w-7 text-destructive" />
        <p className="text-sm text-destructive">{result.error}</p>
      </div>
    )
  }

  const { data: patients, count, totalPages } = result.data

  return (
    <div className="space-y-4">
      {/* Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {count === 0
            ? 'No patients found'
            : `${count} patient${count !== 1 ? 's' : ''} found`}
          {search && ` for "${search}"`}
          {gender && ` · ${gender}`}
          {registeredOn && ` · registered ${registeredOn}`}
        </p>
        <p className="text-xs text-muted-foreground">
          Page {page} of {totalPages}
        </p>
      </div>

      {/* List */}
      {patients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
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
      ) : (
        <div className="space-y-2">
          {patients.map((patient) => (
            <PatientCard key={patient.id} patient={patient} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Patients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search and manage patient records
          </p>
        </div>
        <Button asChild>
          <Link href="/opd/patients/new">
            <Plus className="mr-2 h-4 w-4" />
            New Patient
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <PatientFilters search={search} gender={gender} registeredOn={registeredOn} />

      <Suspense
        key={`${search}-${page}-${gender}-${registeredOn}`}
        fallback={
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
        }
      >
        <PatientList search={search} page={page} gender={gender} registeredOn={registeredOn} />
      </Suspense>
    </div>
  )
}
