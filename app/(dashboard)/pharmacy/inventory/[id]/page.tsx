import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, Package, TrendingUp, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { MedicineEditForm } from './medicine-edit-form'
import { StockAdjustForm } from './stock-adjust-form'
import { getInventoryItem } from '@/app/actions/pharmacy'
import { formatCurrencyPaisas } from '@/lib/utils'

// =============================================================================
// Helpers
// =============================================================================

type StockStatus = 'critical' | 'low' | 'ok'

function getStockStatus(qty: number, reorderLevel: number): StockStatus {
  if (qty <= reorderLevel) return 'critical'
  if (qty <= Math.ceil(reorderLevel * 1.2)) return 'low'
  return 'ok'
}

// =============================================================================
// Page
// =============================================================================

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MedicineDetailPage({ params }: PageProps) {
  const { id } = await params
  const result = await getInventoryItem(id)

  if (!result.success) notFound()

  const medicine = result.data
  const status = getStockStatus(medicine.stock_qty, medicine.reorder_level)

  const statusColor =
    status === 'critical'
      ? { bg: 'bg-red-500/10', icon: 'text-red-400', dot: 'bg-red-400' }
      : status === 'low'
        ? { bg: 'bg-amber-500/10', icon: 'text-amber-400', dot: 'bg-amber-400' }
        : { bg: 'bg-emerald-500/10', icon: 'text-emerald-400', dot: 'bg-emerald-400' }

  const statusLabel =
    status === 'critical' ? 'Critical' : status === 'low' ? 'Low' : 'In Stock'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/pharmacy/inventory"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold text-foreground sm:text-xl">{medicine.name}</h1>
            {!medicine.is_active && <Badge variant="secondary">Inactive</Badge>}
          </div>
          {medicine.generic_name && (
            <p className="text-[12px] text-muted-foreground">{medicine.generic_name}</p>
          )}
        </div>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {/* Current Stock */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${statusColor.bg}`}
          >
            <Package className={`h-4 w-4 ${statusColor.icon}`} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Current Stock
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">
              {medicine.stock_qty}{' '}
              <span className="text-[11px] font-normal capitalize text-muted-foreground">
                {medicine.unit}
              </span>
            </p>
            <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-medium">
              <span className={`h-1.5 w-1.5 rounded-full ${statusColor.dot}`} />
              <span className={statusColor.icon}>{statusLabel}</span>
            </span>
          </div>
        </div>

        {/* Sale Price */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Sale Price
            </p>
            <p className="truncate text-sm font-bold tabular-nums text-foreground">
              {formatCurrencyPaisas(medicine.sale_price_paisas)}
            </p>
            <p className="text-[10px] text-muted-foreground">per {medicine.unit}</p>
          </div>
        </div>

        {/* Reorder Level */}
        <div className="col-span-2 flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 sm:col-span-1">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
            <RotateCcw className="h-4 w-4 text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Reorder Level
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">
              {medicine.reorder_level}{' '}
              <span className="text-[11px] font-normal capitalize text-muted-foreground">
                {medicine.unit}
              </span>
            </p>
            {medicine.expiry_date && (
              <p className="text-[10px] text-muted-foreground">
                Exp:{' '}
                {new Date(medicine.expiry_date).toLocaleDateString('en-PK', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: Stock Adjustment */}
        <div className="lg:col-span-2">
          <StockAdjustForm medicineId={medicine.id} medicineName={medicine.name} />
        </div>

        {/* Right: Edit form */}
        <div>
          <MedicineEditForm medicine={medicine} />
        </div>
      </div>
    </div>
  )
}
