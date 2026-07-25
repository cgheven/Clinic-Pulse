import { getTestCatalog } from '@/app/actions/lab'
import { getActivePaymentMethods } from '@/app/actions/opd'
import { NewTestForm } from '@/components/lab/new-test-form'

// =============================================================================
// Page
//
// Mirrors app/(dashboard)/opd/visits/new/page.tsx: the two dropdown data sets
// are fetched on the server and passed in, so the form is usable as soon as it
// paints instead of sitting disabled behind a mount-effect round-trip.
// =============================================================================

export default async function NewTestPage() {
  const [testsRes, pmRes] = await Promise.all([
    getTestCatalog(),
    getActivePaymentMethods(),
  ])

  const tests = testsRes.success ? testsRes.data : []
  const paymentMethods = pmRes.success ? pmRes.data : []

  return (
    <NewTestForm initialTests={tests} initialPaymentMethods={paymentMethods} />
  )
}
