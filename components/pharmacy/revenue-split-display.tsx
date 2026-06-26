'use client'

import React from 'react'
import { Building2, Stethoscope, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RevenueSplitResult } from '@/app/actions/pharmacy'

// =============================================================================
// Helpers
// =============================================================================

function formatPKR(paisas: number): string {
  const rupees = paisas / 100
  return `Rs. ${rupees.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function bpToPercent(bp: number): string {
  return (bp / 100).toFixed(1)
}

// =============================================================================
// Props
// =============================================================================

interface RevenueSplitDisplayProps {
  split: RevenueSplitResult
  className?: string
  compact?: boolean
}

// =============================================================================
// Component
// =============================================================================

export function RevenueSplitDisplay({
  split,
  className,
  compact = false,
}: RevenueSplitDisplayProps) {
  const parties = [
    {
      key: 'clinic',
      label: 'Clinic',
      icon: Building2,
      pct: split.clinic_pct,
      share: split.clinic_share,
      color: 'bg-amber-500',
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      key: 'doctor',
      label: 'Doctor',
      icon: Stethoscope,
      pct: split.doctor_pct,
      share: split.doctor_share,
      color: 'bg-blue-500',
      textColor: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      key: 'staff',
      label: 'Staff',
      icon: Users,
      pct: split.staff_pct,
      share: split.staff_share,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
  ]

  if (compact) {
    return (
      <div className={cn('space-y-2', className)}>
        {/* Mini progress bar */}
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
          {parties.map((p) => (
            <div
              key={p.key}
              className={cn('h-full transition-all', p.color)}
              style={{ width: `${bpToPercent(p.pct)}%` }}
            />
          ))}
        </div>

        {/* Compact legend */}
        <div className="grid grid-cols-3 gap-2">
          {parties.map((p) => {
            const Icon = p.icon
            return (
              <div key={p.key} className="flex flex-col gap-0.5 text-center">
                <div
                  className={cn(
                    'mx-auto flex h-7 w-7 items-center justify-center rounded-lg',
                    p.bgColor
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5', p.textColor)} />
                </div>
                <p className="text-[10px] font-medium text-muted-foreground">{p.label}</p>
                <p className={cn('text-xs font-semibold', p.textColor)}>
                  {bpToPercent(p.pct)}%
                </p>
                <p className="text-[10px] text-muted-foreground">{formatPKR(p.share)}</p>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Total header */}
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Total Sales Revenue
        </p>
        <p className="mt-1 text-2xl font-bold text-foreground">
          {formatPKR(split.total_sales)}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Split config effective from {split.effective_from}
        </p>
      </div>

      {/* Stacked bar */}
      <div className="space-y-1.5">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
          {parties.map((p) => (
            <div
              key={p.key}
              className={cn('h-full transition-all duration-500', p.color)}
              style={{ width: `${bpToPercent(p.pct)}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between px-0.5">
          {parties.map((p) => (
            <div key={p.key} className="flex items-center gap-1">
              <div className={cn('h-2 w-2 rounded-full', p.color)} />
              <span className="text-[10px] text-muted-foreground">{p.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Party cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {parties.map((p) => {
          const Icon = p.icon
          return (
            <div
              key={p.key}
              className="rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg',
                    p.bgColor
                  )}
                >
                  <Icon className={cn('h-4 w-4', p.textColor)} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{p.label}</p>
                  <p className={cn('text-sm font-semibold', p.textColor)}>
                    {bpToPercent(p.pct)}%
                  </p>
                </div>
              </div>
              <p className="mt-2 text-base font-bold text-foreground">
                {formatPKR(p.share)}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
