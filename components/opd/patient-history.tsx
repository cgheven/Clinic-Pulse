'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Stethoscope,
  CreditCard,
  ChevronDown,
  Trash2,
  Loader2,
  AlertTriangle,
  Receipt,
  FileText,
} from 'lucide-react'
import { cn, formatDate, formatCurrencyPaisas, formatDoctorName } from '@/lib/utils'
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">
        {label}
      </p>
      <p className="mt-0.5 whitespace-pre-wrap text-xs text-foreground">{value}</p>
    </div>
  )
}

function VisitRow({ visit }: { visit: VisitWithRelations }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const hasClinicalData = !!(visit.diagnosis || visit.prescription || visit.notes)
  const isDue = visit.payment_status === 'due'

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
    <div className={cn('group', isDue && 'bg-amber-500/[0.03]')}>
      {/* ── Main row ── */}
      <div className="flex items-center px-4 py-2.5 hover:bg-muted/20 transition-colors">
        {/* Date + voucher */}
        <div className="w-[90px] shrink-0">
          <p className="text-[12px] font-medium text-foreground">
            {formatDate(visit.visit_date, 'dd MMM yy')}
          </p>
          {visit.voucher_no && (
            <p className="flex items-center gap-0.5 text-[10px] font-mono text-muted-foreground">
              <Receipt className="h-2.5 w-2.5" />#{visit.voucher_no}
            </p>
          )}
        </div>

        {/* Doctor (sm+ only) */}
        <div className="hidden min-w-0 flex-1 pr-3 sm:block">
          <p className="truncate text-[12px] text-muted-foreground">
            {visit.doctor ? `Dr. ${visit.doctor.name}` : '—'}
          </p>
        </div>

        {/* Method / Due (sm+ only) */}
        <div className="hidden w-[100px] shrink-0 sm:block">
          {isDue ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
              <AlertTriangle className="h-2.5 w-2.5" />
              Due
            </span>
          ) : (
            <p className="text-[12px] text-muted-foreground">
              {visit.payment_method ? formatPaymentMethod(visit.payment_method) : '—'}
            </p>
          )}
        </div>

        {/* Fee — flex-1 on mobile so it fills space, fixed on sm+ */}
        <div className="flex-1 text-right sm:w-[80px] sm:flex-none">
          <p
            className={cn(
              'text-[13px] font-semibold tabular-nums',
              isDue ? 'text-amber-500' : 'text-foreground'
            )}
          >
            {formatCurrencyPaisas(visit.fee_paisas)}
          </p>
          {isDue && (
            <p className="text-[10px] font-semibold text-amber-500 sm:hidden">Due</p>
          )}
        </div>

        {/* Expand + Delete */}
        <div className="ml-2 flex shrink-0 items-center">
          <button
            onClick={() => setExpanded((v) => !v)}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded text-muted-foreground/40 transition-colors',
              hasClinicalData
                ? 'hover:bg-muted hover:text-muted-foreground'
                : 'pointer-events-none opacity-0'
            )}
          >
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')}
            />
          </button>
          <button
            onClick={() => {
              setDeleteError(null)
              setDeleteOpen(true)
            }}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground/30 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
            title="Delete visit"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Expanded content ── */}
      {expanded && (
        <div className="space-y-2 border-t border-border/50 bg-muted/20 px-4 py-3">
          {/* Doctor + method on mobile */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground sm:hidden">
            {visit.doctor && (
              <span className="flex items-center gap-1">
                <Stethoscope className="h-3 w-3" />
                {formatDoctorName(visit.doctor.name)}
              </span>
            )}
            {visit.payment_method && !isDue && (
              <span className="flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                {formatPaymentMethod(visit.payment_method)}
              </span>
            )}
          </div>

          {/* Clinical notes */}
          {hasClinicalData ? (
            <>
              {visit.diagnosis && <Field label="Diagnosis" value={visit.diagnosis} />}
              {visit.prescription && <Field label="Prescription" value={visit.prescription} />}
              {visit.notes && <Field label="Notes" value={visit.notes} />}
            </>
          ) : (
            <p className="text-[12px] text-muted-foreground">No clinical notes recorded.</p>
          )}
        </div>
      )}

      {/* ── Delete dialog ── */}
      <Dialog open={deleteOpen} onOpenChange={(o) => { if (!isPending) setDeleteOpen(o) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Visit Record</DialogTitle>
            <DialogDescription>
              Remove the visit on{' '}
              <span className="font-medium text-foreground">
                {formatDate(visit.visit_date)}
              </span>
              {visit.fee_paisas > 0 && <> ({formatCurrencyPaisas(visit.fee_paisas)})</>}? This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isPending}
            >
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

export function PatientHistory({ visits }: PatientHistoryProps) {
  if (visits.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 py-10 text-center">
        <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No visits recorded yet</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Column headers */}
      <div className="flex items-center border-b border-border bg-muted/20 px-4 py-1.5">
        <div className="w-[90px] shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
          Date
        </div>
        <div className="hidden flex-1 pr-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60 sm:block">
          Doctor
        </div>
        <div className="hidden w-[100px] shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60 sm:block">
          Method
        </div>
        <div className="flex-1 text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60 sm:w-[80px] sm:flex-none">
          Fee
        </div>
        {/* spacer for expand + delete buttons */}
        <div className="ml-2 w-14 shrink-0" />
      </div>

      <div className="divide-y divide-border/50">
        {visits.map((visit) => (
          <VisitRow key={visit.id} visit={visit} />
        ))}
      </div>
    </div>
  )
}
