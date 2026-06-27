import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How It Works — ClinicPulse',
  description: 'Complete workflow guide for ClinicPulse clinic management system.',
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Section({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      {children}
    </section>
  )
}

function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div
      className="rounded-2xl border p-6"
      style={{
        background: '#111118',
        borderColor: accent ? `${accent}30` : '#ffffff12',
        boxShadow: accent ? `0 0 0 1px ${accent}18 inset` : undefined,
      }}
    >
      {children}
    </div>
  )
}

function StepBadge({ n, color }: { n: number; color: string }) {
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
      style={{ background: `${color}22`, color }}
    >
      {n}
    </span>
  )
}

function Tag({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
      style={{ background: `${color}22`, color }}
    >
      {children}
    </span>
  )
}

function SectionHeader({
  emoji,
  title,
  subtitle,
  color,
}: {
  emoji: string
  title: string
  subtitle: string
  color: string
}) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
        style={{ background: `${color}18` }}
      >
        {emoji}
      </div>
      <div>
        <h2 className="text-xl font-bold" style={{ color }}>
          {title}
        </h2>
        <p className="mt-0.5 text-sm" style={{ color: '#7c7c9a' }}>
          {subtitle}
        </p>
      </div>
    </div>
  )
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

const NAV = [
  { href: '#overview', label: 'Overview' },
  { href: '#opd', label: 'OPD' },
  { href: '#pharmacy', label: 'Pharmacy' },
  { href: '#lab', label: 'Laboratory' },
  { href: '#xray', label: 'X-Ray' },
  { href: '#finance', label: 'Finance' },
  { href: '#roles', label: 'User Roles' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkflowPage() {
  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', color: '#f0f0f5' }}>
      {/* Sticky nav */}
      <nav
        className="sticky top-0 z-50 border-b"
        style={{ background: '#0a0a0fcc', borderColor: '#ffffff12', backdropFilter: 'blur(12px)' }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold" style={{ color: '#F5A623' }}>
              ClinicPulse
            </span>
            <span className="text-sm" style={{ color: '#7c7c9a' }}>
              / Workflow Guide
            </span>
          </div>
          <div className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
                style={{ color: '#7c7c9a' }}
              >
                {n.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl space-y-16 px-6 py-14">
        {/* Hero */}
        <div className="text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
            style={{ background: '#F5A62318' }}
          >
            🏥
          </div>
          <h1 className="text-4xl font-bold tracking-tight" style={{ color: '#f0f0f5' }}>
            ClinicPulse — Complete Workflow
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base" style={{ color: '#7c7c9a' }}>
            A step-by-step guide to every module in ClinicPulse — from registering a patient to
            generating end-of-month financial reports.
          </p>
        </div>

        {/* ── Overview ── */}
        <Section id="overview">
          <h2 className="mb-6 text-2xl font-bold" style={{ color: '#F5A623' }}>
            System Overview
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { emoji: '🩺', label: 'OPD', desc: 'Patients, visits, doctor assignments, commissions', color: '#3b82f6' },
              { emoji: '💊', label: 'Pharmacy', desc: 'Drug inventory, sales, stock tracking', color: '#10b981' },
              { emoji: '🧪', label: 'Laboratory', desc: 'Test catalog, results, revenue splits', color: '#8b5cf6' },
              { emoji: '🔬', label: 'X-Ray', desc: 'Revenue tracking, partner payouts', color: '#06b6d4' },
              { emoji: '💰', label: 'Finance', desc: 'Expenses, salary payments, all reports', color: '#f59e0b' },
              { emoji: '⚙️', label: 'Settings', desc: 'Clinic info, users, doctors, expense heads', color: '#6b7280' },
            ].map((m) => (
              <Card key={m.label} accent={m.color}>
                <div className="mb-2 text-2xl">{m.emoji}</div>
                <p className="font-semibold" style={{ color: m.color }}>
                  {m.label}
                </p>
                <p className="mt-1 text-sm" style={{ color: '#7c7c9a' }}>
                  {m.desc}
                </p>
              </Card>
            ))}
          </div>

          {/* Role legend */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Tag color="#F5A623">Admin</Tag>
            <span className="text-sm" style={{ color: '#7c7c9a' }}>
              Full access to all modules, settings, and financial records.
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            <Tag color="#3b82f6">Accountant</Tag>
            <span className="text-sm" style={{ color: '#7c7c9a' }}>
              Access to OPD, Pharmacy, Lab, X-Ray, Finance. No Settings access.
            </span>
          </div>
        </Section>

        {/* ── OPD ── */}
        <Section id="opd">
          <Card accent="#3b82f6">
            <SectionHeader
              emoji="🩺"
              title="OPD — Outpatient Department"
              subtitle="Core patient flow from registration to visit recording"
              color="#3b82f6"
            />

            <div className="space-y-8">
              {/* Patient Registration */}
              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: '#3b82f6' }}>
                  Step 1 — Register a Patient
                </p>
                <div className="space-y-2 pl-2">
                  {[
                    'Go to OPD → Patients → New Patient',
                    'Enter name, phone, CNIC, date of birth, gender, blood group, address',
                    'A unique Patient ID is auto-assigned (e.g. P-001)',
                    'The patient now appears in the patient list and can be searched by name, phone, or CNIC',
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <StepBadge n={i + 1} color="#3b82f6" />
                      <p className="pt-0.5 text-sm" style={{ color: '#c8c8d4' }}>{s}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* New Visit */}
              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: '#3b82f6' }}>
                  Step 2 — Record a Visit
                </p>
                <div className="space-y-2 pl-2">
                  {[
                    'Open the patient profile → click "New Visit"',
                    'Select the attending doctor (optional)',
                    'Set the visit date (today\'s date is pre-filled in Pakistan Time)',
                    'Enter diagnosis, prescription, and clinical notes',
                    'Set consultation fee (PKR) and payment method (Cash / JazzCash / Easypaisa / Bank Transfer)',
                    'Click "Record Visit" — the visit is saved and appears in the patient\'s visit history',
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <StepBadge n={i + 1} color="#3b82f6" />
                      <p className="pt-0.5 text-sm" style={{ color: '#c8c8d4' }}>{s}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Doctors */}
              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: '#3b82f6' }}>
                  Step 3 — Doctor Earnings
                </p>
                <div className="space-y-2 pl-2">
                  {[
                    'Go to OPD → Doctors to see all doctors with today\'s visit count and revenue',
                    'Each doctor has an earning model: Commission (% of fees collected) or Salaried (fixed monthly)',
                    'Commission doctors: earnings = total fees × commission % — updated live as visits are recorded',
                    'Open a doctor\'s profile to see monthly earnings breakdown with per-day visit log',
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <StepBadge n={i + 1} color="#3b82f6" />
                      <p className="pt-0.5 text-sm" style={{ color: '#c8c8d4' }}>{s}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div
                className="rounded-xl border p-4"
                style={{ background: '#3b82f608', borderColor: '#3b82f620' }}
              >
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: '#3b82f6' }}>
                  Key Rules
                </p>
                <ul className="space-y-1 text-sm" style={{ color: '#7c7c9a' }}>
                  <li>• Visit dates cannot be set more than 30 days in the past or in the future</li>
                  <li>• Deleting a patient also removes all their visits (revenue updates automatically)</li>
                  <li>• Individual visits can also be deleted from the patient profile</li>
                  <li>• Only Admins can add, deactivate, or delete doctors and patients</li>
                </ul>
              </div>
            </div>
          </Card>
        </Section>

        {/* ── Pharmacy ── */}
        <Section id="pharmacy">
          <Card accent="#10b981">
            <SectionHeader
              emoji="💊"
              title="Pharmacy"
              subtitle="Drug inventory management and point-of-sale"
              color="#10b981"
            />
            <div className="space-y-6">
              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: '#10b981' }}>
                  Inventory Setup
                </p>
                <div className="space-y-2 pl-2">
                  {[
                    'Go to Pharmacy → Inventory → Add Item',
                    'Enter drug name, generic name, cost price, sale price, and initial stock quantity',
                    'Items with low or zero stock are flagged automatically',
                    'Stock is reduced automatically when a sale is recorded',
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <StepBadge n={i + 1} color="#10b981" />
                      <p className="pt-0.5 text-sm" style={{ color: '#c8c8d4' }}>{s}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: '#10b981' }}>
                  Recording a Sale
                </p>
                <div className="space-y-2 pl-2">
                  {[
                    'Go to Pharmacy → Sales → New Sale',
                    'Search and select the patient (optional)',
                    'Add line items: select drug, enter quantity — unit price and total auto-calculate',
                    'Apply discount if applicable, select payment method, and confirm',
                    'Stock is deducted and revenue is recorded in Finance reports',
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <StepBadge n={i + 1} color="#10b981" />
                      <p className="pt-0.5 text-sm" style={{ color: '#c8c8d4' }}>{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </Section>

        {/* ── Lab ── */}
        <Section id="lab">
          <Card accent="#8b5cf6">
            <SectionHeader
              emoji="🧪"
              title="Laboratory"
              subtitle="Test catalog, sample logging, and revenue splits"
              color="#8b5cf6"
            />
            <div className="space-y-6">
              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: '#8b5cf6' }}>
                  Setup
                </p>
                <div className="space-y-2 pl-2">
                  {[
                    'Go to Lab → Catalog to add available tests with their prices',
                    'Go to Lab → Chemicals to track reagent/chemical stock',
                    'Go to Lab → Equipment to log machinery and maintenance records',
                    'Configure the doctor/clinic revenue split % in Settings',
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <StepBadge n={i + 1} color="#8b5cf6" />
                      <p className="pt-0.5 text-sm" style={{ color: '#c8c8d4' }}>{s}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: '#8b5cf6' }}>
                  Daily Workflow
                </p>
                <div className="space-y-2 pl-2">
                  {[
                    'Go to Lab → Tests → Log Test',
                    'Select patient, referring doctor, and test(s) from the catalog',
                    'Record payment — the fee is split between the doctor and clinic per the configured %',
                    'View monthly revenue, doctor payout, and clinic share on the Lab Overview',
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <StepBadge n={i + 1} color="#8b5cf6" />
                      <p className="pt-0.5 text-sm" style={{ color: '#c8c8d4' }}>{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </Section>

        {/* ── X-Ray ── */}
        <Section id="xray">
          <Card accent="#06b6d4">
            <SectionHeader
              emoji="🔬"
              title="X-Ray"
              subtitle="Revenue recording and partner payout calculation"
              color="#06b6d4"
            />
            <div className="space-y-6">
              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: '#06b6d4' }}>
                  Setup Partners
                </p>
                <div className="space-y-2 pl-2">
                  {[
                    'Go to X-Ray → Partners → Add Partner',
                    'Each partner has a split percentage (e.g. Clinic 60%, Dr. Ahmed 40%)',
                    'All partner splits must add up to exactly 100%',
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <StepBadge n={i + 1} color="#06b6d4" />
                      <p className="pt-0.5 text-sm" style={{ color: '#c8c8d4' }}>{s}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: '#06b6d4' }}>
                  Daily Workflow
                </p>
                <div className="space-y-2 pl-2">
                  {[
                    'Go to X-Ray → Revenue → Add Entry',
                    'Enter patient name, scan type, date, and total amount collected',
                    'ClinicPulse automatically calculates each partner\'s payout share',
                    'View the monthly payout summary per partner in X-Ray → Partners',
                    'Record X-Ray expenses (maintenance, consumables) under X-Ray → Expenses',
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <StepBadge n={i + 1} color="#06b6d4" />
                      <p className="pt-0.5 text-sm" style={{ color: '#c8c8d4' }}>{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </Section>

        {/* ── Finance ── */}
        <Section id="finance">
          <Card accent="#f59e0b">
            <SectionHeader
              emoji="💰"
              title="Finance"
              subtitle="Expenses, salary payments, and cross-module reports"
              color="#f59e0b"
            />
            <div className="space-y-6">
              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: '#f59e0b' }}>
                  Recording Expenses
                </p>
                <div className="space-y-2 pl-2">
                  {[
                    'Go to Finance → Expenses → Add Expense',
                    'Select the expense head (Rent, Utilities, Salaries, Supplies, etc.)',
                    'Custom expense heads can be created in Settings → Expense Heads',
                    'Enter amount, date, and optional notes',
                    'Expenses older than 30 days cannot be backdated',
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <StepBadge n={i + 1} color="#f59e0b" />
                      <p className="pt-0.5 text-sm" style={{ color: '#c8c8d4' }}>{s}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: '#f59e0b' }}>
                  Salary Payments
                </p>
                <div className="space-y-2 pl-2">
                  {[
                    'Go to Finance → Payments to record staff salary disbursements',
                    'Select the staff member, payment month, and amount paid',
                    'Salaried doctors\' payments are tracked here separately from commission',
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <StepBadge n={i + 1} color="#f59e0b" />
                      <p className="pt-0.5 text-sm" style={{ color: '#c8c8d4' }}>{s}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: '#f59e0b' }}>
                  Reports
                </p>
                <div className="space-y-2 pl-2">
                  {[
                    'Go to Reports → All Reports for a consolidated monthly view',
                    'OPD revenue, pharmacy sales, lab revenue, and X-Ray revenue are combined',
                    'Expenses are subtracted to show net profit',
                    'Doctor commission and salary payments are shown per doctor',
                    'Partner payout breakdown for X-Ray and Lab is included',
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <StepBadge n={i + 1} color="#f59e0b" />
                      <p className="pt-0.5 text-sm" style={{ color: '#c8c8d4' }}>{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </Section>

        {/* ── Settings ── */}
        <Section id="roles">
          <Card accent="#6b7280">
            <SectionHeader
              emoji="⚙️"
              title="Settings &amp; User Roles"
              subtitle="Admin-only configuration for the entire system"
              color="#a1a1aa"
            />
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: '#a1a1aa' }}>
                  Settings (Admin only)
                </p>
                <ul className="space-y-2 text-sm" style={{ color: '#c8c8d4' }}>
                  <li className="flex items-start gap-2"><span style={{ color: '#F5A623' }}>→</span> Clinic name and branding</li>
                  <li className="flex items-start gap-2"><span style={{ color: '#F5A623' }}>→</span> Add / deactivate doctors</li>
                  <li className="flex items-start gap-2"><span style={{ color: '#F5A623' }}>→</span> Set doctor earning model (commission % or fixed salary)</li>
                  <li className="flex items-start gap-2"><span style={{ color: '#F5A623' }}>→</span> Manage user accounts (Admin / Accountant)</li>
                  <li className="flex items-start gap-2"><span style={{ color: '#F5A623' }}>→</span> Create custom expense heads</li>
                  <li className="flex items-start gap-2"><span style={{ color: '#F5A623' }}>→</span> Enable / disable payment methods</li>
                </ul>
              </div>
              <div>
                <p className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: '#a1a1aa' }}>
                  User Role Comparison
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ color: '#7c7c9a' }}>
                      <th className="pb-2 text-left font-medium">Feature</th>
                      <th className="pb-2 text-center font-medium">Admin</th>
                      <th className="pb-2 text-center font-medium">Accountant</th>
                    </tr>
                  </thead>
                  <tbody className="space-y-1" style={{ color: '#c8c8d4' }}>
                    {[
                      ['OPD / Pharmacy / Lab / X-Ray', true, true],
                      ['Finance & Reports', true, true],
                      ['Delete records', true, false],
                      ['Settings', true, false],
                      ['Add / manage doctors', true, false],
                      ['Manage users', true, false],
                    ].map(([feat, admin, acct]) => (
                      <tr key={String(feat)} className="border-t" style={{ borderColor: '#ffffff0a' }}>
                        <td className="py-1.5 pr-4">{String(feat)}</td>
                        <td className="py-1.5 text-center">{admin ? '✅' : '—'}</td>
                        <td className="py-1.5 text-center">{acct ? '✅' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </Section>

        {/* Quick-start checklist */}
        <Section>
          <Card accent="#F5A623">
            <SectionHeader
              emoji="🚀"
              title="Quick-Start Checklist"
              subtitle="Complete these steps to go live on day one"
              color="#F5A623"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: 'Set clinic name in Settings → General', group: 'Setup' },
                { label: 'Add doctors with earning models in Settings → Doctors', group: 'Setup' },
                { label: 'Enable payment methods in Settings → Payment Methods', group: 'Setup' },
                { label: 'Create custom expense heads if needed', group: 'Setup' },
                { label: 'Add pharmacy inventory items', group: 'Inventory' },
                { label: 'Add lab test catalog and configure splits', group: 'Inventory' },
                { label: 'Add X-Ray partners and set split %', group: 'Inventory' },
                { label: 'Register first patient and record first visit', group: 'Go Live' },
                { label: 'Record day\'s expenses before closing', group: 'Daily' },
                { label: 'Check OPD Dashboard for today\'s summary', group: 'Daily' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border p-3"
                  style={{ background: '#F5A62308', borderColor: '#F5A62318' }}
                >
                  <div
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-2"
                    style={{ borderColor: '#F5A62340' }}
                  />
                  <div>
                    <p className="text-sm" style={{ color: '#c8c8d4' }}>{item.label}</p>
                    <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: '#F5A62380' }}>{item.group}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        {/* Footer */}
        <div className="border-t pt-8 text-center" style={{ borderColor: '#ffffff12' }}>
          <p className="text-sm" style={{ color: '#7c7c9a' }}>
            ClinicPulse — Clinic Management System &nbsp;·&nbsp; All times in Pakistan Standard Time (PKT)
          </p>
          <a
            href="/login"
            className="mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{ background: '#F5A62318', color: '#F5A623' }}
          >
            Go to Login →
          </a>
        </div>
      </main>
    </div>
  )
}
