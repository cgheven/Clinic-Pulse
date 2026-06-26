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
  className?: string
}

function bpCategory(systolic: number, diastolic: number): {
  label: string
  color: string
} {
  if (systolic < 120 && diastolic < 80) return { label: 'Normal', color: 'text-emerald-400' }
  if (systolic < 130 && diastolic < 80) return { label: 'Elevated', color: 'text-yellow-400' }
  if (systolic < 140 || diastolic < 90) return { label: 'Stage 1 HT', color: 'text-orange-400' }
  if (systolic >= 140 || diastolic >= 90) return { label: 'Stage 2 HT', color: 'text-red-400' }
  return { label: 'Unknown', color: 'text-muted-foreground' }
}

function BpTrend({ current, previous }: { current: number; previous?: number }) {
  if (previous === undefined) return null
  const diff = current - previous
  if (Math.abs(diff) < 2) return <Minus className="h-3 w-3 text-muted-foreground" />
  if (diff > 0) return <TrendingUp className="h-3 w-3 text-red-400" />
  return <TrendingDown className="h-3 w-3 text-emerald-400" />
}

export function BpLog({ patientId, logs: initialLogs, className }: BpLogProps) {
  const [logs, setLogs] = useState<CpBpLog[]>(initialLogs)
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Form state
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

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Heart className="h-4 w-4 text-red-400" />
          Blood Pressure Log
          {logs.length > 0 && (
            <span className="ml-1 rounded-full bg-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {logs.length}
            </span>
          )}
        </h3>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 text-xs">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Reading
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-400" />
                Record BP Reading
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleAdd} className="space-y-4 pt-2">
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="systolic">Systolic *</Label>
                  <div className="relative">
                    <Input
                      id="systolic"
                      type="number"
                      min="50"
                      max="300"
                      value={systolic}
                      onChange={(e) => setSystolic(e.target.value)}
                      placeholder="120"
                      className="pr-10"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                      mmHg
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="diastolic">Diastolic *</Label>
                  <div className="relative">
                    <Input
                      id="diastolic"
                      type="number"
                      min="30"
                      max="200"
                      value={diastolic}
                      onChange={(e) => setDiastolic(e.target.value)}
                      placeholder="80"
                      className="pr-10"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                      mmHg
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pulse">Pulse (optional)</Label>
                <div className="relative">
                  <Input
                    id="pulse"
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

              <div className="space-y-1.5">
                <Label htmlFor="bp_notes">Notes</Label>
                <Textarea
                  id="bp_notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} size="sm">
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} size="sm">
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Save Reading'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Log Entries */}
      {logs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 py-10 text-center">
          <Activity className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No BP readings recorded yet</p>
          <p className="mt-0.5 text-xs text-muted-foreground/60">
            Click &quot;Add Reading&quot; to log the first measurement
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log, idx) => {
            const category = bpCategory(log.systolic, log.diastolic)
            const prev = logs[idx + 1]
            return (
              <div
                key={log.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
              >
                {/* BP Value */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-foreground">
                      {log.systolic}/{log.diastolic}
                    </span>
                    <span className="text-xs text-muted-foreground">mmHg</span>
                    <BpTrend current={log.systolic} previous={prev?.systolic} />
                    <span className={cn('text-xs font-medium', category.color)}>
                      {category.label}
                    </span>
                  </div>

                  <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                    {log.pulse && (
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3 text-red-400/60" />
                        {log.pulse} bpm
                      </span>
                    )}
                    <span>{formatDateTime(log.recorded_at)}</span>
                  </div>

                  {log.notes && (
                    <p className="mt-1 text-[11px] text-muted-foreground/80 italic">{log.notes}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
