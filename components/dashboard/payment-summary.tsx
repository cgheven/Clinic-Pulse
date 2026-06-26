import {
  Banknote,
  Smartphone,
  CreditCard,
  Building2,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { PaymentTotal } from '@/app/actions/dashboard'
import { formatCurrencyPaisas } from '@/lib/utils'
import { cn } from '@/lib/utils'

// =============================================================================
// Slug → icon mapping
// =============================================================================

const SLUG_ICONS: Record<string, LucideIcon> = {
  cash: Banknote,
  jazzcash: Smartphone,
  easypaisa: Smartphone,
  bank_transfer: Building2,
}

function getIcon(slug: string): LucideIcon {
  return SLUG_ICONS[slug] ?? Wallet
}

// =============================================================================
// Slug → accent colour
// =============================================================================

const SLUG_COLORS: Record<string, { icon: string; bg: string }> = {
  cash: { icon: 'text-success', bg: 'bg-success/10' },
  jazzcash: { icon: 'text-red-400', bg: 'bg-red-400/10' },
  easypaisa: { icon: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  bank_transfer: { icon: 'text-info', bg: 'bg-info/10' },
}

function getColors(slug: string) {
  return SLUG_COLORS[slug] ?? { icon: 'text-primary', bg: 'bg-primary/10' }
}

// =============================================================================
// Loading skeleton
// =============================================================================

function PaymentSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="h-8 w-8 rounded-lg bg-muted" />
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="h-5 w-24 rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// PaymentMethodCard
// =============================================================================

function PaymentMethodCard({ item }: { item: PaymentTotal }) {
  const Icon = getIcon(item.method)
  const colors = getColors(item.method)

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className={cn('inline-flex h-9 w-9 items-center justify-center rounded-lg', colors.bg)}>
        <Icon className={cn('h-4 w-4', colors.icon)} />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground truncate">{item.label}</p>
        <p className="mt-0.5 text-base font-semibold text-foreground">
          {formatCurrencyPaisas(item.total)}
        </p>
      </div>
    </div>
  )
}

// =============================================================================
// PaymentSummary
// =============================================================================

interface PaymentSummaryProps {
  data: PaymentTotal[]
  loading?: boolean
}

export function PaymentSummary({ data, loading = false }: PaymentSummaryProps) {
  if (loading) return <PaymentSkeleton />

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No payment methods configured.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {data.map((item) => (
        <PaymentMethodCard key={item.method} item={item} />
      ))}
    </div>
  )
}
