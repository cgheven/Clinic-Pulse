# ClinicPulse — System Architecture

> Production-grade medical center management system
> Stack: Next.js 16, React 19, TypeScript (strict), Supabase, Tailwind CSS v4

---

## 1. System Overview

ClinicPulse is a single-tenant (per-clinic) management system that covers the full operational lifecycle of a medical center — OPD consultations, pharmacy, laboratory, X-ray, payroll, expenses, and financial reporting — behind a role-gated dashboard built with Next.js App Router and Supabase.

### Core Principles
- **Config-driven**: every split percentage, partner count, expense head, and payment method lives in the database. Nothing financial is hardcoded.
- **RLS everywhere**: every table has Row Level Security. The service-role key is used only in trusted server contexts (Server Actions).
- **Paisas, never floats**: all monetary values stored as `BIGINT` (1 PKR = 100 paisas). Division happens only at the display layer.
- **Soft deletes**: every primary entity has `deleted_at TIMESTAMPTZ`. Hard deletes are forbidden from application code.
- **Audit trail**: every INSERT / UPDATE / DELETE on core tables writes a row to `cp_audit_logs` via PostgreSQL triggers.
- **UTC storage, PKT display**: all timestamps stored as `TIMESTAMPTZ` (UTC). The display layer converts to `Asia/Karachi` via `date-fns`.

### User Roles
| Role | Description |
|---|---|
| `admin` | Full read/write across all modules, settings, staff management |
| `accountant` | Read/write on payments and expenses; read-only on clinical modules; no access to /settings |

---

## 2. Folder Structure

