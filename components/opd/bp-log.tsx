'use client'

import { useState, useTransition } from 'react'
import { Heart, Plus, Activity, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn, formatDateTime } from '@/lib/utils'
import { addBpLog } from '@/app/actions/opd'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { CpBpLog } from '@/types/index'

interface BpLogProps {
  patientId: string
  logs: CpBpLog[]
}

function bpCategory(systolic: number, diastolic: number): { label: string; color: string } {
  if (systolic < 120 && diastolic < 80) return { label: 'Normal', color: 'text-emerald-400' }
  if (systolic < 130 && diastolic < 80) return { label: 'Elevated', color: 'text-yellow-400' }
  if (systolic < 140 || diastolic < 90) return { label: 'Stage 1 HT', color: 'text-orange-400' }
  return { label: 'Stage 2 HT', color: 'text-red-400' }
}

function BpTrend({ current, previous }: { current: number; previous?: number }) {
  if (previous === undefined) return null
  const diff = current - previous
  if (Math.abs(diff) < 2) return <Minus className="h-3 w-3 text-muted-foreground" />
  if (diff > 0) return <TrendingUp className="h-3 w-3 text-red-400" />
  return <TrendingDown className="h-3 w-3 text-emerald-400" />
}

export function BpLog({ patientId, logs: initialLogs }: BpLogProps) {
  const [logs, setLogs] = useState<CpBpLog[]>(initialLogs)
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [systolic, setSystolic] = useState('')
  const [diastolic, setDiastolic] = useState('')
  const [pulse, setPulse] = useState('')
  const [notes, setNotes] = useState('')

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const sys = parseInt(systolic)
    const dia = parseInt(diastolic)

    if (!systolic || isNaN(sys) || sys < 50 || sys > 300) {
      setError('Systolic BP must be between 50 and 300')
      return
    }
    if (!diastolic || isNaN(dia) || dia < 30 || dia > 200) {
      setError('Diastolic BP must be between 30 and 200')
      return
    }

    startTransition(async () => {
      const result = await addBpLog(patientId, {
        systolic: sys,
        diastolic: dia,
        pulse: pulse ? parseInt(pulse) : null,
        notes: notes || null,
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      setLogs((prev) => [result.data, ...prev])
      setSystolic('')
      setDiastolic('')
      setPulse('')
      setNotes('')
      setOpen(false)
    })
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 py-10 text-center">
        <Activity className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No BP readings recorded yet</p>
        <div className="mt-3">
          <AddReadingDialog
            open={open}
            setOpen={setOpen}
            onSubmit={handleAdd}
            isPending={isPending}
            error={error}
            systolic={systolic} setSystolic={setSystolic}
            diastolic={diastolic} setDiastolic={setDiastolic}
            pulse={pulse} setPulse={setPulse}
            notes={notes} setNotes={setNotes}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Blood Pressure Log
        </span>
        <AddReadingDialog
          open={open}
          setOpen={setOpen}
          onSubmit={handleAdd}
          isPending={isPending}
          error={error}
          systolic={systolic} setSystolic={setSystolic}
          diastolic={diastolic} setDiastolic={setDiastolic}
          pulse={pulse} setPulse={setPulse}
          notes={notes} setNotes={setNotes}
          compact
        />
      </div>

      {/* Column headers */}
      <div className="flex items-center border-b border-border/50 px-4 py-1.5">
        <div className="flex-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
          Reading
        </div>
        <div className="hidden w-[90px] shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60 sm:block">
          Pulse
        </div>
        <div className="w-[80px] shrink-0 text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
          Status
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/50">
        {logs.map((log, idx) => {
          const category = bpCategory(log.systolic, log.diastolic)
          const prev = logs[idx + 1]
          return (
            <div key={log.id} className="flex items-center px-4 py-2.5 hover:bg-muted/20 transition-colors">
              {/* Reading value */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold tabular-nums text-foreground">
                    {log.systolic}/{log.diastolic}
                  </span>
                  <span className="text-[11px] text-muted-foreground">mmHg</span>
                  <BpTrend current={log.systolic} previous={prev?.systolic} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {formatDateTime(log.recorded_at)}
                  {log.pulse && (
                    <span className="ml-2 sm:hidden">
                      · <Heart className="inline h-3 w-3 text-red-400/60" /> {log.pulse} bpm
                    </span>
                  )}
                </p>
                {log.notes && (
                  <p className="mt-0.5 text-[11px] italic text-muted-foreground/70">{log.notes}</p>
                )}
              </div>

              {/* Pulse (sm+ only) */}
              <div className="hidden w-[90px] shrink-0 sm:block">
                {log.pulse ? (
                  <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                    <Heart className="h-3 w-3 text-red-400/60" />
                    {log.pulse} bpm
                  </span>
                ) : (
                  <span className="text-[12px] text-muted-foreground">—</span>
                )}
              </div>

              {/* Status */}
              <div className="w-[80px] shrink-0 text-right">
                <span className={cn('text-[12px] font-medium', category.color)}>
                  {category.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// =============================================================================
// Add Reading Dialog (extracted to avoid repetition)
// =============================================================================

function AddReadingDialog({
  open,
  setOpen,
  onSubmit,
  isPending,
  error,
  systolic, setSystolic,
  diastolic, setDiastolic,
  pulse, setPulse,
  notes, setNotes,
  compact,
}: {
  open: boolean
  setOpen: (v: boolean) => void
  onSubmit: (e: React.FormEvent) => void
  isPending: boolean
  error: string | null
  systolic: string; setSystolic: (v: string) => void
  diastolic: string; setDiastolic: (v: string) => void
  pulse: string; setPulse: (v: string) => void
  notes: string; setNotes: (v: string) => void
  compact?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <button className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors">
            <Plus className="h-3 w-3" />
            Add Reading
          </button>
        ) : (
          <Button size="sm" variant="outline">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Reading
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Heart className="h-4 w-4 text-red-400" />
            Record BP Reading
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-3 pt-1">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Systolic *</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="50"
                  max="300"
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                  placeholder="120"
                  className="pr-12"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                  mmHg
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Diastolic *</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="30"
                  max="200"
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value)}
                  placeholder="80"
                  className="pr-12"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                  mmHg
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Pulse (optional)</Label>
            <div className="relative">
              <Input
                type="number"
                min="30"
                max="250"
                value={pulse}
                onChange={(e) => setPulse(e.target.value)}
                placeholder="72"
                className="pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                bpm
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Reading'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
