import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

  // Load active payment methods for the form
  const { data: methodsData } = await supabase
    .from('cp_payment_methods')
    .select('*')
    .eq('is_enabled', true)
    .order('sort_order', { ascending: true })

  const paymentMethods = (methodsData ?? []) as CpPaymentMethod[]

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* ── Back navigation ─────────────────────────────────────────────────── */}
      <Link
        href="/xray/revenue"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Revenue Log
      </Link>

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Record X-Ray Revenue</h1>
          <p className="text-sm text-muted-foreground">
            Log a new X-ray service entry
          </p>
        </div>
      </div>

      {/* ── Form card ────────────────────────────────────────────────────────── */}
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base">Service Details</CardTitle>
          <CardDescription>
            Enter the patient, service type, amount and payment information.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <RevenueForm
            paymentMethods={paymentMethods}
            defaultDate={today}
          />
        </CardContent>
      </Card>
    </div>
  )
}
