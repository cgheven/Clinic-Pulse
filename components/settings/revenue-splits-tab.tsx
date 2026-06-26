'use client'

import React from 'react'
import { RevenueSplitCard } from '@/components/settings/revenue-split-card'
import type { DeptRevenueSplitData, PharmacyRevenueSplitData } from '@/app/actions/settings'
import { updateDeptRevenueSplit, updatePharmacyRevenueSplit } from '@/app/actions/settings'

// =============================================================================
// Props
// =============================================================================

interface RevenueSplitsTabProps {
  opdSplit: DeptRevenueSplitData
  labSplit: DeptRevenueSplitData
  pharmacySplit: PharmacyRevenueSplitData
}

// =============================================================================
// Component
// =============================================================================

export function RevenueSplitsTab({
  opdSplit,
  labSplit,
  pharmacySplit,
}: RevenueSplitsTabProps) {
  // OPD save handler
  async function handleSaveOpd(values: Record<string, number>) {
    const result = await updateDeptRevenueSplit('opd', {
      doctor_pct: values['doctor_pct'] ?? 5000,
      clinic_pct: values['clinic_pct'] ?? 5000,
    })
    return result
  }

  // Lab save handler
  async function handleSaveLab(values: Record<string, number>) {
    const result = await updateDeptRevenueSplit('lab', {
      doctor_pct: values['doctor_pct'] ?? 5000,
      clinic_pct: values['clinic_pct'] ?? 5000,
    })
    return result
  }

  // Pharmacy save handler
  async function handleSavePharmacy(values: Record<string, number>) {
    const result = await updatePharmacyRevenueSplit({
      doctor_pct: values['doctor_pct'] ?? 3000,
      clinic_pct: values['clinic_pct'] ?? 6000,
      staff_pct: values['staff_pct'] ?? 1000,
    })
    return result
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {/* OPD */}
      <RevenueSplitCard
        title="OPD (Outpatient)"
        description="Split of consultation fee revenue between doctor and clinic."
        fields={[
          {
            key: 'doctor_pct',
            label: 'Doctor',
            color: 'bg-primary',
            valueBp: opdSplit.doctor_pct,
          },
          {
            key: 'clinic_pct',
            label: 'Clinic',
            color: 'bg-info',
            valueBp: opdSplit.clinic_pct,
          },
        ]}
        onSave={handleSaveOpd}
      />

      {/* Lab */}
      <RevenueSplitCard
        title="Laboratory"
        description="Split of lab test revenue between doctor and clinic."
        fields={[
          {
            key: 'doctor_pct',
            label: 'Doctor',
            color: 'bg-primary',
            valueBp: labSplit.doctor_pct,
          },
          {
            key: 'clinic_pct',
            label: 'Clinic',
            color: 'bg-success',
            valueBp: labSplit.clinic_pct,
          },
        ]}
        onSave={handleSaveLab}
      />

      {/* Pharmacy */}
      <RevenueSplitCard
        title="Pharmacy"
        description="Three-way split of pharmacy sales revenue."
        fields={[
          {
            key: 'doctor_pct',
            label: 'Doctor',
            color: 'bg-primary',
            valueBp: pharmacySplit.doctor_pct,
          },
          {
            key: 'clinic_pct',
            label: 'Clinic',
            color: 'bg-info',
            valueBp: pharmacySplit.clinic_pct,
          },
          {
            key: 'staff_pct',
            label: 'Staff',
            color: 'bg-success',
            valueBp: pharmacySplit.staff_pct,
          },
        ]}
        onSave={handleSavePharmacy}
      />
    </div>
  )
}
