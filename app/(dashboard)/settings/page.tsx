import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Toaster } from '@/components/ui/toaster'

// Data fetching
import {
  getGeneralSettings,
  getPharmacyRevenueSplit,
  getDeptRevenueSplit,
  getPaymentMethods,
  getExpenseHeads,
  getXrayPartners,
  getDoctorSettings,
  getStaffTypes,
} from '@/app/actions/settings'

// Components
import { GeneralSettingsForm } from '@/components/settings/general-settings-form'
import { RevenueSplitCard } from '@/components/settings/revenue-split-card'
import { RevenueSplitsTab } from '@/components/settings/revenue-splits-tab'
import { PartnersManager } from '@/components/settings/partners-manager'
import { ExpenseHeadsManager } from '@/components/settings/expense-heads-manager'
import { PaymentMethodsManager } from '@/components/settings/payment-methods-manager'
import { DoctorSettingsManager } from '@/components/settings/doctor-settings-manager'
import { StaffTypesManager } from '@/components/settings/staff-types-manager'
import { Settings, Building2, PieChart, Users, Receipt, CreditCard, Stethoscope, UserCog } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Settings — ClinicPulse',
}

// =============================================================================
// Tab config
// =============================================================================

const TABS = [
  { value: 'general', label: 'General', icon: Building2 },
  { value: 'revenue', label: 'Revenue Splits', icon: PieChart },
  { value: 'partners', label: 'X-Ray Partners', icon: Users },
  { value: 'expenses', label: 'Expense Heads', icon: Receipt },
  { value: 'payments', label: 'Payment Methods', icon: CreditCard },
  { value: 'doctors', label: 'Doctor Settings', icon: Stethoscope },
  { value: 'staff', label: 'Staff Types', icon: UserCog },
] as const

// =============================================================================
// Page
// =============================================================================

export default async function SettingsPage() {
  await requireAdmin()

  // Fetch all data in parallel
  const [
    generalResult,
    pharmacySplitResult,
    opdSplitResult,
    labSplitResult,
    paymentMethodsResult,
    expenseHeadsResult,
    xrayPartnersResult,
    doctorsResult,
    staffTypesResult,
  ] = await Promise.all([
    getGeneralSettings(),
    getPharmacyRevenueSplit(),
    getDeptRevenueSplit('opd'),
    getDeptRevenueSplit('lab'),
    getPaymentMethods(),
    getExpenseHeads(),
    getXrayPartners(),
    getDoctorSettings(),
    getStaffTypes(),
  ])

  const generalSettings = generalResult.success ? generalResult.data : null
  const pharmacySplit = pharmacySplitResult.success ? pharmacySplitResult.data : null
  const opdSplit = opdSplitResult.success ? opdSplitResult.data : { doctor_pct: 5000, clinic_pct: 5000 }
  const labSplit = labSplitResult.success ? labSplitResult.data : { doctor_pct: 5000, clinic_pct: 5000 }
  const paymentMethods = paymentMethodsResult.success ? paymentMethodsResult.data : []
  const expenseHeads = expenseHeadsResult.success ? expenseHeadsResult.data : []
  const xrayPartners = xrayPartnersResult.success ? xrayPartnersResult.data : []
  const doctors = doctorsResult.success ? doctorsResult.data : []
  const staffTypes = staffTypesResult.success ? staffTypesResult.data : []

  return (
    <>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage clinic configuration, revenue splits, and system preferences
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="general" className="space-y-4">
          {/* Tab list */}
          <TabsList className="flex h-auto flex-wrap gap-1 bg-muted/40 p-1">
            {TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex items-center gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── General ─────────────────────────────────────────────────── */}
          <TabsContent value="general">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">General Settings</CardTitle>
                <CardDescription>
                  Clinic name, contact info, working days and currency preferences.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {generalSettings ? (
                  <GeneralSettingsForm initialData={generalSettings} />
                ) : (
                  <p className="text-sm text-destructive">Failed to load general settings.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Revenue Splits ──────────────────────────────────────────── */}
          <TabsContent value="revenue">
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">Revenue Splits</h2>
                <p className="text-sm text-muted-foreground">
                  Configure how revenue is distributed between doctors, clinic and staff.
                  All percentages must total 100%.
                </p>
              </div>

              <RevenueSplitsTab
                opdSplit={opdSplit}
                labSplit={labSplit}
                pharmacySplit={
                  pharmacySplit ?? { id: '', doctor_pct: 3000, clinic_pct: 6000, staff_pct: 1000, effective_from: '' }
                }
              />
            </div>
          </TabsContent>

          {/* ── X-Ray Partners ──────────────────────────────────────────── */}
          <TabsContent value="partners">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">X-Ray Partners</CardTitle>
                <CardDescription>
                  Manage X-ray revenue-sharing partners and their default split percentages.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PartnersManager initialPartners={xrayPartners} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Expense Heads ───────────────────────────────────────────── */}
          <TabsContent value="expenses">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Expense Heads</CardTitle>
                <CardDescription>
                  Configure expense categories used across all departments.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExpenseHeadsManager initialHeads={expenseHeads} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Payment Methods ─────────────────────────────────────────── */}
          <TabsContent value="payments">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Payment Methods</CardTitle>
                <CardDescription>
                  Enable or disable accepted payment methods across the clinic.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentMethodsManager initialMethods={paymentMethods} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Doctor Settings ─────────────────────────────────────────── */}
          <TabsContent value="doctors">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Doctor Settings</CardTitle>
                <CardDescription>
                  Configure earning models, commission rates and monthly salaries per doctor.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DoctorSettingsManager initialDoctors={doctors} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Staff Types ─────────────────────────────────────────────── */}
          <TabsContent value="staff">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">Staff Types</CardTitle>
                <CardDescription>
                  Define available staff designation types for the clinic.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StaffTypesManager initialTypes={staffTypes} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Toaster />
    </>
  )
}
