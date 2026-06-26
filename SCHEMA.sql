-- =============================================================================
-- ClinicPulse — Full PostgreSQL Schema
-- Database: Supabase (PostgreSQL 15+)
-- Convention:
--   - All monetary values: BIGINT (paisas = 1/100 PKR)
--   - All percentages:     INTEGER (basis points; 10000 = 100.00%)
--   - All timestamps:      TIMESTAMPTZ (stored UTC, displayed PKT by app)
--   - Soft deletes:        deleted_at TIMESTAMPTZ NULL
--   - RLS:                 enabled on every table
-- =============================================================================

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- trigram search
CREATE EXTENSION IF NOT EXISTS "unaccent";   -- accent-insensitive search

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Returns the role of the currently authenticated user
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::TEXT
  FROM cp_users
  WHERE id = auth.uid()
    AND deleted_at IS NULL
  LIMIT 1;
$$;

-- Returns true if the current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM cp_users
    WHERE id = auth.uid()
      AND role = 'admin'
      AND deleted_at IS NULL
  );
$$;

-- Returns true if the current user is an admin or accountant
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM cp_users
    WHERE id = auth.uid()
      AND role IN ('admin', 'accountant')
      AND deleted_at IS NULL
  );
$$;

-- Generic audit log trigger function
CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id UUID;
  v_old_data  JSONB;
  v_new_data  JSONB;
  v_action    TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_record_id := NEW.id;
    v_old_data  := NULL;
    v_new_data  := to_jsonb(NEW);
    v_action    := 'INSERT';
  ELSIF TG_OP = 'UPDATE' THEN
    v_record_id := NEW.id;
    v_old_data  := to_jsonb(OLD);
    v_new_data  := to_jsonb(NEW);
    v_action    := 'UPDATE';
  ELSIF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id;
    v_old_data  := to_jsonb(OLD);
    v_new_data  := NULL;
    v_action    := 'DELETE';
  END IF;

  INSERT INTO cp_audit_logs (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    performed_by
  ) VALUES (
    TG_TABLE_NAME,
    v_record_id,
    v_action,
    v_old_data,
    v_new_data,
    auth.uid()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Utility: validate that X-ray partner splits sum to 10000 bp per revenue entry
CREATE OR REPLACE FUNCTION fn_validate_xray_splits()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(split_pct), 0)
  INTO v_total
  FROM cp_xray_partner_splits
  WHERE revenue_id = NEW.revenue_id
    AND deleted_at IS NULL;

  IF v_total > 10000 THEN
    RAISE EXCEPTION 'X-Ray partner splits exceed 100%%. Total basis points: %', v_total;
  END IF;

  RETURN NEW;
END;
$$;

-- Utility: update pharmacy inventory quantity on sale
CREATE OR REPLACE FUNCTION fn_adjust_inventory_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE cp_pharmacy_inventory
    SET quantity = quantity - NEW.quantity_sold,
        updated_at = NOW()
    WHERE id = NEW.inventory_item_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE cp_pharmacy_inventory
    SET quantity = quantity + OLD.quantity_sold,
        updated_at = NOW()
    WHERE id = OLD.inventory_item_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE cp_pharmacy_inventory
    SET quantity = quantity + OLD.quantity_sold - NEW.quantity_sold,
        updated_at = NOW()
    WHERE id = NEW.inventory_item_id;
  END IF;
  RETURN NEW;
END;
$$;

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM ('admin', 'accountant');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
CREATE TYPE blood_group_type AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown');
CREATE TYPE doctor_earning_model AS ENUM ('salaried', 'commission');
CREATE TYPE department_type AS ENUM ('opd', 'pharmacy', 'laboratory', 'xray', 'general');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded');
CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');
CREATE TYPE salary_status AS ENUM ('paid', 'pending', 'partial');

-- =============================================================================
-- TABLE: cp_users
-- Extends auth.users — one profile per auth user
-- =============================================================================

CREATE TABLE cp_users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'accountant',
  avatar_url    TEXT,
  phone         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_cp_users_role        ON cp_users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_cp_users_is_active   ON cp_users(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_cp_users_deleted_at  ON cp_users(deleted_at) WHERE deleted_at IS NOT NULL;

ALTER TABLE cp_users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "users_select_own" ON cp_users
  FOR SELECT USING (id = auth.uid());

-- Admins can see all active users
CREATE POLICY "admin_select_all_users" ON cp_users
  FOR SELECT USING (is_admin());

-- Admins can insert new users
CREATE POLICY "admin_insert_users" ON cp_users
  FOR INSERT WITH CHECK (is_admin());

-- Admins can update any user
CREATE POLICY "admin_update_users" ON cp_users
  FOR UPDATE USING (is_admin());

-- SECURITY FIX (FINDING-002): Users may update their own safe profile fields
-- (avatar_url, phone) only.  The WITH CHECK clause prevents elevation of the
-- role or is_active columns by re-reading the stored values and asserting they
-- have not changed.  Without WITH CHECK, PostgreSQL defaults it to the USING
-- expression which only checks the row identity — allowing any authenticated
-- user to self-promote to admin via the REST API.
CREATE POLICY "users_update_own_safe_fields" ON cp_users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role     = (SELECT role      FROM cp_users WHERE id = auth.uid())
    AND is_active = (SELECT is_active FROM cp_users WHERE id = auth.uid())
  );

-- Only admins can soft-delete users
CREATE POLICY "admin_delete_users" ON cp_users
  FOR DELETE USING (is_admin());

-- Trigger: update updated_at
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_cp_users_updated_at
  BEFORE UPDATE ON cp_users
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_cp_users_audit
  AFTER INSERT OR UPDATE OR DELETE ON cp_users
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- =============================================================================
-- TABLE: cp_settings
-- Key-value configuration store, grouped by module
-- =============================================================================

CREATE TABLE cp_settings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_group TEXT NOT NULL,                  -- 'clinic', 'opd', 'lab', 'xray', 'pharmacy'
  key           TEXT NOT NULL,
  value         TEXT NOT NULL,
  label         TEXT,                           -- human-readable label for UI
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(setting_group, key)
);

CREATE INDEX idx_cp_settings_group ON cp_settings(setting_group);

ALTER TABLE cp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_settings" ON cp_settings
  FOR SELECT USING (is_staff());

CREATE POLICY "admin_insert_settings" ON cp_settings
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "admin_update_settings" ON cp_settings
  FOR UPDATE USING (is_admin());

CREATE POLICY "admin_delete_settings" ON cp_settings
  FOR DELETE USING (is_admin());

