'use client'

import React, { useState, useTransition } from 'react'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { Loader2, Banknote, Smartphone, Wallet, Building2, CreditCard } from 'lucide-react'
import type { CpPaymentMethod } from '@/types/index'
import { togglePaymentMethod } from '@/app/actions/settings'

// =============================================================================
// Icon map (matches seed data icon_name values)
// =============================================================================

const ICON_MAP: Record<string, React.ElementType> = {
  Banknote,
  Smartphone,
  Wallet,
  Building2,
  CreditCard,
}

function PaymentIcon({ iconName }: { iconName: string | null }) {
  const Icon = iconName ? (ICON_MAP[iconName] ?? CreditCard) : CreditCard
  return <Icon className="h-5 w-5" />
}

// =============================================================================
// Component
// =============================================================================

interface PaymentMethodRow extends CpPaymentMethod {
  isToggling: boolean
}

interface PaymentMethodsManagerProps {
  initialMethods: CpPaymentMethod[]
}

export function PaymentMethodsManager({ initialMethods }: PaymentMethodsManagerProps) {
  const [methods, setMethods] = useState<PaymentMethodRow[]>(() =>
    initialMethods.map((m) => ({ ...m, isToggling: false }))
  )
  const [, startTransition] = useTransition()

  function handleToggle(id: string, enabled: boolean) {
    setMethods((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isToggling: true } : m))
    )

    startTransition(async () => {
      const result = await togglePaymentMethod(id, enabled)

      if (result.success) {
        setMethods((prev) =>
          prev.map((m) =>
            m.id === id ? { ...m, is_enabled: enabled, isToggling: false } : m
          )
        )
        const method = methods.find((m) => m.id === id)
        toast({
          title: enabled ? 'Payment method enabled' : 'Payment method disabled',
          description: `${method?.label ?? 'Method'} has been ${enabled ? 'enabled' : 'disabled'}.`,
        })
      } else {
        setMethods((prev) =>
          prev.map((m) => (m.id === id ? { ...m, isToggling: false } : m))
        )
        toast({
          title: 'Toggle failed',
          description: result.error ?? 'Unknown error',
          variant: 'destructive',
        })
      }
    })
  }

  const activeCount = methods.filter((m) => m.is_enabled).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Payment Methods</h3>
          <p className="text-xs text-muted-foreground">
            Enable or disable payment methods across all departments.
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">
          {activeCount} of {methods.length} active
        </Badge>
      </div>

      {/* Grid of method cards */}
      {methods.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-8 text-center">
          <CreditCard className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No payment methods configured.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {methods.map((method) => (
            <div
              key={method.id}
              className={cn(
                'group relative flex items-center gap-4 rounded-xl border p-4 transition-all',
                method.is_enabled
                  ? 'border-primary/30 bg-primary/5 shadow-sm shadow-primary/10'
                  : 'border-border bg-card opacity-60'
              )}
            >
              {/* Icon container */}
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
                  method.is_enabled
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <PaymentIcon iconName={null} />
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'text-sm font-semibold',
                    method.is_enabled ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {method.label}
                </p>
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">
                  {method.method.replace(/_/g, ' ')}
                </p>
              </div>

              {/* Toggle */}
              <div className="flex items-center gap-2">
                {method.isToggling && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
                <Switch
                  checked={method.is_enabled}
                  onCheckedChange={(checked) => handleToggle(method.id, checked)}
                  disabled={method.isToggling}
                  aria-label={`${method.is_enabled ? 'Disable' : 'Enable'} ${method.label}`}
                />
              </div>

              {/* Active indicator dot */}
              {method.is_enabled && (
                <div className="pointer-events-none absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-success" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Warning if all methods disabled */}
      {activeCount === 0 && methods.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2">
          <CreditCard className="h-4 w-4 shrink-0 text-warning" />
          <p className="text-xs text-warning">
            No payment methods are enabled. At least one method should be active for transactions.
          </p>
        </div>
      )}
    </div>
  )
}
