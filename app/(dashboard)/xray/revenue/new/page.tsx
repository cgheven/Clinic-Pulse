import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { RevenueForm } from '@/components/xray/revenue-form'
import { getTodayPKT } from '@/lib/utils'
import type { CpPaymentMethod } from '@/types/index'

export const metadata: Metadata = {
  title: 'Record X-Ray Revenue — ClinicPulse',
}

export default async function NewXrayRevenuePage() {
  await requireAuth()

  const today = getTodayPKT()
  const supabase = await createClient()

  const { data: methodsData } = await supabase
    .from('cp_payment_methods')
    .select('*')
    .eq('is_enabled', true)
    .order('sort_order', { ascending: true })

  const paymentMethods = (methodsData ?? []) as CpPaymentMethod[]

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {/* ── Back + title ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link
          href="/xray/revenue"
          className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Revenue Log
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <h1 className="text-lg font-bold text-foreground sm:text-xl">Record Revenue</h1>
      </div>

      {/* ── Unified form card ───────────────────────────────────────────────────── */}
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border pb-3 pt-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            Service Details
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <RevenueForm paymentMethods={paymentMethods} defaultDate={today} />
        </CardContent>
      </Card>
    </div>
  )
}
