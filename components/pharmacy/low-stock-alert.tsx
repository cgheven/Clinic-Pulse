'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, X, ChevronDown, ChevronUp, Package } from 'lucide-react'
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
// Component
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
        'rounded-lg border border-amber-500/30 bg-amber-500/5',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>

          <div>
            <p className="text-sm font-semibold text-amber-400">
              Stock Alert — {items.length} item{items.length !== 1 ? 's' : ''} need attention
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {criticalItems.length > 0 && (
                <span className="text-red-400">
                  {criticalItems.length} critical
                  {criticalItems.length !== 1 ? ' items' : ' item'} at or below reorder level
                </span>
              )}
              {criticalItems.length > 0 && lowItems.length > 0 && (
                <span className="text-muted-foreground"> · </span>
              )}
              {lowItems.length > 0 && (
                <span className="text-amber-400">
                  {lowItems.length} {lowItems.length !== 1 ? 'items' : 'item'} approaching reorder
                  level
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-amber-500/10 hover:text-amber-400"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-amber-500/10 hover:text-foreground"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded item list */}
      {expanded && (
        <div className="border-t border-amber-500/20 px-4 pb-4 pt-3">
          <div className="space-y-2">
            {items.slice(0, 10).map((item) => (
              <StockItemRow key={item.id} item={item} />
            ))}
          </div>

          {items.length > 10 && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              +{items.length - 10} more items
            </p>
          )}

          <div className="mt-3 flex justify-end">
            <Link
              href="/pharmacy/inventory?filter=low_stock"
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
            >
              <Package className="h-3.5 w-3.5" />
              View All Low Stock
            </Link>
          </div>
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
    <div className="flex items-center justify-between gap-3 rounded-lg bg-card/50 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {/* Status dot */}
          <span
            className={cn(
              'h-2 w-2 shrink-0 rounded-full',
              isCritical ? 'bg-red-500' : 'bg-amber-500'
            )}
          />
          <p className="truncate text-sm font-medium text-foreground">
            {item.name}
          </p>
          {item.generic_name && (
            <span className="hidden truncate text-xs text-muted-foreground sm:block">
              ({item.generic_name})
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 text-xs">
        <div className="text-right">
          <p
            className={cn(
              'font-semibold',
              isCritical ? 'text-red-400' : 'text-amber-400'
            )}
          >
            {item.stock_qty} {item.unit}
          </p>
          <p className="text-muted-foreground">
            Min: {item.reorder_level}
          </p>
        </div>

        {item.expiry_date && (
          <div className="hidden text-right sm:block">
            <p className="text-muted-foreground">Expires</p>
            <p className="font-medium text-foreground">
              {new Date(item.expiry_date).toLocaleDateString('en-PK', {
                month: 'short',
                year: '2-digit',
              })}
            </p>
          </div>
        )}

        <Link
          href={`/pharmacy/inventory/${item.id}`}
          className="rounded px-2 py-1 text-[11px] font-medium text-amber-400 transition-colors hover:bg-amber-500/10"
        >
          Restock
        </Link>
      </div>
    </div>
  )
}
