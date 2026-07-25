import React from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { SaleForm } from '@/components/pharmacy/sale-form'
import { getActiveInventoryForSale } from '@/app/actions/pharmacy'
// Same query as the (now-deleted) pharmacy copy, but request/24h-cached and
// busted by the 'payment-methods' tag in togglePaymentMethod.
import { getActivePaymentMethods } from '@/app/actions/opd'
import { getTodayPKT } from '@/lib/utils'

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

  const today = getTodayPKT()
  const displayDate = new Date(today + 'T00:00:00').toLocaleDateString('en-PK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/pharmacy/sales"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-foreground sm:text-xl">New Sale</h1>
          <p className="text-[12px] text-muted-foreground">{displayDate}</p>
        </div>
      </div>

      {/* No inventory warning */}
      {inventory.length === 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <p className="text-sm text-amber-400">
            No medicines available in inventory.{' '}
            <Link href="/pharmacy/inventory/new" className="font-medium underline">
              Add medicines first
            </Link>{' '}
            before recording a sale.
          </p>
        </div>
      )}

      {/* Sale form — unified panel */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border bg-muted/20 px-4 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Sale Details
          </span>
        </div>
        <div className="p-4">
          <SaleForm inventory={inventory} paymentMethods={paymentMethods} />
        </div>
      </div>
    </div>
  )
}
