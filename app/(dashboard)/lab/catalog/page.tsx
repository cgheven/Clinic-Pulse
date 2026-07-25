import { AlertTriangle } from 'lucide-react'
import { getTestCatalog } from '@/app/actions/lab'
import { TestCatalogManager } from '@/components/lab/test-catalog-manager'

// =============================================================================
// Page
//
// Server-rendered (same shape as app/(dashboard)/lab/chemicals/page.tsx): the
// catalog rows ship in the initial HTML instead of being fetched from a mount
// effect, which previously cost a second round-trip and a full-page spinner.
// =============================================================================

export default async function LabCatalogPage() {
  const result = await getTestCatalog()

  if (!result.success) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive">{result.error}</p>
      </div>
    )
  }

  return <TestCatalogManager initialTests={result.data} />
}
