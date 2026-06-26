import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { MedicineEditForm } from './medicine-edit-form'
import { StockAdjustForm } from './stock-adjust-form'
import { getInventoryItem } from '@/app/actions/pharmacy'

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

  const stockBadgeClass =
    status === 'critical'
      ? 'border-red-500/30 bg-red-500/15 text-red-400'
      : status === 'low'
        ? 'border-amber-500/30 bg-amber-500/15 text-amber-400'
        : 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/pharmacy/inventory"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{medicine.name}</h1>
            {!medicine.is_active && (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>
          {medicine.generic_name && (
            <p className="mt-0.5 text-sm text-muted-foreground">{medicine.generic_name}</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Overview + Adjustment */}
        <div className="space-y-6 lg:col-span-2">
          {/* Stock overview */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-border bg-card">
              <CardContent className="pt-5">
                <p className="text-xs font-medium text-muted-foreground">Current Stock</p>
                <div className="mt-1 flex items-end gap-2">
                  <p className="text-3xl font-bold text-foreground">{medicine.stock_qty}</p>
                  <p className="mb-1 text-sm text-muted-foreground capitalize">
                    {medicine.unit}
                  </p>
                </div>
                <span
                  className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${stockBadgeClass}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      status === 'critical'
                        ? 'bg-red-400'
                        : status === 'low'
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                    }`}
                  />
                  {status === 'critical' ? 'Critical' : status === 'low' ? 'Low' : 'In Stock'}
                </span>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="pt-5">
                <p className="text-xs font-medium text-muted-foreground">Sale Price</p>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {formatPKR(medicine.sale_price_paisas)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">per {medicine.unit}</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="pt-5">
                <p className="text-xs font-medium text-muted-foreground">Reorder Level</p>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {medicine.reorder_level}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground capitalize">
                  {medicine.unit}
                </p>
                {medicine.expiry_date && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Exp:{' '}
                    {new Date(medicine.expiry_date).toLocaleDateString('en-PK', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Stock Adjustment */}
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
