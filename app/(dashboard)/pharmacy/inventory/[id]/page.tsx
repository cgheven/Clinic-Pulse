import React from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, Package, TrendingDown, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MedicineEditForm } from './medicine-edit-form'
import { StockAdjustForm } from './stock-adjust-form'
import { getMedicine } from '@/app/actions/pharmacy'

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

function getStockStatus(quantity: number, threshold: number): StockStatus {
  if (quantity <= threshold) return 'critical'
  if (quantity <= Math.ceil(threshold * 1.2)) return 'low'
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
  const result = await getMedicine(id)

  if (!result.success) notFound()

  const { medicine, recentSales } = result.data
  const status = getStockStatus(medicine.quantity, medicine.low_stock_threshold)

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
            <h1 className="text-2xl font-bold text-foreground">{medicine.medicine_name}</h1>
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
        {/* Left: Overview + History */}
        <div className="space-y-6 lg:col-span-2">
          {/* Stock overview */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-border bg-card">
              <CardContent className="pt-5">
                <p className="text-xs font-medium text-muted-foreground">Current Stock</p>
                <div className="mt-1 flex items-end gap-2">
                  <p className="text-3xl font-bold text-foreground">{medicine.quantity}</p>
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
                <p className="text-xs font-medium text-muted-foreground">Selling Price</p>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {formatPKR(medicine.selling_price_per_unit)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">per {medicine.unit}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Cost: {formatPKR(medicine.cost_price_per_unit)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="pt-5">
                <p className="text-xs font-medium text-muted-foreground">Reorder Level</p>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {medicine.low_stock_threshold}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground capitalize">
                  {medicine.unit}
                </p>
                {medicine.expiry_date && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Exp:{' '}
                    {new Date(medicine.expiry_date).toLocaleDateString('en-PK', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Stock Adjustment */}
          <StockAdjustForm medicineId={medicine.id} medicineName={medicine.medicine_name} />

          {/* Stock history — recent sales */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10">
                  <TrendingDown className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <CardTitle className="text-base">Recent Sales / Stock Movements</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentSales.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">No sales recorded yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recentSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="flex items-center justify-between gap-3 px-5 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-400">
                            <TrendingDown className="h-2.5 w-2.5" />
                            -{sale.quantity_sold}
                          </span>
                          <p className="text-sm text-foreground">
                            Sold {sale.quantity_sold} {medicine.unit}
                          </p>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(sale.created_at).toLocaleDateString('en-PK', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {sale.patient && ` · ${sale.patient.full_name}`}
                          {sale.notes && ` · ${sale.notes}`}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">
                          {formatPKR(sale.total_amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sale.payment_method?.name ?? 'Cash'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Edit form */}
        <div>
          <MedicineEditForm medicine={medicine} />
        </div>
      </div>
    </div>
  )
}
