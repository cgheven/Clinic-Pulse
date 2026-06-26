import React from 'react'
import Link from 'next/link'
import { ChevronLeft, ShoppingCart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SaleForm } from '@/components/pharmacy/sale-form'
import { getActiveInventoryForSale, getActivePaymentMethods } from '@/app/actions/pharmacy'

// =============================================================================
// Page
// =============================================================================

export default async function NewSalePage() {
  const [inventoryResult, paymentMethodsResult] = await Promise.all([
    getActiveInventoryForSale(),
    getActivePaymentMethods(),
  ])

  const inventory = inventoryResult.success ? inventoryResult.data : []
  const paymentMethods = paymentMethodsResult.success ? paymentMethodsResult.data : []

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/pharmacy/sales"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Sale</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Record a pharmacy sale — add multiple medicines in one transaction
          </p>
        </div>
      </div>

      {/* No inventory warning */}
      {inventory.length === 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm text-amber-400">
            No medicines available in inventory.{' '}
            <Link href="/pharmacy/inventory/new" className="font-medium underline">
              Add medicines first
            </Link>{' '}
            before recording a sale.
          </p>
        </div>
      )}

      {/* Sale form card */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <ShoppingCart className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base">Sale Details</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString('en-PK', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </CardHeader>
        <CardContent>
          <SaleForm inventory={inventory} paymentMethods={paymentMethods} />
        </CardContent>
      </Card>
    </div>
  )
}
