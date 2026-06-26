'use client'

import React, { useState, useEffect, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import {
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PlusCircle,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getDailySales } from '@/app/actions/pharmacy'
import type { DailySalesResult } from '@/app/actions/pharmacy'

// =============================================================================
// Helpers
// =============================================================================

function formatPKR(paisas: number): string {
  return `Rs. ${(paisas / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]!
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]!
}

// =============================================================================
// Page
// =============================================================================

export default function PharmacySalesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [isPending, startTransition] = useTransition()
  const dateParam = searchParams.get('date') ?? todayISO()

  const [salesData, setSalesData] = useState<DailySalesResult | null>(null)

  const fetchSales = useCallback((date: string) => {
    startTransition(async () => {
      const result = await getDailySales(date)
      if (result.success) setSalesData(result.data)
      else setSalesData(null)
    })
  }, [])

  useEffect(() => {
    fetchSales(dateParam)
  }, [dateParam, fetchSales])

  function navigateToDate(date: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('date', date)
    router.push(`${pathname}?${params.toString()}`)
  }

  const displayDate = new Date(dateParam + 'T00:00:00').toLocaleDateString('en-PK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const isToday = dateParam === todayISO()

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sales Log</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Daily pharmacy sales</p>
        </div>

        <Button asChild size="sm">
          <Link href="/pharmacy/sales/new">
            <PlusCircle className="mr-1.5 h-4 w-4" />
            New Sale
          </Link>
        </Button>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigateToDate(shiftDate(dateParam, -1))}
          className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="relative flex-1 max-w-xs">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="date"
            value={dateParam}
            onChange={(e) => e.target.value && navigateToDate(e.target.value)}
            max={todayISO()}
            className="pl-9"
          />
        </div>

        <button
          onClick={() => navigateToDate(shiftDate(dateParam, 1))}
          disabled={isToday}
          className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {!isToday && (
          <button
            onClick={() => navigateToDate(todayISO())}
            className="rounded-md border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            Today
          </button>
        )}
      </div>

      {/* Date heading */}
      <p className="text-sm font-medium text-foreground">{displayDate}</p>

      {isPending && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isPending && (
        <div className="space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card className="border-border bg-card">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="mt-0.5 text-xl font-bold text-primary">
                  {formatPKR(salesData?.total_paisas ?? 0)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Transactions</p>
                <p className="mt-0.5 text-xl font-bold text-foreground">
                  {salesData?.sale_count ?? 0}
                </p>
              </CardContent>
            </Card>

            <Card className="hidden border-border bg-card sm:block">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Avg per Sale</p>
                <p className="mt-0.5 text-xl font-bold text-foreground">
                  {formatPKR(
                    salesData && salesData.sale_count > 0
                      ? Math.round(salesData.total_paisas / salesData.sale_count)
                      : 0
                  )}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sales list */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Sale Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!salesData || salesData.sales.length === 0 ? (
                <div className="py-14 text-center">
                  <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground/20" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    No sales recorded for this date
                  </p>
                  {isToday && (
                    <Link
                      href="/pharmacy/sales/new"
                      className="mt-2 inline-block text-xs text-primary hover:underline"
                    >
                      Record a sale now
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  {/* Column headers */}
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b border-border bg-muted/20 px-5 py-2.5 text-xs font-semibold text-muted-foreground">
                    <span>Medicine</span>
                    <span className="text-right">Qty</span>
                    <span className="hidden text-right sm:block">Unit Price</span>
                    <span className="text-right">Total</span>
                  </div>

                  <div className="divide-y divide-border">
                    {salesData.sales.map((sale) => {
                      const firstItem = sale.items[0]
                      const medicineName =
                        sale.items.length === 1
                          ? (firstItem?.inventory?.name ?? 'Unknown')
                          : `${sale.items.length} items`
                      const totalQty = sale.items.reduce((s, i) => s + i.qty, 0)

                      return (
                        <div
                          key={sale.id}
                          className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-5 py-3.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {medicineName}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2">
                              {sale.patient && (
                                <p className="text-xs text-muted-foreground">
                                  {sale.patient.name}
                                </p>
                              )}
                              {sale.payment_method && (
                                <span className="rounded-sm bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                                  {sale.payment_method}
                                </span>
                              )}
                              {sale.notes && (
                                <span className="text-xs italic text-muted-foreground/60">
                                  {sale.notes}
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-right text-sm text-muted-foreground">
                            {totalQty}&nbsp;
                            <span className="text-xs">
                              {firstItem?.inventory?.unit ?? ''}
                            </span>
                          </p>

                          <p className="hidden text-right text-sm text-muted-foreground sm:block">
                            {firstItem ? formatPKR(firstItem.unit_price_paisas) : '—'}
                          </p>

                          <div className="text-right">
                            <p className="text-sm font-semibold text-foreground">
                              {formatPKR(sale.total_paisas)}
                            </p>
                            {sale.discount_paisas > 0 && (
                              <p className="text-[11px] text-amber-400">
                                -{formatPKR(sale.discount_paisas)} disc.
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Footer total */}
                  <div className="flex items-center justify-between border-t border-border bg-muted/20 px-5 py-3">
                    <p className="text-sm font-semibold text-muted-foreground">
                      Total ({salesData.sale_count} sale{salesData.sale_count !== 1 ? 's' : ''})
                    </p>
                    <p className="text-base font-bold text-primary">
                      {formatPKR(salesData.total_paisas)}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
