'use client'

import React, { useState, useTransition } from 'react'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { Loader2, Banknote, Smartphone, Wallet, Building2, CreditCard, AlertTriangle } from 'lucide-react'
import type { CpPaymentMethod } from '@/types/index'
import { togglePaymentMethod } from '@/app/actions/settings'

// =============================================================================
// Icon map
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
  return <Icon className="h-4 w-4" />
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

  if (methods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <CreditCard className="h-6 w-6 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No payment methods configured.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Active count row */}
      <div className="border-b border-border/50 px-4 py-2">
        <span className="text-[11px] text-muted-foreground">
          {activeCount} of {methods.length} active
        </span>
      </div>

      {/* Method rows */}
      <div className="divide-y divide-border/50">
        {methods.map((method) => (
          <div
            key={method.id}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/20',
              !method.is_enabled && 'opacity-60'
            )}
          >
            {/* Icon */}
            <div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                method.is_enabled
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <PaymentIcon iconName={null} />
            </div>

            {/* Label + slug */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{method.label}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground/60">
                {method.method.replace(/_/g, ' ')}
              </p>
            </div>

            {/* Toggle */}
            <div className="flex shrink-0 items-center gap-2">
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
          </div>
        ))}
      </div>

      {/* Warning when all disabled */}
      {activeCount === 0 && (
        <div className="border-t border-border/50 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
            <p className="text-[12px] text-warning">
              No payment methods are enabled. Enable at least one for transactions.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
