'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Stethoscope, FileText, CreditCard, ChevronDown, ChevronUp, Trash2, Loader2 } from 'lucide-react'
import { cn, formatDate, formatCurrencyPaisas } from '@/lib/utils'
import { deleteVisit } from '@/app/actions/opd'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const hasClinicalData = visit.diagnosis || visit.prescription || visit.notes

  function handleDelete() {
    setDeleteError(null)
    startTransition(async () => {
      const result = await deleteVisit(visit.id)
      if (!result.success) {
        setDeleteError(result.error)
        return
      }
      setDeleteOpen(false)
      router.refresh()
    })
  }

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

          {/* Fee + delete */}
          <div className="flex items-center gap-2 shrink-0">
            <p className="text-sm font-bold text-primary">
              {formatCurrencyPaisas(visit.fee_paisas)}
            </p>
            <button
              onClick={() => { setDeleteError(null); setDeleteOpen(true) }}
              className="opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-all"
              title="Delete visit"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
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

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={(o) => { if (!isPending) setDeleteOpen(o) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Visit Record</DialogTitle>
            <DialogDescription>
              Remove the visit on <span className="font-medium text-foreground">{formatDate(visit.visit_date)}</span>
              {visit.fee_paisas > 0 && (
                <> ({formatCurrencyPaisas(visit.fee_paisas)})</>
              )}? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Visit'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
        <div className="relative space-y-3">
          <div className="absolute left-[7px] top-3 bottom-3 w-px bg-border" aria-hidden="true" />
          {visits.map((visit) => (
            <VisitItem key={visit.id} visit={visit} />
          ))}
        </div>
      )}
    </div>
  )
}
