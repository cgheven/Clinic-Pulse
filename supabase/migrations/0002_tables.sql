-- =============================================================================
-- ClinicPulse — Data tables (multi-tenant)
-- Columns mirror types/database.ts exactly. Union-typed columns are TEXT + CHECK
-- (robust with the Supabase JS client, which sends plain strings). Every table:
--   clinic_id NOT NULL → cp_clinics,  clinic-isolation RLS,  clinic_id autofill.
-- Business logic (stock decrement, split math) stays in the app — no DB triggers
-- for it (recordSale already decrements stock in-app).
-- =============================================================================

SET check_function_bodies = off;

-- Per-clinic sequential numbering for patients + visit vouchers (app never sets
-- these). UNIQUE(clinic_id, n) turns a rare concurrent collision into a retryable
-- error rather than a duplicate.
CREATE OR REPLACE FUNCTION fn_assign_patient_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.clinic_id IS NULL THEN NEW.clinic_id := cp_current_clinic_id(); END IF;
  IF NEW.patient_no IS NULL THEN
    SELECT COALESCE(MAX(patient_no),0)+1 INTO NEW.patient_no
    FROM cp_patients WHERE clinic_id = NEW.clinic_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_assign_voucher_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.clinic_id IS NULL THEN NEW.clinic_id := cp_current_clinic_id(); END IF;
  IF NEW.voucher_no IS NULL THEN
    SELECT COALESCE(MAX(voucher_no),0)+1 INTO NEW.voucher_no
    FROM cp_patient_visits WHERE clinic_id = NEW.clinic_id;
  END IF;
  RETURN NEW;
END;
$$;

-- ── cp_settings (per-clinic key/value) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS cp_settings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     UUID NOT NULL REFERENCES cp_clinics(id) ON DELETE CASCADE,
  setting_key   TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  updated_by    UUID REFERENCES cp_users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clinic_id, setting_key)
);

-- ── cp_payment_methods ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cp_payment_methods (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  UUID NOT NULL REFERENCES cp_clinics(id) ON DELETE CASCADE,
  method     TEXT NOT NULL CHECK (method IN ('cash','jazzcash','easypaisa','bank_transfer')),
  label      TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clinic_id, method)
);

-- ── cp_doctors ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cp_doctors (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id      UUID NOT NULL REFERENCES cp_clinics(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  specialization TEXT,
  phone          TEXT,
  email          TEXT,
  earning_model  TEXT NOT NULL DEFAULT 'commission' CHECK (earning_model IN ('salaried','commission')),
  monthly_salary BIGINT,
  commission_pct NUMERIC(5,2) CHECK (commission_pct IS NULL OR (commission_pct >= 0 AND commission_pct <= 100)),
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

-- ── cp_patients ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cp_patients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     UUID NOT NULL REFERENCES cp_clinics(id) ON DELETE CASCADE,
  patient_no    INTEGER NOT NULL,
  name          TEXT NOT NULL,
  phone         TEXT,
  gender        TEXT NOT NULL DEFAULT 'other' CHECK (gender IN ('male','female','other')),
  blood_group   TEXT,
  date_of_birth DATE,
  address       TEXT,
  history       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  UNIQUE (clinic_id, patient_no)
);

-- ── cp_patient_visits ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cp_patient_visits (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id          UUID NOT NULL REFERENCES cp_clinics(id) ON DELETE CASCADE,
  patient_id         UUID NOT NULL REFERENCES cp_patients(id),
  doctor_id          UUID REFERENCES cp_doctors(id),
  visit_date         DATE NOT NULL,
  voucher_no         INTEGER NOT NULL,
  fee_paisas         BIGINT NOT NULL,
  payment_method     TEXT CHECK (payment_method IN ('cash','jazzcash','easypaisa','bank_transfer')),
  payment_status     TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid','due','partial')),
  paid_amount_paisas BIGINT,
  chief_complaint    TEXT,
  diagnosis          TEXT,
  prescription       TEXT,
  notes              TEXT,
  created_by         UUID,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clinic_id, voucher_no)
);

