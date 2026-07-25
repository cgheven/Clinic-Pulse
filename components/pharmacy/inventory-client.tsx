'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Search, PlusCircle, Filter, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InventoryTable } from '@/components/pharmacy/inventory-table'
import type { CpPharmacyInventory } from '@/types/index'

// =============================================================================
// Interactive shell for /pharmacy/inventory
//
// Rows are fetched on the server (see page.tsx) and handed down as props, so
// there is no client -> server -> client round-trip on mount. This component
// only owns the search box text and the URL updates that drive navigation.
// =============================================================================

interface InventoryClientProps {
  items: CpPharmacyInventory[]
  totalCount: number
  page: number
  pageSize: number
  searchQuery: string
  isLowStockFilter: boolean
}

export function InventoryClient({
  items,
  totalCount,
  page,
  pageSize,
  searchQuery,
  isLowStockFilter,
}: InventoryClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [localSearch, setLocalSearch] = useState(searchQuery)

  // Keep the input in sync when the URL changes (back/forward, clear, etc.).
  // Adjusting state during render rather than in an effect avoids the extra
  // render pass the old useEffect-based sync caused.
  const [syncedSearch, setSyncedSearch] = useState(searchQuery)
  if (syncedSearch !== searchQuery) {
    setSyncedSearch(searchQuery)
    setLocalSearch(searchQuery)
  }

  // ── URL helpers ───────────────────────────────────────────────────────────
  function updateURL(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateURL({ search: localSearch, page: '1' })
  }

  function clearSearch() {
    setLocalSearch('')
    updateURL({ search: null, page: '1' })
  }

  function toggleLowStockFilter() {
    updateURL({ filter: isLowStockFilter ? null : 'low_stock', page: '1' })
  }

  function handlePageChange(newPage: number) {
    updateURL({ page: String(newPage) })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-bold text-foreground sm:text-xl">Inventory</h1>

        <Button asChild size="sm">
          <Link href="/pharmacy/inventory/new">
            <PlusCircle className="mr-1.5 h-4 w-4" />
            Add Medicine
          </Link>
        </Button>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search by medicine name…"
            className="pl-9 pr-9"
          />
          {localSearch && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        <button
          onClick={toggleLowStockFilter}
          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
            isLowStockFilter
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
              : 'border-border bg-card text-muted-foreground hover:border-border hover:text-foreground'
          }`}
        >
          <Filter className="h-4 w-4" />
          Low Stock
          {isLowStockFilter && (
            <X className="h-3.5 w-3.5 opacity-70" />
          )}
        </button>
      </div>

      {/* Active filters */}
      {(searchQuery || isLowStockFilter) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          {searchQuery && (
            <Badge
              variant="secondary"
              className="gap-1 pr-1.5"
            >
              Search: &quot;{searchQuery}&quot;
              <button
                onClick={clearSearch}
                className="ml-1 rounded-sm opacity-70 hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {isLowStockFilter && (
            <Badge
              variant="warning"
              className="gap-1 pr-1.5"
            >
              Low Stock Only
              <button
                onClick={() => updateURL({ filter: null })}
                className="ml-1 rounded-sm opacity-70 hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Table */}
      <InventoryTable
        items={items}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
      />
    </div>
  )
}
