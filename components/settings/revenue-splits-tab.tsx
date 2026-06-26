'use client'

import React from 'react'
import { Stethoscope, FlaskConical, ShoppingCart } from 'lucide-react'
import { RevenueSplitCard } from '@/components/settings/revenue-split-card'
import type { DeptRevenueSplitData, PharmacyRevenueSplitData } from '@/app/actions/settings'
import { updateDeptRevenueSplit, updatePharmacyRevenueSplit } from '@/app/actions/settings'

// Premium muted palette — chosen to work as a harmonious triad on dark backgrounds.
// Avoids electric blue / lime green that clash at full saturation.
const C = {
  doctor: '#F5A623', // amber gold  — brand primary, prominent
  clinic: '#94a3b8', // slate-400   — cool, sophisticated, pairs with amber
  staff:  '#a78bfa', // violet-400  — premium purple accent
}

interface RevenueSplitsTabProps {
  opdSplit: DeptRevenueSplitData
  labSplit: DeptRevenueSplitData
  pharmacySplit: PharmacyRevenueSplitData
}

export function RevenueSplitsTab({ opdSplit, labSplit, pharmacySplit }: RevenueSplitsTabProps) {
  async function handleSaveOpd(values: Record<string, number>) {
    return updateDeptRevenueSplit('opd', {
      doctor_pct: values['doctor_pct'] ?? 5000,
      clinic_pct: values['clinic_pct'] ?? 5000,
    })
  }

  async function handleSaveLab(values: Record<string, number>) {
    return updateDeptRevenueSplit('lab', {
      doctor_pct: values['doctor_pct'] ?? 5000,
      clinic_pct: values['clinic_pct'] ?? 5000,
    })
  }

  async function handleSavePharmacy(values: Record<string, number>) {
    return updatePharmacyRevenueSplit({
      doctor_pct: values['doctor_pct'] ?? 3000,
      clinic_pct: values['clinic_pct'] ?? 6000,
      staff_pct:  values['staff_pct']  ?? 1000,
    })
  }

  return (
    // 3-column grid on md+ — all departments visible simultaneously for easy comparison.
    // On small screens collapses to a single column.
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <RevenueSplitCard
        title="OPD"
        description="Consultation fee split"
        icon={Stethoscope}
        fields={[
          { key: 'doctor_pct', label: 'Doctor', color: C.doctor, valueBp: opdSplit.doctor_pct },
          { key: 'clinic_pct', label: 'Clinic',  color: C.clinic, valueBp: opdSplit.clinic_pct },
        ]}
        onSave={handleSaveOpd}
      />

      <RevenueSplitCard
        title="Laboratory"
        description="Lab test revenue split"
        icon={FlaskConical}
        fields={[
          { key: 'doctor_pct', label: 'Doctor', color: C.doctor, valueBp: labSplit.doctor_pct },
          { key: 'clinic_pct', label: 'Clinic',  color: C.clinic, valueBp: labSplit.clinic_pct },
        ]}
        onSave={handleSaveLab}
      />

      <RevenueSplitCard
        title="Pharmacy"
        description="Three-way sales split"
        icon={ShoppingCart}
        fields={[
          { key: 'doctor_pct', label: 'Doctor', color: C.doctor, valueBp: pharmacySplit.doctor_pct },
          { key: 'clinic_pct', label: 'Clinic',  color: C.clinic, valueBp: pharmacySplit.clinic_pct },
          { key: 'staff_pct',  label: 'Staff',   color: C.staff,  valueBp: pharmacySplit.staff_pct  },
        ]}
        onSave={handleSavePharmacy}
      />
    </div>
  )
}
