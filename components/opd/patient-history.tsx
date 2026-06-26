'use client'

import { Clock, Stethoscope, FileText, CreditCard, ChevronDown, ChevronUp } from 'lucide-react'
import { cn, formatDate, formatCurrencyPaisas } from '@/lib/utils'
import { useState } from 'react'
import type { VisitWithRelations } from '@/app/actions/opd'

interface PatientHistoryProps {
  visits: VisitWithRelations[]
  className?: string
}

function formatPaymentMethod(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Cash',
    jazzcash: 'JazzCash',
    easypaisa: 'Easypaisa',
    bank_transfer: 'Bank Transfer',
  }
  return labels[method] ?? method
}

function VisitItem({ visit }: { visit: VisitWithRelations }) {
  const [expanded, setExpanded] = useState(false)
  const hasClinicalData = visit.diagnosis || visit.prescription || visit.notes

  return (
    <div className="relative pl-6">
      {/* Timeline dot */}
      <div className="absolute left-0 top-3 flex h-4 w-4 items-center justify-center">
        <div className="h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-border/80">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {formatDate(visit.visit_date)}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
              {visit.doctor && (
                <span className="flex items-center gap-1">
                  <Stethoscope className="h-3 w-3" />
                  Dr. {visit.doctor.name}
                  {visit.doctor.specialization ? ` · ${visit.doctor.specialization}` : ''}
                </span>
              )}
              {visit.payment_method && (
                <span className="flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  {formatPaymentMethod(visit.payment_method)}
                </span>
              )}
            </div>
          </div>

          {/* Fee */}
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold text-primary">
              {formatCurrencyPaisas(visit.fee_paisas)}
            </p>
          </div>
        </div>

        {/* Expand button */}
        {hasClinicalData && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Show clinical notes
              </>
            )}
          </button>
        )}

        {/* Expanded clinical data */}
        {expanded && hasClinicalData && (
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            {visit.diagnosis && <Field label="Diagnosis" value={visit.diagnosis} />}
            {visit.prescription && <Field label="Prescription" value={visit.prescription} />}
            {visit.notes && <Field label="Notes" value={visit.notes} />}
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">
        {label}
      </p>
      <p className="mt-0.5 text-xs text-foreground whitespace-pre-wrap">{value}</p>
    </div>
  )
}

export function PatientHistory({ visits, className }: PatientHistoryProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <FileText className="h-4 w-4 text-primary" />
        Visit History
        {visits.length > 0 && (
          <span className="ml-1 rounded-full bg-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {visits.length}
          </span>
        )}
      </h3>

      {visits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 py-10 text-center">
          <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No visits recorded</p>
          <p className="mt-0.5 text-xs text-muted-foreground/60">
            Visit history will appear here once recorded
          </p>
        </div>
      ) : (
        // Timeline
        <div className="relative space-y-3">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-3 bottom-3 w-px bg-border" aria-hidden="true" />

          {visits.map((visit) => (
            <VisitItem key={visit.id} visit={visit} />
          ))}
        </div>
      )}
    </div>
  )
}