```
clinic-pulse/
├── .env.local                         # Supabase keys (never commit)
├── .env.example                       # Template for new deployments
├── SCHEMA.sql                         # Full PostgreSQL schema
├── next.config.ts                     # Next.js config
├── tsconfig.json                      # strict: true
├── middleware.ts                      # Auth gate — session refresh, RBAC at edge
│
├── app/                               # Next.js App Router (root, no src/)
│   ├── layout.tsx                     # Root layout — toaster provider
│   ├── page.tsx                       # Root redirect → /dashboard
│   ├── globals.css                    # CSS variables (dark luxury theme)
│   │
│   ├── (auth)/                        # Public routes — no sidebar
│   │   ├── login/page.tsx             # Email/password login
│   │   └── layout.tsx
│   │
│   ├── (dashboard)/                   # Protected — requires valid session
│   │   ├── layout.tsx                 # DashboardShell: sidebar + content area
│   │   │
│   │   ├── dashboard/page.tsx         # Executive summary — KPIs + charts
│   │   │
│   │   ├── opd/
│   │   │   ├── page.tsx               # OPD overview
│   │   │   ├── patients/
│   │   │   │   ├── page.tsx           # Patient list with search
│   │   │   │   ├── new/page.tsx       # Register new patient
│   │   │   │   └── [id]/page.tsx      # Patient profile + visit history
│   │   │   ├── doctors/
│   │   │   │   ├── page.tsx           # Doctor list
│   │   │   │   └── [id]/page.tsx      # Doctor profile + earnings
│   │   │   └── visits/
│   │   │       ├── page.tsx           # All visits (date-filtered)
│   │   │       └── new/page.tsx       # Record new visit
│   │   │
│   │   ├── pharmacy/
│   │   │   ├── page.tsx               # Pharmacy dashboard + revenue split
│   │   │   ├── inventory/
│   │   │   │   ├── page.tsx           # Inventory list + low-stock alerts
│   │   │   │   ├── new/page.tsx       # Add medicine
│   │   │   │   └── [id]/page.tsx      # Edit medicine + stock adjustment
│   │   │   └── sales/
│   │   │       ├── page.tsx           # Sales log
│   │   │       └── new/page.tsx       # Record sale
│   │   │
│   │   ├── lab/
│   │   │   ├── page.tsx               # Lab dashboard
│   │   │   ├── tests/
│   │   │   │   ├── page.tsx           # Test logs (daily)
│   │   │   │   └── new/page.tsx       # Log new test
│   │   │   ├── catalog/page.tsx       # Test catalog (admin manages prices)
│   │   │   ├── chemicals/page.tsx     # Chemical inventory
│   │   │   ├── equipment/page.tsx     # Machinery + maintenance logs
│   │   │   ├── expenses/page.tsx      # Lab-specific expenses
│   │   │   └── reports/page.tsx       # Lab daily report generator
│   │   │
│   │   ├── xray/
│   │   │   ├── page.tsx               # X-ray dashboard
│   │   │   ├── revenue/
│   │   │   │   ├── page.tsx           # Revenue entries
│   │   │   │   └── new/page.tsx       # Record revenue + partner splits
│   │   │   ├── partners/page.tsx      # Partner management
│   │   │   └── expenses/page.tsx      # X-ray expenses
│   │   │
│   │   ├── expenses/
│   │   │   ├── page.tsx               # General expense log
│   │   │   ├── new/page.tsx           # Record expense
│   │   │   └── [id]/page.tsx          # Expense detail + void
│   │   │
│   │   ├── payments/page.tsx          # Payment summary by method + department
│   │   │
│   │   ├── reports/
│   │   │   ├── page.tsx               # Reports hub
│   │   │   ├── daily/page.tsx         # Daily revenue report (printable)
│   │   │   ├── doctors/page.tsx       # Doctor earnings report
│   │   │   ├── expenses/page.tsx      # Expense summary report
│   │   │   ├── lab/page.tsx           # Lab daily report
│   │   │   ├── partners/page.tsx      # X-ray partner payout report
│   │   │   └── payroll/page.tsx       # Staff payroll report
│   │   │
│   │   └── settings/page.tsx          # Settings panel (admin only)
│   │
│   └── actions/                       # Next.js Server Actions
│       ├── dashboard.ts               # Dashboard KPIs
│       ├── opd.ts                     # Patient, visit, BP log, doctor CRUD
│       ├── pharmacy.ts                # Inventory, sales, revenue split
│       ├── lab.ts                     # Test logs, catalog, chemicals, equipment, expenses
│       ├── xray.ts                    # Revenue, partners, splits, expenses
│       ├── expenses.ts                # General expenses
│       ├── payments.ts                # Payment summaries
│       ├── reports.ts                 # Report generation queries
│       └── settings.ts                # Clinic settings, doctor/staff/partner CRUD
│
├── components/
│   ├── ui/                            # Primitive components (shadcn pattern)
│   │   ├── button.tsx, card.tsx, input.tsx, label.tsx
│   │   ├── select.tsx, dialog.tsx, badge.tsx, tabs.tsx
│   │   ├── checkbox.tsx, switch.tsx, textarea.tsx
│   │   ├── separator.tsx, scroll-area.tsx
│   │   ├── dropdown-menu.tsx, toast.tsx, toaster.tsx
│   │   └── (calendar via react-day-picker)
│   │
│   ├── layout/
│   │   ├── sidebar.tsx                # Left nav with role-filtered links
│   │   └── dashboard-shell.tsx        # Shell wrapper (sidebar + outlet)
│   │
│   ├── dashboard/
│   │   ├── stat-card.tsx, revenue-chart.tsx
│   │   ├── payment-summary.tsx, recent-visits.tsx, alerts-panel.tsx
│   │
│   ├── opd/
│   │   ├── patient-card.tsx, patient-history.tsx
│   │   ├── visit-form.tsx, bp-log.tsx, doctor-earnings.tsx
│   │
│   ├── pharmacy/
│   │   ├── inventory-table.tsx, sale-form.tsx
│   │   ├── revenue-split-display.tsx, low-stock-alert.tsx
│   │
│   ├── lab/
│   │   ├── test-log-table.tsx, chemical-inventory.tsx
│   │   ├── equipment-card.tsx, maintenance-form.tsx
│   │   ├── expense-tracker.tsx, report-generator.tsx
│   │
│   ├── xray/
│   │   ├── revenue-form.tsx, partner-payout-card.tsx
│   │   ├── daily-summary.tsx, expense-split.tsx
│   │
│   ├── expenses/
│   │   ├── expense-form.tsx, expense-table.tsx, dept-split-card.tsx
│   │
│   ├── payments/
│   │   ├── method-card.tsx, dept-breakdown-table.tsx
│   │   ├── daily-trend-chart.tsx, date-selector.tsx
│   │
│   ├── reports/
│   │   ├── daily-revenue-table.tsx, doctor-earnings-table.tsx
│   │   ├── expense-summary-chart.tsx, lab-daily-report-table.tsx
│   │   ├── partner-payout-table.tsx, payroll-table.tsx
│   │   ├── pdf-generator.tsx, reports-tab-nav.tsx
│   │
│   └── settings/
│       ├── general-settings-form.tsx, doctor-settings-manager.tsx
│       ├── expense-heads-manager.tsx, partners-manager.tsx
│       ├── payment-methods-manager.tsx, staff-types-manager.tsx
│       ├── revenue-splits-tab.tsx, revenue-split-card.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                  # Browser client (createBrowserClient)
│   │   ├── server.ts                  # Server client (createServerClient + cookies)
│   │   ├── middleware.ts              # Session update helper
│   │   └── admin.ts                   # Service-role client (server-only)
│   ├── auth.ts                        # getCurrentUser, requireAuth, requireAdmin
│   ├── utils.ts                       # cn(), clsx helpers
│   └── validate-date.ts               # Date validation helpers
│
├── hooks/
│   └── use-toast.ts                   # Toast hook
│
└── types/
    ├── database.ts                    # Supabase typed Database stub
    └── index.ts                       # All app-level TypeScript interfaces
```