-- ── cp_pharmacy_inventory ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cp_pharmacy_inventory (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id         UUID NOT NULL REFERENCES cp_clinics(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  generic_name      TEXT,
  category          TEXT,
  unit              TEXT NOT NULL DEFAULT 'unit',
  stock_qty         INTEGER NOT NULL DEFAULT 0,
  reorder_level     INTEGER NOT NULL DEFAULT 0,
  cost_price_paisas BIGINT NOT NULL DEFAULT 0,
  sale_price_paisas BIGINT NOT NULL DEFAULT 0,
  batch_number      TEXT,
  expiry_date       DATE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

-- ── cp_pharmacy_sales + items ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cp_pharmacy_sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID NOT NULL REFERENCES cp_clinics(id) ON DELETE CASCADE,
  sale_date       DATE NOT NULL,
  patient_id      UUID,
  patient_name    TEXT,
  doctor_id       UUID,
  total_paisas    BIGINT NOT NULL DEFAULT 0,
  discount_paisas BIGINT NOT NULL DEFAULT 0,
  payment_method  TEXT CHECK (payment_method IN ('cash','jazzcash','easypaisa','bank_transfer')),
  notes           TEXT,
  sold_by         UUID,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cp_pharmacy_sale_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id         UUID NOT NULL REFERENCES cp_clinics(id) ON DELETE CASCADE,
  sale_id           UUID NOT NULL REFERENCES cp_pharmacy_sales(id) ON DELETE CASCADE,
  inventory_id      UUID NOT NULL REFERENCES cp_pharmacy_inventory(id),
  qty               INTEGER NOT NULL,
  unit_price_paisas BIGINT NOT NULL,
  total_paisas      BIGINT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── cp_lab_tests + catalog detail ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cp_lab_tests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id        UUID NOT NULL REFERENCES cp_clinics(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  category         TEXT,
  price_paisas     BIGINT NOT NULL DEFAULT 0,
  duration_minutes INTEGER,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  specimen_type    TEXT,
  methodology      TEXT,
  department       TEXT,
  specialties      TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS cp_lab_test_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id      UUID NOT NULL REFERENCES cp_clinics(id) ON DELETE CASCADE,
  test_date      DATE NOT NULL,
  patient_id     UUID,
  patient_name   TEXT,
  test_id        UUID NOT NULL REFERENCES cp_lab_tests(id),
  test_name      TEXT NOT NULL,
  price_paisas   BIGINT NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash','jazzcash','easypaisa','bank_transfer')),
  doctor_id      UUID,
  result         TEXT,
  notes          TEXT,
  created_by     UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payment_status TEXT CHECK (payment_status IN ('pending','completed','refunded')),
  qty            INTEGER,
  deleted_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cp_lab_test_parameters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     UUID NOT NULL REFERENCES cp_clinics(id) ON DELETE CASCADE,
  test_id       UUID NOT NULL REFERENCES cp_lab_tests(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  unit          TEXT,
  group_name    TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  input_type    TEXT NOT NULL DEFAULT 'numeric' CHECK (input_type IN ('numeric','text','option','formula')),
  formula       TEXT,
  options       TEXT[],
  code          TEXT,
  decimals      INTEGER NOT NULL DEFAULT 0,
  default_value TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cp_lab_reference_ranges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     UUID NOT NULL REFERENCES cp_clinics(id) ON DELETE CASCADE,
  parameter_id  UUID NOT NULL REFERENCES cp_lab_test_parameters(id) ON DELETE CASCADE,
  sex           TEXT NOT NULL DEFAULT 'any' CHECK (sex IN ('any','male','female')),
  age_min_years NUMERIC,
  age_max_years NUMERIC,
  low           NUMERIC,
  high          NUMERIC,
  text_value    TEXT,
  critical_low  NUMERIC,
  critical_high NUMERIC,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cp_lab_result_values (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     UUID NOT NULL REFERENCES cp_clinics(id) ON DELETE CASCADE,
  test_log_id   UUID NOT NULL REFERENCES cp_lab_test_logs(id) ON DELETE CASCADE,
  parameter_id  UUID NOT NULL REFERENCES cp_lab_test_parameters(id),
  value_numeric NUMERIC,
  value_text    TEXT,
  flag          TEXT CHECK (flag IN ('normal','low','high','critical_low','critical_high')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cp_lab_chemicals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id         UUID NOT NULL REFERENCES cp_clinics(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  quantity          INTEGER NOT NULL DEFAULT 0,
  unit              TEXT NOT NULL DEFAULT 'unit',
  reorder_level     INTEGER NOT NULL DEFAULT 0,
  cost_price_paisas BIGINT NOT NULL DEFAULT 0,
  supplier          TEXT,
  last_restocked    DATE,
  expiry_date       DATE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cp_lab_machinery (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id            UUID NOT NULL REFERENCES cp_clinics(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  model                TEXT,
  serial_number        TEXT,
  purchase_date        DATE,
  last_service         DATE,
  next_service         DATE,
  status               TEXT NOT NULL DEFAULT 'operational',
  purchase_price_paisas BIGINT,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cp_lab_maintenance (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    UUID NOT NULL REFERENCES cp_clinics(id) ON DELETE CASCADE,
  machinery_id UUID NOT NULL REFERENCES cp_lab_machinery(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  description  TEXT,
  cost_paisas  BIGINT NOT NULL DEFAULT 0,
  technician   TEXT,
  next_service DATE,
  created_by   UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── cp_xray_* ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cp_xray_revenue (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id      UUID NOT NULL REFERENCES cp_clinics(id) ON DELETE CASCADE,
  revenue_date   DATE NOT NULL,
  patient_name   TEXT,
  patient_id     UUID,
  service_type   TEXT,
  amount_paisas  BIGINT NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash','jazzcash','easypaisa','bank_transfer')),
  payment_status TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid','due')),
  notes          TEXT,
  created_by     UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cp_xray_partners (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  UUID NOT NULL REFERENCES cp_clinics(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  phone      TEXT,
  split_pct  NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (split_pct >= 0 AND split_pct <= 100),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cp_xray_partner_splits (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    UUID NOT NULL REFERENCES cp_clinics(id) ON DELETE CASCADE,
  revenue_id   UUID NOT NULL REFERENCES cp_xray_revenue(id) ON DELETE CASCADE,
  partner_id   UUID NOT NULL REFERENCES cp_xray_partners(id),
  split_pct    NUMERIC(5,2) NOT NULL,
  split_amount BIGINT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── cp_expenses + heads ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cp_expense_heads (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  UUID NOT NULL REFERENCES cp_clinics(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'general' CHECK (department IN ('opd','pharmacy','lab','xray','general')),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  is_system  BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cp_expenses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id      UUID NOT NULL REFERENCES cp_clinics(id) ON DELETE CASCADE,
  expense_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  head_id        UUID REFERENCES cp_expense_heads(id),
  head_name      TEXT NOT NULL,
  department     TEXT NOT NULL CHECK (department IN ('opd','pharmacy','lab','xray','general')),
  amount_paisas  BIGINT NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash','jazzcash','easypaisa','bank_transfer')),
  description    TEXT,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','void')),
  created_by     UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── cp_staff + salary ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cp_staff (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id      UUID NOT NULL REFERENCES cp_clinics(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  phone          TEXT,
  staff_type     TEXT NOT NULL,
  department     TEXT,
  doctor_id      UUID REFERENCES cp_doctors(id),
  monthly_salary BIGINT NOT NULL DEFAULT 0,
  join_date      DATE,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cp_salary_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID NOT NULL REFERENCES cp_clinics(id) ON DELETE CASCADE,
  staff_id    UUID NOT NULL REFERENCES cp_staff(id) ON DELETE CASCADE,
  month       DATE NOT NULL,
  base_salary BIGINT NOT NULL,
  deductions  BIGINT NOT NULL DEFAULT 0,
  net_salary  BIGINT NOT NULL,
  paid_at     TIMESTAMPTZ,
  notes       TEXT,
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── cp_bp_logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cp_bp_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID NOT NULL REFERENCES cp_clinics(id) ON DELETE CASCADE,
  patient_id  UUID NOT NULL REFERENCES cp_patients(id) ON DELETE CASCADE,
  systolic    INTEGER NOT NULL,
  diastolic   INTEGER NOT NULL,
  pulse       INTEGER,
  notes       TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── cp_pharmacy_revenue_split ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cp_pharmacy_revenue_split (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id      UUID NOT NULL REFERENCES cp_clinics(id) ON DELETE CASCADE,
  doctor_pct     NUMERIC(7,2) NOT NULL,
  clinic_pct     NUMERIC(7,2) NOT NULL,
  staff_pct      NUMERIC(7,2) NOT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  notes          TEXT,
  created_by     UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