CREATE TRIGGER trg_cp_settings_updated_at
  BEFORE UPDATE ON cp_settings
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_cp_settings_audit
  AFTER INSERT OR UPDATE OR DELETE ON cp_settings
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- =============================================================================
-- TABLE: cp_departments
-- Master list of departments
-- =============================================================================

CREATE TABLE cp_departments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,            -- 'opd', 'pharmacy', 'laboratory', 'xray', 'general'
  dept_type     department_type NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    SMALLINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

ALTER TABLE cp_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_departments" ON cp_departments
  FOR SELECT USING (is_staff());

CREATE POLICY "admin_manage_departments" ON cp_departments
  FOR ALL USING (is_admin());

CREATE TRIGGER trg_cp_departments_updated_at
  BEFORE UPDATE ON cp_departments
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- =============================================================================
-- TABLE: cp_payment_methods
-- Cash, JazzCash, Easypaisa, Bank Transfer — admin-toggleable
-- =============================================================================

CREATE TABLE cp_payment_methods (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,            -- 'cash', 'jazzcash', 'easypaisa', 'bank_transfer'
  icon_name     TEXT,                           -- lucide icon name
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    SMALLINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cp_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_payment_methods" ON cp_payment_methods
  FOR SELECT USING (is_staff());

CREATE POLICY "admin_manage_payment_methods" ON cp_payment_methods
  FOR ALL USING (is_admin());

CREATE TRIGGER trg_cp_payment_methods_updated_at
  BEFORE UPDATE ON cp_payment_methods
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- =============================================================================
-- TABLE: cp_expense_heads
-- Configurable expense categories
-- =============================================================================

CREATE TABLE cp_expense_heads (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  department_id UUID REFERENCES cp_departments(id),  -- NULL = cross-department
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_system     BOOLEAN NOT NULL DEFAULT FALSE,      -- system heads cannot be deleted
  sort_order    SMALLINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_cp_expense_heads_dept ON cp_expense_heads(department_id) WHERE deleted_at IS NULL;

ALTER TABLE cp_expense_heads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_expense_heads" ON cp_expense_heads
  FOR SELECT USING (is_staff());

CREATE POLICY "admin_manage_expense_heads" ON cp_expense_heads
  FOR ALL USING (is_admin());

CREATE TRIGGER trg_cp_expense_heads_updated_at
  BEFORE UPDATE ON cp_expense_heads
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_cp_expense_heads_audit
  AFTER INSERT OR UPDATE OR DELETE ON cp_expense_heads
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- =============================================================================
-- TABLE: cp_doctors
-- Doctor profiles — salaried or commission-based
-- =============================================================================

CREATE TABLE cp_doctors (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name       TEXT NOT NULL,
  specialty       TEXT,
  phone           TEXT,
  email           TEXT,
  cnic            TEXT,
  earning_model   doctor_earning_model NOT NULL DEFAULT 'commission',
  monthly_salary  BIGINT,                         -- paisas, used when earning_model = 'salaried'
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_cp_doctors_active      ON cp_doctors(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_cp_doctors_deleted_at  ON cp_doctors(deleted_at) WHERE deleted_at IS NOT NULL;

ALTER TABLE cp_doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_doctors" ON cp_doctors
  FOR SELECT USING (is_staff());

CREATE POLICY "admin_manage_doctors" ON cp_doctors
  FOR ALL USING (is_admin());

CREATE TRIGGER trg_cp_doctors_updated_at
  BEFORE UPDATE ON cp_doctors
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_cp_doctors_audit
  AFTER INSERT OR UPDATE OR DELETE ON cp_doctors
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- =============================================================================
-- TABLE: cp_doctor_commissions
-- Per-doctor commission config with effective date ranges
-- =============================================================================

CREATE TABLE cp_doctor_commissions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id       UUID NOT NULL REFERENCES cp_doctors(id) ON DELETE CASCADE,
  commission_pct  INTEGER NOT NULL CHECK (commission_pct BETWEEN 0 AND 10000),  -- basis points
  effective_from  DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to    DATE,                                                           -- NULL = current
  notes           TEXT,
  created_by      UUID REFERENCES cp_users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- only one open-ended record per doctor
  CONSTRAINT no_overlapping_open_commission
    EXCLUDE USING gist (
      doctor_id WITH =,
      daterange(effective_from, effective_to, '[)') WITH &&
    ) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_cp_doctor_commissions_doctor ON cp_doctor_commissions(doctor_id);
CREATE INDEX idx_cp_doctor_commissions_dates  ON cp_doctor_commissions(doctor_id, effective_from, effective_to);

ALTER TABLE cp_doctor_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_commissions" ON cp_doctor_commissions
  FOR SELECT USING (is_staff());

CREATE POLICY "admin_manage_commissions" ON cp_doctor_commissions
  FOR ALL USING (is_admin());

CREATE TRIGGER trg_cp_doctor_commissions_updated_at
  BEFORE UPDATE ON cp_doctor_commissions
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_cp_doctor_commissions_audit
  AFTER INSERT OR UPDATE OR DELETE ON cp_doctor_commissions
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- =============================================================================
-- TABLE: cp_patients
-- Patient master records
-- =============================================================================

CREATE TABLE cp_patients (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_no    TEXT NOT NULL UNIQUE,             -- system-generated (e.g. "CP-00001")
  full_name     TEXT NOT NULL,
  father_name   TEXT,
  gender        gender_type NOT NULL DEFAULT 'male',
  date_of_birth DATE,
  age_years     SMALLINT,                         -- fallback when DOB not known
  blood_group   blood_group_type NOT NULL DEFAULT 'unknown',
  cnic          TEXT,
  phone         TEXT,
  address       TEXT,
  city          TEXT,
  known_allergies TEXT,
  chronic_conditions TEXT,
  notes         TEXT,
  -- Full-text search vector
  fts_vector    TSVECTOR,
  referred_by   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_cp_patients_patient_no   ON cp_patients(patient_no);
CREATE INDEX idx_cp_patients_cnic         ON cp_patients(cnic) WHERE cnic IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_cp_patients_phone        ON cp_patients(phone) WHERE phone IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_cp_patients_fts          ON cp_patients USING gin(fts_vector);
CREATE INDEX idx_cp_patients_deleted_at   ON cp_patients(deleted_at) WHERE deleted_at IS NOT NULL;

-- Auto-update fts_vector
CREATE OR REPLACE FUNCTION fn_update_patient_fts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.fts_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.father_name, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.cnic, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.phone, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.patient_no, '')), 'A');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cp_patients_fts
  BEFORE INSERT OR UPDATE ON cp_patients
  FOR EACH ROW EXECUTE FUNCTION fn_update_patient_fts();

-- Auto-generate patient_no
CREATE SEQUENCE cp_patient_no_seq START 1;
CREATE OR REPLACE FUNCTION fn_generate_patient_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.patient_no IS NULL OR NEW.patient_no = '' THEN
    NEW.patient_no := 'CP-' || LPAD(nextval('cp_patient_no_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cp_patients_patient_no
  BEFORE INSERT ON cp_patients
  FOR EACH ROW EXECUTE FUNCTION fn_generate_patient_no();

CREATE TRIGGER trg_cp_patients_updated_at
  BEFORE UPDATE ON cp_patients
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

ALTER TABLE cp_patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_patients" ON cp_patients
  FOR SELECT USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "staff_insert_patients" ON cp_patients
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "staff_update_patients" ON cp_patients
  FOR UPDATE USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "admin_delete_patients" ON cp_patients
  FOR DELETE USING (is_admin());

CREATE TRIGGER trg_cp_patients_audit
  AFTER INSERT OR UPDATE OR DELETE ON cp_patients
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- =============================================================================
-- TABLE: cp_patient_visits
-- Per-visit OPD records
-- =============================================================================

CREATE TABLE cp_patient_visits (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id          UUID NOT NULL REFERENCES cp_patients(id) ON DELETE RESTRICT,
  doctor_id           UUID REFERENCES cp_doctors(id),
  visit_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  visit_time          TIMETZ NOT NULL DEFAULT CURRENT_TIME,
  chief_complaint     TEXT,
  diagnosis           TEXT,
  prescription        TEXT,
  consultation_fee    BIGINT NOT NULL DEFAULT 0,               -- paisas
  discount_amount     BIGINT NOT NULL DEFAULT 0,               -- paisas
  net_fee             BIGINT GENERATED ALWAYS AS (consultation_fee - discount_amount) STORED,
  payment_method_id   UUID REFERENCES cp_payment_methods(id),
  payment_status      payment_status NOT NULL DEFAULT 'completed',
  follow_up_date      DATE,
  is_follow_up        BOOLEAN NOT NULL DEFAULT FALSE,
  notes               TEXT,
  created_by          UUID REFERENCES cp_users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_cp_patient_visits_patient    ON cp_patient_visits(patient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cp_patient_visits_doctor     ON cp_patient_visits(doctor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cp_patient_visits_date       ON cp_patient_visits(visit_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_cp_patient_visits_created_at ON cp_patient_visits(created_at DESC);
CREATE INDEX idx_cp_patient_visits_payment    ON cp_patient_visits(payment_method_id) WHERE deleted_at IS NULL;

ALTER TABLE cp_patient_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_visits" ON cp_patient_visits
  FOR SELECT USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "staff_insert_visits" ON cp_patient_visits
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "staff_update_visits" ON cp_patient_visits
  FOR UPDATE USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "admin_delete_visits" ON cp_patient_visits
  FOR DELETE USING (is_admin());

CREATE TRIGGER trg_cp_patient_visits_updated_at
  BEFORE UPDATE ON cp_patient_visits
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_cp_patient_visits_audit
  AFTER INSERT OR UPDATE OR DELETE ON cp_patient_visits
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- =============================================================================
-- TABLE: cp_bp_logs
-- Blood pressure log per patient per visit
-- =============================================================================

CREATE TABLE cp_bp_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id    UUID NOT NULL REFERENCES cp_patients(id) ON DELETE RESTRICT,
  visit_id      UUID REFERENCES cp_patient_visits(id) ON DELETE SET NULL,
  systolic      SMALLINT NOT NULL CHECK (systolic BETWEEN 50 AND 300),
  diastolic     SMALLINT NOT NULL CHECK (diastolic BETWEEN 30 AND 200),
  pulse         SMALLINT CHECK (pulse BETWEEN 30 AND 250),
  measured_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes         TEXT,
  recorded_by   UUID REFERENCES cp_users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cp_bp_logs_patient      ON cp_bp_logs(patient_id);
CREATE INDEX idx_cp_bp_logs_measured_at  ON cp_bp_logs(patient_id, measured_at DESC);

ALTER TABLE cp_bp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_bp_logs" ON cp_bp_logs
  FOR SELECT USING (is_staff());

CREATE POLICY "staff_insert_bp_logs" ON cp_bp_logs
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "staff_update_bp_logs" ON cp_bp_logs
  FOR UPDATE USING (is_staff());

CREATE POLICY "admin_delete_bp_logs" ON cp_bp_logs
  FOR DELETE USING (is_admin());

-- =============================================================================
-- TABLE: cp_pharmacy_inventory
-- Medicine / product stock
-- =============================================================================

CREATE TABLE cp_pharmacy_inventory (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medicine_name         TEXT NOT NULL,
  generic_name          TEXT,
  manufacturer          TEXT,
  batch_no              TEXT,
  barcode               TEXT,
  unit                  TEXT NOT NULL DEFAULT 'tablet',   -- tablet, syrup, injection, etc.
  pack_size             SMALLINT NOT NULL DEFAULT 1,
  cost_price_per_unit   BIGINT NOT NULL DEFAULT 0,        -- paisas
  selling_price_per_unit BIGINT NOT NULL DEFAULT 0,       -- paisas
  quantity              INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold   INTEGER NOT NULL DEFAULT 10,
  expiry_date           DATE,
  location              TEXT,                             -- shelf/rack label
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  notes                 TEXT,
  created_by            UUID REFERENCES cp_users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX idx_cp_pharmacy_inv_name      ON cp_pharmacy_inventory USING gin(medicine_name gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX idx_cp_pharmacy_inv_barcode   ON cp_pharmacy_inventory(barcode) WHERE barcode IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_cp_pharmacy_inv_expiry    ON cp_pharmacy_inventory(expiry_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_cp_pharmacy_inv_low_stock ON cp_pharmacy_inventory(quantity, low_stock_threshold) WHERE deleted_at IS NULL AND is_active = TRUE;

ALTER TABLE cp_pharmacy_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_pharmacy_inv" ON cp_pharmacy_inventory
  FOR SELECT USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "staff_insert_pharmacy_inv" ON cp_pharmacy_inventory
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "staff_update_pharmacy_inv" ON cp_pharmacy_inventory
  FOR UPDATE USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "admin_delete_pharmacy_inv" ON cp_pharmacy_inventory
  FOR DELETE USING (is_admin());

CREATE TRIGGER trg_cp_pharmacy_inventory_updated_at
  BEFORE UPDATE ON cp_pharmacy_inventory
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_cp_pharmacy_inventory_audit
  AFTER INSERT OR UPDATE OR DELETE ON cp_pharmacy_inventory
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- =============================================================================
-- TABLE: cp_pharmacy_sales
-- Line-item pharmacy sales transactions
-- =============================================================================

CREATE TABLE cp_pharmacy_sales (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_date           DATE NOT NULL DEFAULT CURRENT_DATE,
  patient_id          UUID REFERENCES cp_patients(id),    -- optional linkage
  visit_id            UUID REFERENCES cp_patient_visits(id),
  inventory_item_id   UUID NOT NULL REFERENCES cp_pharmacy_inventory(id),
  quantity_sold       INTEGER NOT NULL CHECK (quantity_sold > 0),
  unit_price          BIGINT NOT NULL,                    -- paisas (snapshot at time of sale)
  discount_amount     BIGINT NOT NULL DEFAULT 0,          -- paisas
  total_amount        BIGINT GENERATED ALWAYS AS ((quantity_sold * unit_price) - discount_amount) STORED,
  payment_method_id   UUID REFERENCES cp_payment_methods(id),
  payment_status      payment_status NOT NULL DEFAULT 'completed',
  notes               TEXT,
  sold_by             UUID REFERENCES cp_users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_cp_pharmacy_sales_date     ON cp_pharmacy_sales(sale_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_cp_pharmacy_sales_item     ON cp_pharmacy_sales(inventory_item_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cp_pharmacy_sales_patient  ON cp_pharmacy_sales(patient_id) WHERE patient_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_cp_pharmacy_sales_payment  ON cp_pharmacy_sales(payment_method_id) WHERE deleted_at IS NULL;

ALTER TABLE cp_pharmacy_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_pharmacy_sales" ON cp_pharmacy_sales
  FOR SELECT USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "staff_insert_pharmacy_sales" ON cp_pharmacy_sales
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "staff_update_pharmacy_sales" ON cp_pharmacy_sales
  FOR UPDATE USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "admin_delete_pharmacy_sales" ON cp_pharmacy_sales
  FOR DELETE USING (is_admin());

CREATE TRIGGER trg_cp_pharmacy_sales_inv_adjust
  AFTER INSERT OR UPDATE OR DELETE ON cp_pharmacy_sales
  FOR EACH ROW EXECUTE FUNCTION fn_adjust_inventory_on_sale();

CREATE TRIGGER trg_cp_pharmacy_sales_updated_at
  BEFORE UPDATE ON cp_pharmacy_sales
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_cp_pharmacy_sales_audit
  AFTER INSERT OR UPDATE OR DELETE ON cp_pharmacy_sales
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- =============================================================================
-- TABLE: cp_pharmacy_revenue_split
-- Configurable revenue split — must total 10000 bp (100%)
-- =============================================================================

CREATE TABLE cp_pharmacy_revenue_split (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_pct      INTEGER NOT NULL DEFAULT 6000 CHECK (clinic_pct BETWEEN 0 AND 10000),  -- bp
  doctor_pct      INTEGER NOT NULL DEFAULT 3000 CHECK (doctor_pct BETWEEN 0 AND 10000),
  staff_pct       INTEGER NOT NULL DEFAULT 1000 CHECK (staff_pct BETWEEN 0 AND 10000),
  effective_from  DATE NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  created_by      UUID REFERENCES cp_users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pharmacy_split_must_total CHECK (clinic_pct + doctor_pct + staff_pct = 10000)
);

ALTER TABLE cp_pharmacy_revenue_split ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_pharmacy_split" ON cp_pharmacy_revenue_split
  FOR SELECT USING (is_staff());

CREATE POLICY "admin_manage_pharmacy_split" ON cp_pharmacy_revenue_split
  FOR ALL USING (is_admin());

CREATE TRIGGER trg_cp_pharmacy_split_audit
  AFTER INSERT OR UPDATE OR DELETE ON cp_pharmacy_revenue_split
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- =============================================================================
-- TABLE: cp_lab_tests
-- Test catalog with pricing
-- =============================================================================

CREATE TABLE cp_lab_tests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_name       TEXT NOT NULL,
  test_code       TEXT UNIQUE,
  category        TEXT,                     -- 'hematology', 'biochemistry', 'microbiology', etc.
  price           BIGINT NOT NULL DEFAULT 0, -- paisas
  cost            BIGINT NOT NULL DEFAULT 0, -- paisas (reagent cost per test)
  reference_range TEXT,
  unit            TEXT,
  turnaround_time TEXT,                     -- e.g. "2 hours", "24 hours"
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_by      UUID REFERENCES cp_users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_cp_lab_tests_name     ON cp_lab_tests USING gin(test_name gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX idx_cp_lab_tests_category ON cp_lab_tests(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_cp_lab_tests_active   ON cp_lab_tests(is_active) WHERE deleted_at IS NULL;

ALTER TABLE cp_lab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_lab_tests" ON cp_lab_tests
  FOR SELECT USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "staff_insert_lab_tests" ON cp_lab_tests
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "staff_update_lab_tests" ON cp_lab_tests
  FOR UPDATE USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "admin_delete_lab_tests" ON cp_lab_tests
  FOR DELETE USING (is_admin());

CREATE TRIGGER trg_cp_lab_tests_updated_at
  BEFORE UPDATE ON cp_lab_tests
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_cp_lab_tests_audit
  AFTER INSERT OR UPDATE OR DELETE ON cp_lab_tests
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- =============================================================================
-- TABLE: cp_lab_test_logs
-- Daily test result records
-- =============================================================================

CREATE TABLE cp_lab_test_logs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  log_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  patient_id          UUID REFERENCES cp_patients(id),
  visit_id            UUID REFERENCES cp_patient_visits(id),
  test_id             UUID NOT NULL REFERENCES cp_lab_tests(id),
  quantity            SMALLINT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price          BIGINT NOT NULL,                   -- paisas (snapshot)
  discount_amount     BIGINT NOT NULL DEFAULT 0,
  total_amount        BIGINT GENERATED ALWAYS AS ((quantity * unit_price) - discount_amount) STORED,
  result_value        TEXT,
  result_unit         TEXT,
  is_abnormal         BOOLEAN NOT NULL DEFAULT FALSE,
  result_notes        TEXT,
  payment_method_id   UUID REFERENCES cp_payment_methods(id),
  payment_status      payment_status NOT NULL DEFAULT 'completed',
  report_issued       BOOLEAN NOT NULL DEFAULT FALSE,
  report_issued_at    TIMESTAMPTZ,
  performed_by        UUID REFERENCES cp_users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_cp_lab_logs_date     ON cp_lab_test_logs(log_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_cp_lab_logs_test     ON cp_lab_test_logs(test_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cp_lab_logs_patient  ON cp_lab_test_logs(patient_id) WHERE patient_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_cp_lab_logs_payment  ON cp_lab_test_logs(payment_method_id) WHERE deleted_at IS NULL;

ALTER TABLE cp_lab_test_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_lab_logs" ON cp_lab_test_logs
  FOR SELECT USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "staff_insert_lab_logs" ON cp_lab_test_logs
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "staff_update_lab_logs" ON cp_lab_test_logs
  FOR UPDATE USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "admin_delete_lab_logs" ON cp_lab_test_logs
  FOR DELETE USING (is_admin());

CREATE TRIGGER trg_cp_lab_test_logs_updated_at
  BEFORE UPDATE ON cp_lab_test_logs
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_cp_lab_test_logs_audit
  AFTER INSERT OR UPDATE OR DELETE ON cp_lab_test_logs
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- =============================================================================
-- TABLE: cp_lab_chemicals
-- Chemical / reagent inventory
-- =============================================================================

CREATE TABLE cp_lab_chemicals (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chemical_name       TEXT NOT NULL,
  manufacturer        TEXT,
  batch_no            TEXT,
  unit                TEXT NOT NULL DEFAULT 'ml',      -- ml, g, vials, kits
  quantity_in_stock   NUMERIC(10, 2) NOT NULL DEFAULT 0,
  low_stock_threshold NUMERIC(10, 2) NOT NULL DEFAULT 5,
  cost_per_unit       BIGINT NOT NULL DEFAULT 0,       -- paisas
  expiry_date         DATE,
  location            TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  notes               TEXT,
  created_by          UUID REFERENCES cp_users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_cp_lab_chemicals_name   ON cp_lab_chemicals USING gin(chemical_name gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX idx_cp_lab_chemicals_expiry ON cp_lab_chemicals(expiry_date) WHERE deleted_at IS NULL;

ALTER TABLE cp_lab_chemicals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_lab_chemicals" ON cp_lab_chemicals
  FOR SELECT USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "staff_insert_lab_chemicals" ON cp_lab_chemicals
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "staff_update_lab_chemicals" ON cp_lab_chemicals
  FOR UPDATE USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "admin_delete_lab_chemicals" ON cp_lab_chemicals
  FOR DELETE USING (is_admin());

CREATE TRIGGER trg_cp_lab_chemicals_updated_at
  BEFORE UPDATE ON cp_lab_chemicals
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_cp_lab_chemicals_audit
  AFTER INSERT OR UPDATE OR DELETE ON cp_lab_chemicals
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- =============================================================================
-- TABLE: cp_lab_machinery
-- Lab equipment with maintenance tracking
-- =============================================================================

CREATE TABLE cp_lab_machinery (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_name          TEXT NOT NULL,
  model_no              TEXT,
  serial_no             TEXT,
  manufacturer          TEXT,
  purchase_date         DATE,
  purchase_cost         BIGINT,                    -- paisas
  warranty_expiry       DATE,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  maintenance_interval_days SMALLINT DEFAULT 90,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  location              TEXT,
  notes                 TEXT,
  created_by            UUID REFERENCES cp_users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX idx_cp_lab_machinery_maintenance ON cp_lab_machinery(next_maintenance_date) WHERE deleted_at IS NULL AND is_active = TRUE;

ALTER TABLE cp_lab_machinery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_machinery" ON cp_lab_machinery
  FOR SELECT USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "admin_manage_machinery" ON cp_lab_machinery
  FOR ALL USING (is_admin());

CREATE TRIGGER trg_cp_lab_machinery_updated_at
  BEFORE UPDATE ON cp_lab_machinery
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_cp_lab_machinery_audit
  AFTER INSERT OR UPDATE OR DELETE ON cp_lab_machinery
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- =============================================================================
-- TABLE: cp_lab_machinery_maintenance
-- Maintenance log per machine
-- =============================================================================

CREATE TABLE cp_lab_machinery_maintenance (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id      UUID NOT NULL REFERENCES cp_lab_machinery(id) ON DELETE CASCADE,
  maintenance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  maintenance_type TEXT NOT NULL,                 -- 'routine', 'repair', 'calibration'
  cost            BIGINT NOT NULL DEFAULT 0,      -- paisas
  performed_by    TEXT,                           -- technician name
  notes           TEXT,
  next_due_date   DATE,
  created_by      UUID REFERENCES cp_users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cp_machinery_maint_machine ON cp_lab_machinery_maintenance(machine_id);
CREATE INDEX idx_cp_machinery_maint_date    ON cp_lab_machinery_maintenance(maintenance_date DESC);

ALTER TABLE cp_lab_machinery_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_maintenance" ON cp_lab_machinery_maintenance
  FOR SELECT USING (is_staff());

CREATE POLICY "admin_manage_maintenance" ON cp_lab_machinery_maintenance
  FOR ALL USING (is_admin());

-- =============================================================================
-- TABLE: cp_lab_expenses
-- Lab-specific expenses: refreshments, printing, instruments, CBC kits, custom
-- =============================================================================

CREATE TABLE cp_lab_expenses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  expense_head_id UUID REFERENCES cp_expense_heads(id),  -- NULL if custom
  custom_head     TEXT,                                   -- used when expense_head_id is NULL
  amount          BIGINT NOT NULL CHECK (amount >= 0),    -- paisas
  description     TEXT,
  receipt_url     TEXT,                                   -- Supabase Storage URL
  payment_method_id UUID REFERENCES cp_payment_methods(id),
  created_by      UUID REFERENCES cp_users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_cp_lab_expenses_date ON cp_lab_expenses(expense_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_cp_lab_expenses_head ON cp_lab_expenses(expense_head_id) WHERE deleted_at IS NULL;

ALTER TABLE cp_lab_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_lab_expenses" ON cp_lab_expenses
  FOR SELECT USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "staff_insert_lab_expenses" ON cp_lab_expenses
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "staff_update_lab_expenses" ON cp_lab_expenses
  FOR UPDATE USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "admin_delete_lab_expenses" ON cp_lab_expenses
  FOR DELETE USING (is_admin());

CREATE TRIGGER trg_cp_lab_expenses_updated_at
  BEFORE UPDATE ON cp_lab_expenses
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_cp_lab_expenses_audit
  AFTER INSERT OR UPDATE OR DELETE ON cp_lab_expenses
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- =============================================================================
-- TABLE: cp_lab_staff
-- Lab staff profiles and payroll
-- =============================================================================

CREATE TABLE cp_lab_staff (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name       TEXT NOT NULL,
  designation     TEXT NOT NULL,
  phone           TEXT,
  cnic            TEXT,
  monthly_salary  BIGINT NOT NULL DEFAULT 0,   -- paisas
  join_date       DATE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_by      UUID REFERENCES cp_users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

ALTER TABLE cp_lab_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_lab_staff" ON cp_lab_staff
  FOR SELECT USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "admin_manage_lab_staff" ON cp_lab_staff
  FOR ALL USING (is_admin());

CREATE TRIGGER trg_cp_lab_staff_updated_at
  BEFORE UPDATE ON cp_lab_staff
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_cp_lab_staff_audit
  AFTER INSERT OR UPDATE OR DELETE ON cp_lab_staff
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- =============================================================================
-- TABLE: cp_xray_partners
-- Configurable list of X-ray revenue sharing partners
-- =============================================================================

CREATE TABLE cp_xray_partners (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_name  TEXT NOT NULL,
  partner_type  TEXT NOT NULL DEFAULT 'clinic',   -- 'clinic', 'individual', 'equipment_owner'
  phone         TEXT,
  bank_account  TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  notes         TEXT,
  created_by    UUID REFERENCES cp_users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

ALTER TABLE cp_xray_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_xray_partners" ON cp_xray_partners
  FOR SELECT USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "admin_manage_xray_partners" ON cp_xray_partners
  FOR ALL USING (is_admin());

CREATE TRIGGER trg_cp_xray_partners_updated_at
  BEFORE UPDATE ON cp_xray_partners
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_cp_xray_partners_audit
  AFTER INSERT OR UPDATE OR DELETE ON cp_xray_partners
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- =============================================================================
-- TABLE: cp_xray_revenue
-- Daily X-ray gross revenue entries
-- =============================================================================

CREATE TABLE cp_xray_revenue (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  revenue_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  gross_amount        BIGINT NOT NULL CHECK (gross_amount >= 0),  -- paisas
  description         TEXT,
  patient_count       SMALLINT NOT NULL DEFAULT 0,
  payment_method_id   UUID REFERENCES cp_payment_methods(id),
  payment_status      payment_status NOT NULL DEFAULT 'completed',
  notes               TEXT,
  created_by          UUID REFERENCES cp_users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_cp_xray_revenue_date    ON cp_xray_revenue(revenue_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_cp_xray_revenue_payment ON cp_xray_revenue(payment_method_id) WHERE deleted_at IS NULL;

ALTER TABLE cp_xray_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_xray_revenue" ON cp_xray_revenue
  FOR SELECT USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "staff_insert_xray_revenue" ON cp_xray_revenue
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "staff_update_xray_revenue" ON cp_xray_revenue
  FOR UPDATE USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "admin_delete_xray_revenue" ON cp_xray_revenue
  FOR DELETE USING (is_admin());

CREATE TRIGGER trg_cp_xray_revenue_updated_at
  BEFORE UPDATE ON cp_xray_revenue
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_cp_xray_revenue_audit
  AFTER INSERT OR UPDATE OR DELETE ON cp_xray_revenue
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- =============================================================================
-- TABLE: cp_xray_partner_splits
-- % share per partner per revenue entry — must total 10000 bp
-- =============================================================================

CREATE TABLE cp_xray_partner_splits (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  revenue_id    UUID NOT NULL REFERENCES cp_xray_revenue(id) ON DELETE CASCADE,
  partner_id    UUID NOT NULL REFERENCES cp_xray_partners(id),
  split_pct     INTEGER NOT NULL CHECK (split_pct BETWEEN 0 AND 10000),  -- basis points
  split_amount  BIGINT,                                                    -- paisas (computed on insert)
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  UNIQUE(revenue_id, partner_id)
);

CREATE INDEX idx_cp_xray_splits_revenue ON cp_xray_partner_splits(revenue_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cp_xray_splits_partner ON cp_xray_partner_splits(partner_id) WHERE deleted_at IS NULL;

-- Trigger: validate splits do not exceed 100%
CREATE TRIGGER trg_cp_xray_splits_validate
  AFTER INSERT OR UPDATE ON cp_xray_partner_splits
  FOR EACH ROW EXECUTE FUNCTION fn_validate_xray_splits();

ALTER TABLE cp_xray_partner_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_xray_splits" ON cp_xray_partner_splits
  FOR SELECT USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "admin_manage_xray_splits" ON cp_xray_partner_splits
  FOR ALL USING (is_admin());

CREATE TRIGGER trg_cp_xray_splits_updated_at
  BEFORE UPDATE ON cp_xray_partner_splits
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_cp_xray_splits_audit
  AFTER INSERT OR UPDATE OR DELETE ON cp_xray_partner_splits
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- =============================================================================
-- TABLE: cp_xray_expenses
-- X-ray department expenses
-- =============================================================================

CREATE TABLE cp_xray_expenses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  revenue_id      UUID REFERENCES cp_xray_revenue(id),  -- optional link to revenue entry
  expense_head_id UUID REFERENCES cp_expense_heads(id),
  custom_head     TEXT,
  amount          BIGINT NOT NULL CHECK (amount >= 0),   -- paisas
  description     TEXT,
  receipt_url     TEXT,
  payment_method_id UUID REFERENCES cp_payment_methods(id),
  created_by      UUID REFERENCES cp_users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_cp_xray_expenses_date    ON cp_xray_expenses(expense_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_cp_xray_expenses_revenue ON cp_xray_expenses(revenue_id) WHERE deleted_at IS NULL;

ALTER TABLE cp_xray_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_xray_expenses" ON cp_xray_expenses
  FOR SELECT USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "staff_insert_xray_expenses" ON cp_xray_expenses
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "staff_update_xray_expenses" ON cp_xray_expenses
  FOR UPDATE USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "admin_delete_xray_expenses" ON cp_xray_expenses
  FOR DELETE USING (is_admin());

CREATE TRIGGER trg_cp_xray_expenses_updated_at
  BEFORE UPDATE ON cp_xray_expenses
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_cp_xray_expenses_audit
  AFTER INSERT OR UPDATE OR DELETE ON cp_xray_expenses
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- =============================================================================
-- TABLE: cp_expenses
-- Cross-department general expenses
-- =============================================================================

CREATE TABLE cp_expenses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  department_id   UUID REFERENCES cp_departments(id),   -- NULL = general/admin
  expense_head_id UUID REFERENCES cp_expense_heads(id),
  custom_head     TEXT,
  amount          BIGINT NOT NULL CHECK (amount >= 0),  -- paisas
  description     TEXT NOT NULL,
  receipt_url     TEXT,
  payment_method_id UUID REFERENCES cp_payment_methods(id),
  created_by      UUID REFERENCES cp_users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_cp_expenses_date    ON cp_expenses(expense_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_cp_expenses_dept    ON cp_expenses(department_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cp_expenses_head    ON cp_expenses(expense_head_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cp_expenses_payment ON cp_expenses(payment_method_id) WHERE deleted_at IS NULL;

ALTER TABLE cp_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_expenses" ON cp_expenses
  FOR SELECT USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "staff_insert_expenses" ON cp_expenses
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "staff_update_expenses" ON cp_expenses
  FOR UPDATE USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "admin_delete_expenses" ON cp_expenses
  FOR DELETE USING (is_admin());

CREATE TRIGGER trg_cp_expenses_updated_at
  BEFORE UPDATE ON cp_expenses
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_cp_expenses_audit
  AFTER INSERT OR UPDATE OR DELETE ON cp_expenses
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- =============================================================================
-- TABLE: cp_payments
-- Daily payment records per method per department (reconciliation)
-- =============================================================================

CREATE TABLE cp_payments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  department_id       UUID NOT NULL REFERENCES cp_departments(id),
  payment_method_id   UUID NOT NULL REFERENCES cp_payment_methods(id),
  amount              BIGINT NOT NULL CHECK (amount >= 0),  -- paisas
  reference_no        TEXT,                                  -- JazzCash TxID, bank ref, etc.
  source_type         TEXT NOT NULL DEFAULT 'revenue',       -- 'revenue', 'expense', 'refund'
  source_id           UUID,                                   -- polymorphic reference
  is_reconciled       BOOLEAN NOT NULL DEFAULT FALSE,
  reconciled_at       TIMESTAMPTZ,
  reconciled_by       UUID REFERENCES cp_users(id),
  notes               TEXT,
  created_by          UUID REFERENCES cp_users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_cp_payments_date    ON cp_payments(payment_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_cp_payments_dept    ON cp_payments(department_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cp_payments_method  ON cp_payments(payment_method_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cp_payments_source  ON cp_payments(source_type, source_id) WHERE deleted_at IS NULL;

ALTER TABLE cp_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_payments" ON cp_payments
  FOR SELECT USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "staff_insert_payments" ON cp_payments
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "staff_update_payments" ON cp_payments
  FOR UPDATE USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "admin_delete_payments" ON cp_payments
  FOR DELETE USING (is_admin());

CREATE TRIGGER trg_cp_payments_updated_at
  BEFORE UPDATE ON cp_payments
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_cp_payments_audit
  AFTER INSERT OR UPDATE OR DELETE ON cp_payments
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- =============================================================================
-- TABLE: cp_staff
-- Clinic staff (non-lab, non-doctor)
-- =============================================================================

CREATE TABLE cp_staff (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name       TEXT NOT NULL,
  designation     TEXT NOT NULL,
  department_id   UUID REFERENCES cp_departments(id),
  phone           TEXT,
  cnic            TEXT,
  email           TEXT,
  join_date       DATE,
  monthly_salary  BIGINT NOT NULL DEFAULT 0,  -- paisas
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_by      UUID REFERENCES cp_users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_cp_staff_dept     ON cp_staff(department_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cp_staff_active   ON cp_staff(is_active) WHERE deleted_at IS NULL;

ALTER TABLE cp_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_staff" ON cp_staff
  FOR SELECT USING (is_staff() AND deleted_at IS NULL);

CREATE POLICY "admin_manage_staff" ON cp_staff
  FOR ALL USING (is_admin());

CREATE TRIGGER trg_cp_staff_updated_at
  BEFORE UPDATE ON cp_staff
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_cp_staff_audit
  AFTER INSERT OR UPDATE OR DELETE ON cp_staff
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- =============================================================================
-- TABLE: cp_staff_salary
-- Monthly salary disbursement records
-- =============================================================================

CREATE TABLE cp_staff_salary (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id        UUID NOT NULL REFERENCES cp_staff(id) ON DELETE RESTRICT,
  salary_month    DATE NOT NULL,               -- first day of the month (e.g. 2026-06-01)
  base_salary     BIGINT NOT NULL,             -- paisas
  bonus           BIGINT NOT NULL DEFAULT 0,
  deductions      BIGINT NOT NULL DEFAULT 0,
  net_salary      BIGINT GENERATED ALWAYS AS (base_salary + bonus - deductions) STORED,
  payment_method_id UUID REFERENCES cp_payment_methods(id),
  status          salary_status NOT NULL DEFAULT 'pending',
  paid_at         TIMESTAMPTZ,
  paid_by         UUID REFERENCES cp_users(id),
  notes           TEXT,
  created_by      UUID REFERENCES cp_users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(staff_id, salary_month)
);

CREATE INDEX idx_cp_staff_salary_staff  ON cp_staff_salary(staff_id);
CREATE INDEX idx_cp_staff_salary_month  ON cp_staff_salary(salary_month DESC);
CREATE INDEX idx_cp_staff_salary_status ON cp_staff_salary(status);

ALTER TABLE cp_staff_salary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_salary" ON cp_staff_salary
  FOR SELECT USING (is_staff());

CREATE POLICY "admin_manage_salary" ON cp_staff_salary
  FOR ALL USING (is_admin());

CREATE TRIGGER trg_cp_staff_salary_updated_at
  BEFORE UPDATE ON cp_staff_salary
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_cp_staff_salary_audit
  AFTER INSERT OR UPDATE OR DELETE ON cp_staff_salary
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- =============================================================================
-- TABLE: cp_audit_logs
-- Immutable audit trail — written by triggers only
-- No UPDATE or DELETE policies — records are permanent
-- =============================================================================

CREATE TABLE cp_audit_logs (
  id              BIGSERIAL PRIMARY KEY,
  table_name      TEXT NOT NULL,
  record_id       UUID,
  action          audit_action NOT NULL,
  old_data        JSONB,
  new_data        JSONB,
  performed_by    UUID,                           -- NULL = system/trigger
  performed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cp_audit_table      ON cp_audit_logs(table_name);
CREATE INDEX idx_cp_audit_record     ON cp_audit_logs(record_id) WHERE record_id IS NOT NULL;
CREATE INDEX idx_cp_audit_user       ON cp_audit_logs(performed_by) WHERE performed_by IS NOT NULL;
CREATE INDEX idx_cp_audit_performed  ON cp_audit_logs(performed_at DESC);
CREATE INDEX idx_cp_audit_action     ON cp_audit_logs(action);

-- BRIN index for time-series access patterns on large tables
CREATE INDEX idx_cp_audit_brin_time ON cp_audit_logs USING brin(performed_at);

ALTER TABLE cp_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "admin_select_audit_logs" ON cp_audit_logs
  FOR SELECT USING (is_admin());

-- No one can modify audit logs from application layer
-- (triggers use SECURITY DEFINER and bypass RLS)
-- INSERT is handled by the trigger function — no app policy needed

-- =============================================================================
-- VIEWS (for convenience — no RLS on views; underlying tables are protected)
-- =============================================================================

-- Daily revenue summary view
CREATE OR REPLACE VIEW v_daily_revenue_summary AS
SELECT
  d::DATE AS summary_date,
  'opd' AS department,
  COALESCE(SUM(pv.net_fee), 0) AS revenue_paisas
FROM generate_series(
  NOW() - INTERVAL '90 days',
  NOW(),
  INTERVAL '1 day'
) d
LEFT JOIN cp_patient_visits pv
  ON pv.visit_date = d::DATE AND pv.deleted_at IS NULL

UNION ALL

SELECT
  sale_date AS summary_date,
  'pharmacy' AS department,
  COALESCE(SUM(total_amount), 0)
FROM cp_pharmacy_sales
WHERE deleted_at IS NULL
GROUP BY sale_date

UNION ALL

SELECT
  log_date AS summary_date,
  'laboratory' AS department,
  COALESCE(SUM(total_amount), 0)
FROM cp_lab_test_logs
WHERE deleted_at IS NULL
GROUP BY log_date

UNION ALL

SELECT
  revenue_date AS summary_date,
  'xray' AS department,
  COALESCE(SUM(gross_amount), 0)
FROM cp_xray_revenue
WHERE deleted_at IS NULL
GROUP BY revenue_date;

-- Low stock alerts view
CREATE OR REPLACE VIEW v_low_stock_alerts AS
SELECT
  'pharmacy' AS source,
  id,
  medicine_name AS item_name,
  quantity AS current_stock,
  low_stock_threshold,
  expiry_date
FROM cp_pharmacy_inventory
WHERE quantity <= low_stock_threshold
  AND deleted_at IS NULL
  AND is_active = TRUE

UNION ALL

SELECT
  'laboratory' AS source,
  id,
  chemical_name AS item_name,
  quantity_in_stock::INTEGER AS current_stock,
  low_stock_threshold::INTEGER,
  expiry_date
FROM cp_lab_chemicals
WHERE quantity_in_stock <= low_stock_threshold
  AND deleted_at IS NULL
  AND is_active = TRUE;

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Departments
INSERT INTO cp_departments (name, slug, dept_type, sort_order) VALUES
  ('OPD',        'opd',        'opd',        1),
  ('Pharmacy',   'pharmacy',   'pharmacy',   2),
  ('Laboratory', 'laboratory', 'laboratory', 3),
  ('X-Ray',      'xray',       'xray',       4),
  ('General',    'general',    'general',    5);

-- Payment Methods
INSERT INTO cp_payment_methods (name, slug, icon_name, is_active, sort_order) VALUES
  ('Cash',          'cash',          'Banknote',      TRUE, 1),
  ('JazzCash',      'jazzcash',      'Smartphone',    TRUE, 2),
  ('Easypaisa',     'easypaisa',     'Wallet',        TRUE, 3),
  ('Bank Transfer', 'bank_transfer', 'Building2',     TRUE, 4);

-- System Expense Heads (cross-department)
INSERT INTO cp_expense_heads (name, slug, department_id, is_system, sort_order) VALUES
  ('Salaries & Wages',     'salaries',        NULL, TRUE, 1),
  ('Rent',                 'rent',            NULL, TRUE, 2),
  ('Utilities',            'utilities',       NULL, TRUE, 3),
  ('Maintenance & Repairs','maintenance',     NULL, TRUE, 4),
  ('Medical Supplies',     'medical_supplies',NULL, TRUE, 5),
  ('Printing & Stationery','printing',        NULL, TRUE, 6),
  ('Refreshments',         'refreshments',    NULL, TRUE, 7),
  ('Miscellaneous',        'miscellaneous',   NULL, TRUE, 8);

-- Default Clinic Settings
INSERT INTO cp_settings (setting_group, key, value, label, description) VALUES
  ('clinic', 'clinic_name',             'ClinicPulse Medical Center', 'Clinic Name',           'Display name of the clinic'),
  ('clinic', 'clinic_address',          '',                           'Address',               'Physical address'),
  ('clinic', 'clinic_phone',            '',                           'Phone',                 'Main contact number'),
  ('clinic', 'clinic_email',            '',                           'Email',                 'Main contact email'),
  ('clinic', 'clinic_timezone',         'Asia/Karachi',               'Timezone',              'Display timezone'),
  ('clinic', 'currency_symbol',         'Rs.',                        'Currency Symbol',       'Currency symbol for display'),
  ('opd',    'consultation_fee_default','50000',                      'Default Consult Fee',   'Default consultation fee in paisas (500 PKR)'),
  ('opd',    'show_bp_on_visit',        'true',                       'Show BP on Visit Form', 'Show BP logging section in visit form'),
  ('lab',    'report_header_text',      'ClinicPulse Laboratory',     'Report Header',         'Text shown at top of lab reports'),
  ('lab',    'report_footer_text',      'Results verified by qualified staff', 'Report Footer','Footer text on lab reports'),
  ('xray',   'split_validation',        'true',                       'Validate Split = 100%', 'Enforce that splits must total 100%'),
  ('pharmacy','low_stock_notify',       'true',                       'Low Stock Alerts',      'Show alerts for low-stock items');

-- Default Pharmacy Revenue Split (60% clinic / 30% doctor / 10% staff)
INSERT INTO cp_pharmacy_revenue_split (clinic_pct, doctor_pct, staff_pct, notes)
VALUES (6000, 3000, 1000, 'Initial default configuration');

-- =============================================================================
-- REALTIME CONFIGURATION
-- Enable realtime on high-frequency tables (Supabase dashboard or CLI)
-- =============================================================================

-- Run these via Supabase CLI or dashboard:
-- ALTER PUBLICATION supabase_realtime ADD TABLE cp_patient_visits;
-- ALTER PUBLICATION supabase_realtime ADD TABLE cp_payments;
-- ALTER PUBLICATION supabase_realtime ADD TABLE cp_pharmacy_sales;
-- ALTER PUBLICATION supabase_realtime ADD TABLE cp_lab_test_logs;
-- ALTER PUBLICATION supabase_realtime ADD TABLE cp_xray_revenue;

-- =============================================================================
-- STORAGE BUCKETS (Supabase Storage — run via dashboard or supabase CLI)
-- =============================================================================

-- supabase storage create receipts --public false
-- supabase storage create lab-reports --public false
-- supabase storage create avatars --public true

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
