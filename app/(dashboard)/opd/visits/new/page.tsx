import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { getPatients, getPatient } from '@/app/actions/opd'
import { VisitForm } from '@/components/opd/visit-form'

export const metadata = {
  title: 'Record Visit — OPD — ClinicPulse',
}

interface NewVisitPageProps {
  searchParams: Promise<{ patient_id?: string }>
}

async function NewVisitForm({ patientId }: { patientId?: string }) {
  if (patientId) {
    // Pre-selected patient
    const result = await getPatient(patientId)
    if (result.success) {
      const patient = result.data
      return (
        <VisitForm
          patient={{ id: patient.id, full_name: patient.full_name, patient_no: patient.patient_no }}
        />
      )
    }
  }

  // Load patient list for selection
  const result = await getPatients({ limit: 100 })
  const patients = result.success ? result.data.data : []

  return (
    <VisitForm
      patients={patients.map((p) => ({
        id: p.id,
        full_name: p.full_name,
        patient_no: p.patient_no,
        phone: p.phone,
      }))}
    />
  )
}

export default async function NewVisitPage({ searchParams }: NewVisitPageProps) {
  const params = await searchParams
  const patientId = params.patient_id

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/opd/visits"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Visits
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Record New Visit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Log a new OPD consultation
        </p>
      </div>

      <div className="max-w-2xl">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          }
        >
          <NewVisitForm patientId={patientId} />
        </Suspense>
      </div>
    </div>
  )
}
