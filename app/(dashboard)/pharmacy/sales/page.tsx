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
  TrendingUp,
  BarChart2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getDailySales } from '@/app/actions/pharmacy'
import type { DailySalesResult } from '@/app/actions/pharmacy'
import { formatCurrencyPaisas, getTodayPKT } from '@/lib/utils'

// =============================================================================
// Helpers
// =============================================================================

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
  const todayStr = getTodayPKT()
  const dateParam = searchParams.get('date') ?? todayStr

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

  const isToday = dateParam === todayStr

  const avgPerSale =
    salesData && salesData.sale_count > 0
      ? Math.round(salesData.total_paisas / salesData.sale_count)
      : 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-bold text-foreground sm:text-xl">Sales Log</h1>
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

        <div className="relative max-w-xs flex-1">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="date"
            value={dateParam}
            onChange={(e) => e.target.value && navigateToDate(e.target.value)}
            max={todayStr}
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
            onClick={() => navigateToDate(todayStr)}
            className="rounded-md border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            Today
          </button>
        )}
      </div>

      {/* Date label */}
      <p className="text-[12px] text-muted-foreground">{displayDate}</p>

      {isPending && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isPending && (
        <div className="space-y-4">
          {/* Stat chips */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                  Total Revenue
                </p>
                <p className="truncate text-sm font-bold tabular-nums text-foreground">
                  {formatCurrencyPaisas(salesData?.total_paisas ?? 0)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                <ShoppingCart className="h-4 w-4 text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                  Transactions
                </p>
                <p className="text-sm font-bold tabular-nums text-foreground">
                  {salesData?.sale_count ?? 0}
                </p>
              </div>
            </div>

            <div className="col-span-2 flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 sm:col-span-1">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <BarChart2 className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                  Avg per Sale
                </p>
                <p className="truncate text-sm font-bold tabular-nums text-foreground">
                  {formatCurrencyPaisas(avgPerSale)}
                </p>
              </div>
            </div>
          </div>

          {/* Sales panel table */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {/* Section header */}
            <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Sale Items
              </span>
              {salesData && salesData.sale_count > 0 && (
                <span className="text-[12px] text-muted-foreground">
                  {salesData.sale_count} sale{salesData.sale_count !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {!salesData || salesData.sales.length === 0 ? (
              <div className="py-12 text-center">
                <ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground/20" />
                <p className="mt-3 text-[12px] text-muted-foreground">
                  No sales recorded for this date
                </p>
                {isToday && (
                  <Link
                    href="/pharmacy/sales/new"
                    className="mt-2 inline-block text-[12px] text-primary hover:underline"
                  >
                    Record a sale now
                  </Link>
                )}
              </div>
            ) : (
              <>
                {/* Column headers */}
                <div className="flex items-center border-b border-border/50 px-4 py-1.5">
                  <span className="flex-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Medicine
                  </span>
                  <span className="hidden w-[60px] text-right text-[10px] uppercase tracking-wide text-muted-foreground sm:block">
                    Qty
                  </span>
                  <span className="hidden w-[100px] text-right text-[10px] uppercase tracking-wide text-muted-foreground sm:block">
                    Unit Price
                  </span>
                  <span className="w-[100px] text-right text-[10px] uppercase tracking-wide text-muted-foreground">
                    Total
                  </span>
                </div>

                <div className="divide-y divide-border/50">
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
                        className="flex items-center px-4 py-2.5 transition-colors hover:bg-muted/20"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {medicineName}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2">
                            {sale.patient && (
                              <span className="text-[12px] text-muted-foreground">
                                {sale.patient.name}
                              </span>
                            )}
                            {sale.payment_method && (
                              <span className="rounded-sm bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                                {sale.payment_method}
                              </span>
                            )}
                            {/* Mobile: show qty inline */}
                            <span className="text-[12px] text-muted-foreground sm:hidden">
                              {totalQty} {firstItem?.inventory?.unit ?? ''}
                            </span>
                          </div>
                        </div>

                        <span className="hidden w-[60px] text-right text-[12px] text-muted-foreground sm:block">
                          {totalQty}&nbsp;
                          <span className="text-[10px]">{firstItem?.inventory?.unit ?? ''}</span>
                        </span>

                        <span className="hidden w-[100px] text-right text-[12px] text-muted-foreground sm:block">
                          {firstItem ? formatCurrencyPaisas(firstItem.unit_price_paisas) : '—'}
                        </span>

                        <div className="w-[100px] text-right">
                          <p className="text-sm font-semibold text-foreground">
                            {formatCurrencyPaisas(sale.total_paisas)}
                          </p>
                          {sale.discount_paisas > 0 && (
                            <p className="text-[10px] text-amber-400">
                              -{formatCurrencyPaisas(sale.discount_paisas)} disc.
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Footer total */}
                <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-2.5">
                  <p className="text-[12px] font-semibold text-muted-foreground">
                    Total ({salesData.sale_count} sale{salesData.sale_count !== 1 ? 's' : ''})
                  </p>
                  <p className="text-sm font-bold text-primary">
                    {formatCurrencyPaisas(salesData.total_paisas)}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
