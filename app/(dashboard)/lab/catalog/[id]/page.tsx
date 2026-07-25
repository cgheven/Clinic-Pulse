import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import { getTestCatalog, getTestParameters } from '@/app/actions/lab'
import { ParameterEditor } from '@/components/lab/parameter-editor'

interface PageProps {
  params: Promise<{ id: string }>
}

async function ParameterContent({ id }: { id: string }) {
  const [catalogRes, paramsRes] = await Promise.all([
    getTestCatalog(),
    getTestParameters(id),
  ])

  if (!catalogRes.success) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2.5">
        <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
        <p className="text-sm text-destructive">{catalogRes.error}</p>
      </div>
    )
  }

  const test = catalogRes.data.find((t) => t.id === id)
  if (!test) notFound()

  // Every specialty already in use, so the picker offers the existing
  // vocabulary rather than making the user retype names.
  const knownSpecialties = Array.from(
    new Set(catalogRes.data.flatMap((t) => t.specialties ?? []))
  ).sort((a, b) => a.localeCompare(b))

  if (!paramsRes.success) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2.5">
        <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
        <p className="text-sm text-destructive">{paramsRes.error}</p>
      </div>
    )
  }

  return (
    <ParameterEditor
      test={test}
      initialParameters={paramsRes.data}
      knownSpecialties={knownSpecialties}
    />
  )
}

export default async function TestParametersPage({ params }: PageProps) {
  await requireAuth()
  const { id } = await params

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/lab/catalog"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-border/80 hover:text-foreground"
          aria-label="Back to catalog"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">
            Test Catalog
          </p>
          <h1 className="text-lg font-bold text-foreground sm:text-xl">Parameters</h1>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-xl border border-border bg-card" />
            <div className="h-72 animate-pulse rounded-xl border border-border bg-card" />
          </div>
        }
      >
        <ParameterContent id={id} />
      </Suspense>
    </div>
  )
}
