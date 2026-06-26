import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth'
import { Toaster } from '@/components/ui/toaster'

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

import { SettingsShell } from '@/components/settings/settings-shell'

export const metadata: Metadata = {
  title: 'Settings — ClinicPulse',
}

export default async function SettingsPage() {
  await requireAdmin()

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

  return (
    <>
      <div className="pb-10">
        <SettingsShell
          generalSettings={generalResult.success ? generalResult.data : null}
          pharmacySplit={
            pharmacySplitResult.success
              ? pharmacySplitResult.data
              : { id: '', doctor_pct: 3000, clinic_pct: 6000, staff_pct: 1000, effective_from: '' }
          }
          opdSplit={opdSplitResult.success ? opdSplitResult.data : { doctor_pct: 5000, clinic_pct: 5000 }}
          labSplit={labSplitResult.success ? labSplitResult.data : { doctor_pct: 5000, clinic_pct: 5000 }}
          paymentMethods={paymentMethodsResult.success ? paymentMethodsResult.data : []}
          expenseHeads={expenseHeadsResult.success ? expenseHeadsResult.data : []}
          xrayPartners={xrayPartnersResult.success ? xrayPartnersResult.data : []}
          doctors={doctorsResult.success ? doctorsResult.data : []}
          staffTypes={staffTypesResult.success ? staffTypesResult.data : []}
        />
      </div>

      <Toaster />
    </>
  )
}
