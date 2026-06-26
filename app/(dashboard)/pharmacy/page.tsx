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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LowStockAlert } from '@/components/pharmacy/low-stock-alert'
import { getDailySales, getLowStockItems } from '@/app/actions/pharmacy'

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

// =============================================================================
// Page
// =============================================================================

export default async function PharmacyDashboardPage() {
  const today = todayISO()

  const [salesResult, lowStockResult] = await Promise.all([
    getDailySales(today),
    getLowStockItems(),
  ])

  const salesData = salesResult.success ? salesResult.data : null
  const lowStockItems = lowStockResult.success ? lowStockResult.data : []
  const criticalCount = lowStockItems.filter((i) => i.stock_status === 'critical').length

  return (
    <div className="space-y-6 p-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pharmacy</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {new Date().toLocaleDateString('en-PK', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

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
      {lowStockItems.length > 0 && (
        <LowStockAlert items={lowStockItems} />
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Today's Sales */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today&apos;s Sales
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <ShoppingCart className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {formatPKR(salesData?.total_paisas ?? 0)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {salesData?.sale_count ?? 0} transaction
              {(salesData?.sale_count ?? 0) !== 1 ? 's' : ''} today
            </p>
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock Items
            </CardTitle>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                criticalCount > 0 ? 'bg-red-500/10' : 'bg-amber-500/10'
              }`}
            >
              <AlertTriangle
                className={`h-4 w-4 ${criticalCount > 0 ? 'text-red-400' : 'text-amber-400'}`}
              />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{lowStockItems.length}</p>
            <div className="mt-1 flex items-center gap-2">
              {criticalCount > 0 && (
                <Badge variant="destructive" className="text-[10px]">
                  {criticalCount} critical
                </Badge>
              )}
              <p className="text-xs text-muted-foreground">
                {lowStockItems.length === 0 ? 'All items well stocked' : 'need restocking'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Avg per sale */}
        <Card className="border-border bg-card sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg per Sale
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
              <TrendingUp className="h-4 w-4 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">
              {salesData && salesData.sale_count > 0
                ? formatPKR(Math.round(salesData.total_paisas / salesData.sale_count))
                : formatPKR(0)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">per transaction today</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's recent sales */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent sales table */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Recent Sales</CardTitle>
            <Link
              href={`/pharmacy/sales?date=${today}`}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {!salesData || salesData.sales.length === 0 ? (
              <div className="py-10 text-center">
                <ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">No sales recorded today</p>
                <Link
                  href="/pharmacy/sales/new"
                  className="mt-2 inline-block text-xs text-primary hover:underline"
                >
                  Record first sale
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {salesData.sales.slice(0, 8).map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {sale.items.length === 1
                          ? (sale.items[0]?.inventory?.name ?? 'Unknown')
                          : `${sale.items.length} items`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sale.items.reduce((s, i) => s + i.qty, 0)} unit(s)
                        {sale.patient && ` · ${sale.patient.name}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {formatPKR(sale.total_paisas)}
                      </p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {sale.payment_method ?? 'cash'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick links */}
        <div className="space-y-4">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {[
                {
                  href: '/pharmacy/sales/new',
                  icon: ShoppingCart,
                  label: 'Record New Sale',
                  desc: 'Add medicines to a sale',
                  color: 'text-primary',
                  bg: 'bg-primary/10',
                },
                {
                  href: '/pharmacy/inventory',
                  icon: Package,
                  label: 'View Inventory',
                  desc: 'Browse all medicines',
                  color: 'text-blue-400',
                  bg: 'bg-blue-500/10',
                },
                {
                  href: '/pharmacy/inventory/new',
                  icon: PlusCircle,
                  label: 'Add Medicine',
                  desc: 'Add a new medicine to inventory',
                  color: 'text-emerald-400',
                  bg: 'bg-emerald-500/10',
                },
                {
                  href: `/pharmacy/sales?date=${today}`,
                  icon: TrendingUp,
                  label: "Today's Sales Log",
                  desc: 'Full daily sales report',
                  color: 'text-amber-400',
                  bg: 'bg-amber-500/10',
                },
              ].map(({ href, icon: Icon, label, desc, color, bg }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/30 hover:bg-muted/30"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg}`}
                  >
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
