'use client'

import Link from 'next/link'
import { User, Phone, Calendar, Activity, ChevronRight } from 'lucide-react'
import { cn, formatDate, getInitials } from '@/lib/utils'
import type { PatientWithVisitCount } from '@/app/actions/opd'

interface PatientCardProps {
  patient: PatientWithVisitCount
  className?: string
}

const genderColor: Record<string, string> = {
  male: 'text-blue-400',
  female: 'text-pink-400',
  other: 'text-purple-400',
}

export function PatientCard({ patient, className }: PatientCardProps) {
  return (
    <Link
      href={`/opd/patients/${patient.id}`}
      className={cn(
        'group flex items-center gap-4 rounded-xl border border-border bg-card p-4',
        'hover:border-primary/50 hover:bg-card/80 transition-all duration-200',
        className
      )}
    >
      {/* Avatar */}
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
        {getInitials(patient.full_name)}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
            {patient.full_name}
          </p>
          <span
            className={cn(
              'text-[10px] font-medium capitalize',
              genderColor[patient.gender] ?? 'text-muted-foreground'
            )}
          >
            {patient.gender}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <User className="h-3 w-3 shrink-0" />
            {patient.patient_no}
          </span>

          {patient.phone && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Phone className="h-3 w-3 shrink-0" />
              {patient.phone}
            </span>
          )}

          {patient.last_visit_date && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Calendar className="h-3 w-3 shrink-0" />
              {formatDate(patient.last_visit_date)}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="shrink-0 text-right">
        <div className="flex items-center gap-1 justify-end text-xs font-medium text-muted-foreground">
          <Activity className="h-3 w-3" />
          <span>{patient.visit_count}</span>
        </div>
        <p className="text-[10px] text-muted-foreground/60">visits</p>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
    </Link>
  )
}
