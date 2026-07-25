'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn, formatDate, getInitials } from '@/lib/utils'
import { DeletePatientButton } from '@/components/opd/delete-patient-button'
import type { PatientWithVisitCount } from '@/app/actions/opd'

const genderColor: Record<string, string> = {
  male: 'text-blue-400',
  female: 'text-pink-400',
  other: 'text-purple-400',
}

interface PatientCardProps {
  patient: PatientWithVisitCount
}

export function PatientCard({ patient }: PatientCardProps) {
  const initials = getInitials(patient.name)
  const gCol = genderColor[patient.gender ?? ''] ?? 'text-muted-foreground'

  return (
    <div className="group flex items-center hover:bg-muted/20 transition-colors">
      {/* Clickable area: name + all data columns */}
      <Link
        href={`/opd/patients/${patient.id}`}
        className="flex min-w-0 flex-1 items-center py-2.5 pl-4"
      >
        {/* Avatar + Name (flex-1) */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5 pr-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">
              {patient.name}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              #{patient.patient_no}
              {patient.gender && (
                <span className={cn('ml-1.5', gCol)}>{patient.gender}</span>
              )}
              {/* Phone shown in sub-text on mobile only */}
              {patient.phone && (
                <span className="ml-1.5 sm:hidden">· {patient.phone}</span>
              )}
            </p>
          </div>
        </div>

        {/* Phone (sm+ only) */}
        <p className="hidden w-[130px] shrink-0 truncate pr-3 text-[12px] text-muted-foreground sm:block">
          {patient.phone ?? '—'}
        </p>

        {/* Last Visit (sm+ only) */}
        <p className="hidden w-[110px] shrink-0 pr-3 text-[12px] text-muted-foreground sm:block">
          {patient.last_visit_date ? formatDate(patient.last_visit_date, 'dd MMM yy') : '—'}
        </p>

        {/* Visits (always) */}
        <p className="w-[48px] shrink-0 text-right text-[13px] font-semibold tabular-nums text-foreground">
          {patient.visit_count}
        </p>
      </Link>

      {/* Action column: arrow fades out, delete fades in on hover */}
      <div className="relative flex w-[44px] shrink-0 items-center justify-center py-2.5">
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-opacity group-hover:opacity-0" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <DeletePatientButton patientId={patient.id} patientName={patient.name} />
        </div>
      </div>
    </div>
  )
}
