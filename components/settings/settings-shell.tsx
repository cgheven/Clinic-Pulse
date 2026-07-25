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
  label: string
  tabLabel: string
  subtitle: string
  icon: React.ElementType
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
        subtitle: 'Configure how revenue is split between doctors, clinic and staff.',
        icon: PieChart,
        iconColor: 'text-info',
      },
      {
        key: 'payments',
        label: 'Payment Methods',
        tabLabel: 'Payments',
        subtitle: 'Enable or disable accepted payment methods across all departments.',
        icon: CreditCard,
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
        subtitle: 'Manage X-ray revenue-sharing partners and split percentages.',
        icon: Users,
        iconColor: 'text-purple-500',
      },
      {
        key: 'expenses',
        label: 'Expense Heads',
        tabLabel: 'Expenses',
        subtitle: 'Configure expense categories used across all departments.',
        icon: Receipt,
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
        iconColor: 'text-cyan-500',
      },
      {
        key: 'staff',
        label: 'Staff Types',
        tabLabel: 'Staff',
        subtitle: 'Define available staff designation types for the clinic.',
        icon: UserCog,
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
// Panel wrapper helpers
// =============================================================================

function SectionPanel({
  title,
  children,
  noPad = false,
}: {
  title: string
  children: React.ReactNode
  noPad?: boolean
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border bg-muted/20 px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
      </div>
      {noPad ? children : <div className="px-4 py-4">{children}</div>}
    </div>
  )
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
  ALL_NAV_ITEMS.find((i) => i.key === active)

  return (
    <div className="space-y-3">

      {/* ── Tab bar ───────────────────────────────────────────────────────────── */}
      <div className="border-b border-border">
        <nav
          className="flex overflow-x-auto scrollbar-none"
          aria-label="Settings sections"
        >
          {NAV_GROUPS.map((group, gi) => (
            <React.Fragment key={group.label}>
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
                      'relative flex items-center gap-2 whitespace-nowrap px-4 pb-3.5 pt-1 text-sm font-medium',
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

      {/* ── Section content ──────────────────────────────────────────────────── */}

      {active === 'general' && (
        <SectionPanel title="General Settings">
          {generalSettings ? (
            <GeneralSettingsForm initialData={generalSettings} />
          ) : (
            <p className="text-sm text-destructive">Failed to load settings.</p>
          )}
        </SectionPanel>
      )}

      {active === 'revenue' && (
        <SectionPanel title="Revenue Splits">
          <RevenueSplitsTab
            opdSplit={opdSplit}
            labSplit={labSplit}
            pharmacySplit={pharmacySplit}
          />
        </SectionPanel>
      )}

      {active === 'payments' && (
        <SectionPanel title="Payment Methods" noPad>
          <PaymentMethodsManager initialMethods={paymentMethods} />
        </SectionPanel>
      )}

      {active === 'partners' && (
        <SectionPanel title="X-Ray Partners">
          <PartnersManager initialPartners={xrayPartners} />
        </SectionPanel>
      )}

      {active === 'expenses' && (
        <SectionPanel title="Expense Heads">
          <ExpenseHeadsManager initialHeads={expenseHeads} />
        </SectionPanel>
      )}

      {active === 'doctors' && (
        <SectionPanel title="Doctor Settings">
          <DoctorSettingsManager initialDoctors={doctors} />
        </SectionPanel>
      )}

      {active === 'staff' && (
        <SectionPanel title="Staff Types">
          <StaffTypesManager initialTypes={staffTypes} />
        </SectionPanel>
      )}
    </div>
  )
}