---

## 3. Module Descriptions

### 3.1 Auth Module
- Supabase Email/Password auth (no magic link, no OAuth)
- `@supabase/ssr` — `createServerClient` in Server Components/Actions; `createBrowserClient` in Client Components
- `middleware.ts` — refreshes session cookies on every request, redirects unauthenticated users to `/login`, enforces admin-only on `/settings`
- After sign-in, reads `cp_users.role` (`admin` | `accountant`) for RBAC

### 3.2 Settings Panel (`/settings`)
- Admin-only via middleware + `requireAdmin()` in server actions
- Manages: clinic info, doctors, staff types, expense heads, payment methods, X-ray partners, pharmacy revenue splits
- All clinic settings in `cp_settings` (key-value with `setting_group`)

### 3.3 OPD Module (`/opd`)
- **Patients** (`cp_patients`): full profile, CNIC, blood group, soft delete
- **Visits** (`cp_patient_visits`): per-visit fee, doctor assignment, payment method, chief complaint, prescription, BP tracking
- **BP Logs** (`cp_bp_logs`): systolic/diastolic/pulse per visit
- **Doctors** (`cp_doctors`): salaried or commission-based; commission config in `cp_doctor_commissions`

### 3.4 Pharmacy Module (`/pharmacy`)
- **Inventory** (`cp_pharmacy_inventory`): medicine, generic name, unit, cost/selling price (paisas), quantity, expiry, low-stock threshold
- **Sales** (`cp_pharmacy_sales`): line-item sales; revenue split display (clinic/doctor/staff percentages)
- Revenue split config stored in `cp_pharmacy_revenue_split` (basis points, must sum to 10000)

### 3.5 Laboratory Module (`/lab`)
- **Test Logs** (`cp_lab_test_logs`): daily log with quantity, revenue, payment method
- **Test Catalog** (`cp_lab_tests`): test name, price, cost, reference range
- **Chemicals** (`cp_lab_chemicals`): stock tracking, low-stock alert
- **Equipment** (`cp_lab_machinery`): machine name, purchase/warranty/maintenance dates
- **Lab Expenses** (`cp_lab_expenses`): refreshments, printing, CBC kits, instruments
- **Reports** (`/lab/reports`): printable daily lab report with payment breakdown

