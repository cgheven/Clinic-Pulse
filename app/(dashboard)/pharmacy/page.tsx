import React from 'react'
import Link from 'next/link'
import {
  Package,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  PlusCircle,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LowStockAlert } from '@/components/pharmacy/low-stock-alert'
import { getDailySales, getLowStockItems } from '@/app/actions/pharmacy'
import { formatCurrencyPaisas, getTodayPKT } from '@/lib/utils'

// =============================================================================
// Page
// =============================================================================

export default async function PharmacyDashboardPage() {
  const today = getTodayPKT()

  const [salesResult, lowStockResult] = await Promise.all([
    getDailySales(today),
    getLowStockItems(),
  ])

  const salesData = salesResult.success ? salesResult.data : null
  const lowStockItems = lowStockResult.success ? lowStockResult.data : []
  const criticalCount = lowStockItems.filter((i) => i.stock_status === 'critical').length

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-bold text-foreground sm:text-xl">Pharmacy</h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/pharmacy/inventory/new">
              <PlusCircle className="mr-1.5 h-4 w-4" />
              Add Medicine
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/pharmacy/sales/new">
              <ShoppingCart className="mr-1.5 h-4 w-4" />
              New Sale
            </Link>
          </Button>
        </div>
      </div>

      {/* Low stock alert */}
      {lowStockItems.length > 0 && <LowStockAlert items={lowStockItems} />}

      {/* Stat chips */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Today Sales
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

        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Low Stock
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">
              {lowStockItems.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Critical
            </p>
            <p className="text-sm font-bold tabular-nums text-foreground">{criticalCount}</p>
          </div>
        </div>
      </div>

      {/* Quick link pill strip */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/pharmacy/sales/new"
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          Record Sale
        </Link>
        <Link
          href="/pharmacy/inventory"
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
        >
          <Package className="h-3.5 w-3.5" />
          View Inventory
        </Link>
        <Link
          href="/pharmacy/inventory/new"
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          Add Medicine
        </Link>
        <Link
          href={`/pharmacy/sales?date=${today}`}
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Today&apos;s Sales Log
        </Link>
      </div>

      {/* Today's recent sales — panel table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Section header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Sales
          </span>
          <Link
            href={`/pharmacy/sales?date=${today}`}
            className="flex items-center gap-1 text-[12px] text-primary hover:underline"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Column headers */}
        {salesData && salesData.sales.length > 0 && (
          <div className="flex items-center border-b border-border/50 px-4 py-1.5">
            <span className="flex-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              Medicine
            </span>
            <span className="hidden w-[80px] text-right text-[10px] uppercase tracking-wide text-muted-foreground sm:block">
              Method
            </span>
            <span className="w-[110px] text-right text-[10px] uppercase tracking-wide text-muted-foreground">
              Amount
            </span>
          </div>
        )}

        {/* Rows */}
        {!salesData || salesData.sales.length === 0 ? (
          <div className="py-8 text-center">
            <ShoppingCart className="mx-auto h-7 w-7 text-muted-foreground/30" />
            <p className="mt-2 text-[12px] text-muted-foreground">No sales recorded today</p>
            <Link
              href="/pharmacy/sales/new"
              className="mt-1 inline-block text-[12px] text-primary hover:underline"
            >
              Record first sale
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {salesData.sales.slice(0, 8).map((sale) => (
              <div
                key={sale.id}
                className="flex items-center px-4 py-2.5 transition-colors hover:bg-muted/20"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {sale.items.length === 1
                      ? (sale.items[0]?.inventory?.name ?? 'Unknown')
                      : `${sale.items.length} items`}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {sale.items.reduce((s, i) => s + i.qty, 0)} unit(s)
                    {sale.patient && ` · ${sale.patient.name}`}
                  </p>
                </div>
                <span className="hidden w-[80px] text-right text-[12px] capitalize text-muted-foreground sm:block">
                  {sale.payment_method ?? 'cash'}
                </span>
                <span className="w-[110px] text-right text-sm font-semibold text-foreground">
                  {formatCurrencyPaisas(sale.total_paisas)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
