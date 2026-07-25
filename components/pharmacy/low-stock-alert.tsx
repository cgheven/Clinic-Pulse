'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LowStockItem } from '@/app/actions/pharmacy'

// =============================================================================
// Props
// =============================================================================

interface LowStockAlertProps {
  items: LowStockItem[]
  className?: string
}

// =============================================================================
// Component — compact warning banner
// =============================================================================

export function LowStockAlert({ items, className }: LowStockAlertProps) {
  const [dismissed, setDismissed] = useState(false)
  const [expanded, setExpanded] = useState(false)

  if (dismissed || items.length === 0) return null

  const criticalItems = items.filter((i) => i.stock_status === 'critical')
  const lowItems = items.filter((i) => i.stock_status === 'low')

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/5',
        className
      )}
    >
      {/* Banner row */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />

        <div className="min-w-0 flex-1">
          <span className="text-[12px] font-semibold text-amber-400">
            {items.length} item{items.length !== 1 ? 's' : ''} need restocking
          </span>
          {(criticalItems.length > 0 || lowItems.length > 0) && (
            <span className="ml-2 text-[12px] text-muted-foreground">
              {criticalItems.length > 0 && (
                <span className="text-red-400">{criticalItems.length} critical</span>
              )}
              {criticalItems.length > 0 && lowItems.length > 0 && (
                <span className="text-muted-foreground"> · </span>
              )}
              {lowItems.length > 0 && (
                <span className="text-amber-400">{lowItems.length} low</span>
              )}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Link
            href="/pharmacy/inventory?filter=low_stock"
            className="rounded-md px-2 py-1 text-[11px] font-medium text-amber-400 transition-colors hover:bg-amber-500/10"
          >
            View
          </Link>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-amber-500/10 hover:text-amber-400"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-amber-500/10 hover:text-foreground"
            aria-label="Dismiss alert"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded item list */}
      {expanded && (
        <div className="border-t border-amber-500/20 px-4 pb-3 pt-2">
          <div className="space-y-1">
            {items.slice(0, 10).map((item) => (
              <StockItemRow key={item.id} item={item} />
            ))}
          </div>
          {items.length > 10 && (
            <p className="mt-2 text-center text-[12px] text-muted-foreground">
              +{items.length - 10} more items
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// StockItemRow
// =============================================================================

function StockItemRow({ item }: { item: LowStockItem }) {
  const isCritical = item.stock_status === 'critical'

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-amber-500/5">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className={cn(
            'h-1.5 w-1.5 shrink-0 rounded-full',
            isCritical ? 'bg-red-500' : 'bg-amber-500'
          )}
        />
        <p className="truncate text-[12px] font-medium text-foreground">{item.name}</p>
        {item.generic_name && (
          <span className="hidden truncate text-[12px] text-muted-foreground sm:block">
            ({item.generic_name})
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <p
          className={cn(
            'text-[12px] font-semibold',
            isCritical ? 'text-red-400' : 'text-amber-400'
          )}
        >
          {item.stock_qty} {item.unit}
          <span className="ml-1 text-[11px] font-normal text-muted-foreground">
            / {item.reorder_level} min
          </span>
        </p>
        <Link
          href={`/pharmacy/inventory/${item.id}`}
          className="rounded px-2 py-0.5 text-[11px] font-medium text-amber-400 transition-colors hover:bg-amber-500/10"
        >
          Restock
        </Link>
      </div>
    </div>
  )
}