### 3.6 X-Ray Module (`/xray`)
- **Partners** (`cp_xray_partners`): partner name, type, bank account, toggleable
- **Revenue** (`cp_xray_revenue`): daily gross revenue entries with partner splits
- **Partner Splits** (`cp_xray_partner_splits`): percentage per partner per revenue entry
- **Expenses** (`cp_xray_expenses`): per-category X-ray expenses

### 3.7 Expenses Module (`/expenses`)
- General expenses (`cp_expenses`) across all departments
- Linked to `cp_expense_heads` (configurable categories)
- Soft-delete with void functionality

### 3.8 Payments Module (`/payments`)
- Daily payment summary across 4 methods: Cash, JazzCash, Easypaisa, Bank Transfer
- Department breakdown and trend charts
- All payment methods toggleable by admin in Settings

### 3.9 Reports (`/reports`)
- **Daily Revenue**: per-department breakdown, payment method totals, printable PDF
- **Doctor Earnings**: commission and salary calculations per doctor
- **Lab Daily Report**: test-by-test log with patient names, payment status
- **Partner Payout**: X-ray revenue distribution by partner
- **Expense Summary**: by head and department
- **Payroll**: staff salary report
- All report data fetched server-side; charts rendered client-side with Recharts

### 3.10 Audit Logs
- PostgreSQL trigger `fn_audit_log()` fires on INSERT/UPDATE/DELETE on core tables
- Stores: `table_name`, `record_id`, `action`, `old_data JSONB`, `new_data JSONB`, `performed_by`, `performed_at`

---

## 4. Database Schema Overview

```
auth.users (Supabase managed)
    └── cp_users (1:1 profile + role)

cp_departments
    ├── cp_lab_tests
    ├── cp_lab_test_logs
    ├── cp_pharmacy_inventory
    ├── cp_pharmacy_sales
    └── cp_xray_revenue

cp_payment_methods
    ├── cp_patient_visits.payment_method_id
    ├── cp_pharmacy_sales.payment_method_id
    ├── cp_lab_test_logs.payment_method_id
    ├── cp_xray_revenue.payment_method_id
    └── cp_payments.payment_method_id

cp_doctors
    ├── cp_doctor_commissions (1:N per time period)
    └── cp_patient_visits.doctor_id

cp_patients
    ├── cp_patient_visits
    └── cp_bp_logs

cp_xray_partners
    └── cp_xray_partner_splits → cp_xray_revenue

cp_expense_heads
    ├── cp_expenses
    ├── cp_lab_expenses
    └── cp_xray_expenses

cp_staff
    └── cp_staff_salary

-- Config tables
cp_settings              (key-value clinic config)
cp_pharmacy_revenue_split
cp_lab_chemicals
cp_lab_machinery
cp_lab_machinery_maintenance
cp_lab_expenses
cp_xray_expenses
cp_audit_logs
```

---

## 5. Server Actions Pattern

All mutations use Next.js Server Actions in `app/actions/`. Convention:

```typescript
'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'        // or requireAdmin for admin-only
import { revalidatePath } from 'next/cache'

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

export async function someAction(input: unknown): Promise<ActionResult<SomeType>> {
  try {
    await requireAuth()                          // 1. Auth check (throws/redirects if unauthenticated)
    const parsed = SomeSchema.safeParse(input)   // 2. Zod validation
    if (!parsed.success) return { success: false, error: '...' }

    const supabase = await createClient()        // 3. Typed Supabase client
    const { data, error } = await supabase       // 4. Query with RLS
      .from('cp_table')
      .insert(parsed.data)
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    revalidatePath('/relevant-path')             // 5. Bust cache
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}
```

---

## 6. Auth & RBAC Model

