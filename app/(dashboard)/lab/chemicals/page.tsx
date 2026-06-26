import type { Metadata } from 'next'
import { getChemicals } from '@/app/actions/lab'
import { ChemicalInventory } from '@/components/lab/chemical-inventory'
import { AlertTriangle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Lab Chemicals',
}

export default async function LabChemicalsPage() {
  const result = await getChemicals()

  if (!result.success) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive">{result.error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Chemical Inventory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track reagents and consumables — adjust stock levels as needed
        </p>
      </div>

      <ChemicalInventory initialChemicals={result.data} />
    </div>
  )
}
