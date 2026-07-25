import { AlertTriangle } from 'lucide-react'
import { getEquipment } from '@/app/actions/lab'
import { EquipmentManager } from '@/components/lab/equipment-manager'

// =============================================================================
// Page
//
// Server-rendered (same shape as app/(dashboard)/lab/chemicals/page.tsx): the
// equipment grid ships in the initial HTML instead of being fetched from a
// mount effect, which previously cost a second round-trip and a spinner.
// =============================================================================

export default async function LabEquipmentPage() {
  const result = await getEquipment()

  if (!result.success) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive">{result.error}</p>
      </div>
    )
  }

  return <EquipmentManager initialMachines={result.data} />
}