### Session Flow
```
Browser request
  → middleware.ts
    → updateSession() — createServerClient, supabase.auth.getUser()
    → no session → redirect /login?redirectTo=<path>
    → /settings path → load cp_users.role → non-admin → redirect /dashboard
    → continue to page handler
```

### Role Matrix

| Route | admin | accountant |
|---|---|---|
| `/dashboard` | read | read |
| `/opd/**` | read+write | read |
| `/pharmacy/**` | read+write | read |
| `/lab/**` | read+write | read |
| `/xray/**` | read+write | read |
| `/expenses/**` | read+write | read+write |
| `/payments` | read+write | read+write |
| `/reports/**` | read | read |
| `/settings` | read+write | blocked (middleware) |

### RLS Design
- Every table has `ENABLE ROW LEVEL SECURITY`
- Policies check `auth.uid()` against `cp_users` role
- Service role key (used only in Server Actions) bypasses RLS — never exposed to client
- Helper function `get_my_role()` returns role for the current Supabase session

---

## 7. Security Controls

| Control | Implementation |
|---|---|
| Auth | Supabase JWT, httpOnly session cookie via `@supabase/ssr` |
| RBAC | PostgreSQL RLS + middleware edge guard + `requireAuth`/`requireAdmin` in every server action |
| Input validation | Zod schemas on every Server Action — no raw DB inserts |
| SQL injection | Supabase JS client uses parameterized queries |
| CSRF | Next.js Server Actions have built-in CSRF protection (origin header check) |
| Service key isolation | `SUPABASE_SERVICE_ROLE_KEY` server-only, never in `NEXT_PUBLIC_*` |
| Soft deletes | `deleted_at` filter on all queries |
| Audit trail | PostgreSQL triggers — immutable from application layer |
| Data at rest | Supabase AES-256 encryption |
| Data in transit | TLS enforced by Supabase |

---

## 8. Environment Variables

```bash
# .env.local — never commit to version control

# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-secret-key>
```

`SUPABASE_SERVICE_ROLE_KEY` is **server-only** — never prefix with `NEXT_PUBLIC_`.

---

## 9. Deployment Instructions

### Prerequisites
1. Supabase project created (free or Pro tier)
2. Run `SCHEMA.sql` against the Supabase database (SQL Editor or `psql`)
3. Enable Row Level Security on all `cp_*` tables
4. Create an admin user via Supabase Auth dashboard, then insert their profile into `cp_users` with `role = 'admin'`

### Vercel Deployment
```bash
# 1. Push code to GitHub
# 2. Import project in Vercel dashboard
# 3. Set environment variables:
#    NEXT_PUBLIC_SUPABASE_URL
#    NEXT_PUBLIC_SUPABASE_ANON_KEY
#    SUPABASE_SERVICE_ROLE_KEY
# 4. Deploy — Vercel auto-detects Next.js
```

### Local Development
```bash
npm install
cp .env.example .env.local
# Fill in .env.local with your Supabase project credentials
npm run dev
```

### Build Verification
```bash
npm run build     # Must complete with 0 errors
npx tsc --noEmit  # TypeScript strict check
```

---

## 10. Theme

Dark luxury palette (amber primary, deep navy background):

| Token | Value | Usage |
|---|---|---|
| `--background` | `hsl(215 28% 7%)` | Page background |
| `--card` | `hsl(220 25% 11%)` | Card/panel background |
| `--primary` | `hsl(38 92% 55%)` | Amber gold — buttons, highlights |
| `--foreground` | `hsl(225 50% 95%)` | Primary text |
| `--muted-foreground` | `hsl(220 18% 50%)` | Secondary text |
| `--border` | `hsl(213 30% 16%)` | Borders, dividers |
| `--sidebar` | `hsl(220 30% 8%)` | Sidebar background |
| `--success` | `hsl(151 100% 41%)` | Success states |
| `--destructive` | `hsl(0 72% 51%)` | Error/delete states |

---

*ClinicPulse — Architecture v1.1 — 2026-06-26*
