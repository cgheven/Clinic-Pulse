'use client'

import React, { useState } from 'react'
import {
  Building2,
  PieChart,
  Users,
  Receipt,
  CreditCard,
  Stethoscope,
  UserCog,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GeneralSettingsForm } from '@/components/settings/general-settings-form'
import { RevenueSplitsTab } from '@/components/settings/revenue-splits-tab'
import { PartnersManager } from '@/components/settings/partners-manager'
import { ExpenseHeadsManager } from '@/components/settings/expense-heads-manager'
import { PaymentMethodsManager } from '@/components/settings/payment-methods-manager'
import { DoctorSettingsManager } from '@/components/settings/doctor-settings-manager'
import { StaffTypesManager } from '@/components/settings/staff-types-manager'
import type {
  GeneralSettingsData,
  PharmacyRevenueSplitData,
  DeptRevenueSplitData,
  XrayPartnerWithSplit,
  DoctorWithCommission,
} from '@/app/actions/settings'
import type { CpExpenseHead, CpPaymentMethod } from '@/types/index'

// =============================================================================
// Nav structure
// =============================================================================

type SectionKey = 'general' | 'revenue' | 'payments' | 'partners' | 'expenses' | 'doctors' | 'staff'

interface NavItem {
  key: SectionKey
  label: string       // full label — used in section header
  tabLabel: string    // short label — used in the tab bar
  subtitle: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Clinic',
    items: [
      {
        key: 'general',
        label: 'General',
        tabLabel: 'General',
        subtitle: 'Clinic name, contact information, working days and currency preferences.',
        icon: Building2,
        iconBg: 'bg-primary/10',
        iconColor: 'text-primary',
      },
    ],
  },
  {
    label: 'Financial',
    items: [
      {
        key: 'revenue',
        label: 'Revenue Splits',
        tabLabel: 'Revenue',
        subtitle: 'Configure how revenue is split between doctors, clinic and staff across departments.',
        icon: PieChart,
        iconBg: 'bg-info/10',
        iconColor: 'text-info',
      },
      {
        key: 'payments',
        label: 'Payment Methods',
        tabLabel: 'Payments',
        subtitle: 'Enable or disable accepted payment methods across all clinic departments.',
        icon: CreditCard,
        iconBg: 'bg-success/10',
        iconColor: 'text-success',
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      {
        key: 'partners',
        label: 'X-Ray Partners',
        tabLabel: 'X-Ray',
        subtitle: 'Manage X-ray revenue-sharing partners and their default split percentages.',
        icon: Users,
        iconBg: 'bg-purple-500/10',
        iconColor: 'text-purple-500',
      },
      {
        key: 'expenses',
        label: 'Expense Heads',
        tabLabel: 'Expenses',
        subtitle: 'Configure expense categories used across all departments.',
        icon: Receipt,
        iconBg: 'bg-orange-500/10',
        iconColor: 'text-orange-500',
      },
    ],
  },
  {
    label: 'People',
    items: [
      {
        key: 'doctors',
        label: 'Doctors',
        tabLabel: 'Doctors',
        subtitle: 'Configure earning models, commission rates and monthly salaries per doctor.',
        icon: Stethoscope,
        iconBg: 'bg-cyan-500/10',
        iconColor: 'text-cyan-500',
      },
      {
        key: 'staff',
        label: 'Staff Types',
        tabLabel: 'Staff',
        subtitle: 'Define available staff designation types for the clinic.',
        icon: UserCog,
        iconBg: 'bg-amber-500/10',
        iconColor: 'text-amber-500',
      },
    ],
  },
]

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items)

// =============================================================================
// Props
// =============================================================================

interface SettingsShellProps {
  generalSettings: GeneralSettingsData | null
  pharmacySplit: PharmacyRevenueSplitData
  opdSplit: DeptRevenueSplitData
  labSplit: DeptRevenueSplitData
  paymentMethods: CpPaymentMethod[]
  expenseHeads: CpExpenseHead[]
  xrayPartners: XrayPartnerWithSplit[]
  doctors: DoctorWithCommission[]
  staffTypes: string[]
}

// =============================================================================
// Main shell
// =============================================================================

export function SettingsShell({
  generalSettings,
  pharmacySplit,
  opdSplit,
  labSplit,
  paymentMethods,
  expenseHeads,
  xrayPartners,
  doctors,
  staffTypes,
}: SettingsShellProps) {
  const [active, setActive] = useState<SectionKey>('general')
  const activeItem = ALL_NAV_ITEMS.find((i) => i.key === active)!

  return (
    <div className="flex flex-col">

      {/* ── Tab bar ─────────────────────────────────────────────────────────────
          Underline-style, horizontal scroll, grouped with thin dividers.
          Inspired by Stripe / Linear settings navigation.
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="border-b border-border mb-8">
        <nav
          className="flex overflow-x-auto scrollbar-none"
          aria-label="Settings sections"
        >
          {NAV_GROUPS.map((group, gi) => (
            <React.Fragment key={group.label}>
              {/* Group divider — subtle vertical rule between category clusters */}
              {gi > 0 && (
                <div
                  aria-hidden="true"
                  className="mx-1 my-2 w-px shrink-0 self-stretch bg-border/60"
                />
              )}

              {group.items.map((item) => {
                const isActive = active === item.key
                return (
                  <button
                    key={item.key}
                    onClick={() => setActive(item.key)}
                    aria-selected={isActive}
                    role="tab"
                    className={cn(
                      // Layout
                      'relative flex items-center gap-2 whitespace-nowrap px-4 pb-3.5 pt-1 text-sm font-medium',
                      // Bottom border — -mb-px to overlap the container's border-b
                      'border-b-2 -mb-px transition-colors duration-150',
                      isActive
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 transition-colors',
                        isActive ? item.iconColor : 'text-muted-foreground/60'
                      )}
                    />
                    {item.tabLabel}
                  </button>
                )
              })}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* ── Section header ───────────────────────────────────────────────────── */}
      {activeItem && (
        <div className="mb-6 flex items-center gap-3">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              activeItem.iconBg
            )}
          >
            <activeItem.icon className={cn('h-4.5 w-4.5', activeItem.iconColor)} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground leading-tight">
              {activeItem.label}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug max-w-xl">
              {activeItem.subtitle}
            </p>
          </div>
        </div>
      )}

      {/* ── Section content ──────────────────────────────────────────────────── */}
      {active === 'general' && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          {generalSettings ? (
            <GeneralSettingsForm initialData={generalSettings} />
          ) : (
            <p className="text-sm text-destructive">Failed to load settings.</p>
          )}
        </div>
      )}

      {active === 'revenue' && (
        <RevenueSplitsTab
          opdSplit={opdSplit}
          labSplit={labSplit}
          pharmacySplit={pharmacySplit}
        />
      )}

      {active === 'payments' && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <PaymentMethodsManager initialMethods={paymentMethods} />
        </div>
      )}

      {active === 'partners' && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <PartnersManager initialPartners={xrayPartners} />
        </div>
      )}

      {active === 'expenses' && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <ExpenseHeadsManager initialHeads={expenseHeads} />
        </div>
      )}

      {active === 'doctors' && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <DoctorSettingsManager initialDoctors={doctors} />
        </div>
      )}

      {active === 'staff' && (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <StaffTypesManager initialTypes={staffTypes} />
        </div>
      )}
    </div>
  )
}
