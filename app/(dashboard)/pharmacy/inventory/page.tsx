import { getInventory } from '@/app/actions/pharmacy'
import { InventoryClient } from '@/components/pharmacy/inventory-client'

// =============================================================================
// Page
//
// Server-rendered: the inventory rows are in the initial HTML instead of being
// fetched from a mount effect (which cost a full client -> server -> client
// round-trip on every visit, search, filter toggle and page change).
// =============================================================================

const PAGE_SIZE = 20

interface PageProps {
  searchParams: Promise<{ search?: string; filter?: string; page?: string }>
}

export default async function PharmacyInventoryPage({ searchParams }: PageProps) {
  const params = await searchParams

  const searchQuery = params.search ?? ''
  const isLowStockFilter = (params.filter ?? '') === 'low_stock'
  const page = parseInt(params.page ?? '1', 10)

  const result = await getInventory({
    search: searchQuery || undefined,
    lowStock: isLowStockFilter || undefined,
    page,
    pageSize: PAGE_SIZE,
  })

  const items = result.success ? result.data.data : []
  const totalCount = result.success ? result.data.count : 0

  return (
    <InventoryClient
      items={items}
      totalCount={totalCount}
      page={page}
      pageSize={PAGE_SIZE}
      searchQuery={searchQuery}
      isLowStockFilter={isLowStockFilter}
    />
  )
}
