'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Package,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CpPharmacyInventory } from '@/types/index'

// =============================================================================
// Helpers
// =============================================================================

function formatPKR(paisas: number): string {
  return `Rs. ${(paisas / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

type StockStatus = 'critical' | 'low' | 'ok'

function getStockStatus(item: CpPharmacyInventory): StockStatus {
  if (item.quantity <= item.low_stock_threshold) return 'critical'
  if (item.quantity <= Math.ceil(item.low_stock_threshold * 1.2)) return 'low'
  return 'ok'
}

function StockBadge({ item }: { item: CpPharmacyInventory }) {
  const status = getStockStatus(item)

  const labels: Record<StockStatus, string> = {
    critical: 'Critical',
    low: 'Low',
    ok: 'In Stock',
  }

  const variants: Record<
    StockStatus,
    React.ComponentProps<typeof Badge>['variant']
  > = {
    critical: 'destructive',
    low: 'warning',
    ok: 'success',
  }

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
          status === 'critical' &&
            'border border-red-500/30 bg-red-500/15 text-red-400',
          status === 'low' &&
            'border border-amber-500/30 bg-amber-500/15 text-amber-400',
          status === 'ok' &&
            'border border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
        )}
      >
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            status === 'critical' && 'bg-red-400',
            status === 'low' && 'bg-amber-400',
            status === 'ok' && 'bg-emerald-400'
          )}
        />
        {item.quantity} {item.unit}
      </span>
      {status !== 'ok' && (
        <Badge variant={variants[status]} className="text-[10px]">
          {labels[status]}
        </Badge>
      )}
    </div>
  )
}

// =============================================================================
// Sort types
// =============================================================================

type SortField =
  | 'medicine_name'
  | 'quantity'
  | 'selling_price_per_unit'
  | 'cost_price_per_unit'
  | 'expiry_date'

type SortDir = 'asc' | 'desc'

interface SortState {
  field: SortField
  dir: SortDir
}

// =============================================================================
// Props
// =============================================================================

interface InventoryTableProps {
  items: CpPharmacyInventory[]
  totalCount: number
  page: number
  pageSize: number
  onPageChange?: (page: number) => void
  className?: string
}

// =============================================================================
// Component
// =============================================================================

export function InventoryTable({
  items,
  totalCount,
  page,
  pageSize,
  onPageChange,
  className,
}: InventoryTableProps) {
  const [sort, setSort] = useState<SortState>({ field: 'medicine_name', dir: 'asc' })

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      let aVal: string | number | null = null
      let bVal: string | number | null = null

      switch (sort.field) {
        case 'medicine_name':
          aVal = a.medicine_name.toLowerCase()
          bVal = b.medicine_name.toLowerCase()
          break
        case 'quantity':
          aVal = a.quantity
          bVal = b.quantity
          break
        case 'selling_price_per_unit':
          aVal = a.selling_price_per_unit
          bVal = b.selling_price_per_unit
          break
        case 'cost_price_per_unit':
          aVal = a.cost_price_per_unit
          bVal = b.cost_price_per_unit
          break
        case 'expiry_date':
          aVal = a.expiry_date ?? ''
          bVal = b.expiry_date ?? ''
          break
      }

      if (aVal === null || aVal === '') return sort.dir === 'asc' ? 1 : -1
      if (bVal === null || bVal === '') return sort.dir === 'asc' ? -1 : 1
      if (aVal < bVal) return sort.dir === 'asc' ? -1 : 1
      if (aVal > bVal) return sort.dir === 'asc' ? 1 : -1
      return 0
    })
  }, [items, sort])

  function toggleSort(field: SortField) {
    setSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'asc' }
    )
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sort.field !== field) return <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />
    return sort.dir === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-primary" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-primary" />
    )
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  if (sorted.length === 0) {
    return (
      <div className={cn('rounded-lg border border-border bg-card py-16 text-center', className)}>
        <Package className="mx-auto h-10 w-10 text-muted-foreground/30" />
        <p className="mt-3 text-sm text-muted-foreground">No medicines found</p>
        <Link
          href="/pharmacy/inventory/new"
          className="mt-3 inline-block text-xs text-primary hover:underline"
        >
          Add first medicine
        </Link>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {/* Medicine Name */}
              <th className="whitespace-nowrap px-4 py-3 text-left">
                <button
                  onClick={() => toggleSort('medicine_name')}
                  className="flex items-center gap-1.5 font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  Medicine <SortIcon field="medicine_name" />
                </button>
              </th>

              {/* Unit */}
              <th className="whitespace-nowrap px-4 py-3 text-left font-semibold text-muted-foreground">
                Unit
              </th>

              {/* Stock */}
              <th className="whitespace-nowrap px-4 py-3 text-left">
                <button
                  onClick={() => toggleSort('quantity')}
                  className="flex items-center gap-1.5 font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  Stock <SortIcon field="quantity" />
                </button>
              </th>

              {/* Cost Price */}
              <th className="hidden whitespace-nowrap px-4 py-3 text-right md:table-cell">
                <button
                  onClick={() => toggleSort('cost_price_per_unit')}
                  className="flex w-full items-center justify-end gap-1.5 font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  Cost <SortIcon field="cost_price_per_unit" />
                </button>
              </th>

              {/* Selling Price */}
              <th className="whitespace-nowrap px-4 py-3 text-right">
                <button
                  onClick={() => toggleSort('selling_price_per_unit')}
                  className="flex w-full items-center justify-end gap-1.5 font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  Sale Price <SortIcon field="selling_price_per_unit" />
                </button>
              </th>

              {/* Expiry */}
              <th className="hidden whitespace-nowrap px-4 py-3 text-left lg:table-cell">
                <button
                  onClick={() => toggleSort('expiry_date')}
                  className="flex items-center gap-1.5 font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  Expiry <SortIcon field="expiry_date" />
                </button>
              </th>

              {/* Actions */}
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {sorted.map((item) => {
              const expiryDate = item.expiry_date ? new Date(item.expiry_date) : null
              const isExpiringSoon =
                expiryDate && expiryDate < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              const isExpired = expiryDate && expiryDate < new Date()

              return (
                <tr
                  key={item.id}
                  className={cn(
                    'transition-colors hover:bg-muted/20',
                    !item.is_active && 'opacity-50'
                  )}
                >
                  {/* Medicine name */}
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">{item.medicine_name}</p>
                      {item.generic_name && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.generic_name}
                        </p>
                      )}
                      {item.manufacturer && (
                        <p className="text-[11px] text-muted-foreground/60">
                          {item.manufacturer}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Unit */}
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="capitalize">{item.unit}</span>
                    {item.pack_size > 1 && (
                      <span className="ml-1 text-xs">×{item.pack_size}</span>
                    )}
                  </td>

                  {/* Stock badge */}
                  <td className="px-4 py-3">
                    <StockBadge item={item} />
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Min: {item.low_stock_threshold}
                    </p>
                  </td>

                  {/* Cost price */}
                  <td className="hidden px-4 py-3 text-right text-muted-foreground md:table-cell">
                    {formatPKR(item.cost_price_per_unit)}
                  </td>

                  {/* Selling price */}
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-foreground">
                      {formatPKR(item.selling_price_per_unit)}
                    </span>
                  </td>

                  {/* Expiry */}
                  <td className="hidden px-4 py-3 lg:table-cell">
                    {expiryDate ? (
                      <span
                        className={cn(
                          'text-sm',
                          isExpired
                            ? 'font-semibold text-red-400'
                            : isExpiringSoon
                              ? 'font-medium text-amber-400'
                              : 'text-muted-foreground'
                        )}
                      >
                        {expiryDate.toLocaleDateString('en-PK', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                        {isExpired && (
                          <Badge variant="destructive" className="ml-1.5 text-[10px]">
                            Expired
                          </Badge>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/pharmacy/inventory/${item.id}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      <Pencil className="h-3 w-3" />
                      Manage
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of{' '}
            {totalCount} medicines
          </p>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum = i + 1
                if (totalPages > 5) {
                  if (page <= 3) pageNum = i + 1
                  else if (page >= totalPages - 2) pageNum = totalPages - 4 + i
                  else pageNum = page - 2 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange?.(pageNum)}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors',
                      pageNum === page
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
