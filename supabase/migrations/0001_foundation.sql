-- =============================================================================
-- ClinicPulse — Multi-tenant foundation
-- Source of truth: types/database.ts (NOT the stale SCHEMA.sql).
-- Tenancy unit: cp_clinics (one clinic per owner account). Every data table
-- carries clinic_id and is isolated by RLS scoped to cp_current_clinic_id().
-- Money: BIGINT minor units (generic; was "paisas"). Percentages: numeric 0-100.
-- =============================================================================

-- Defer function-body validation so helper functions can reference tables
-- created later in this same migration (they all exist by the time any runs).
SET check_function_bodies = off;

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- trigram search
CREATE EXTENSION IF NOT EXISTS "unaccent";   -- accent-insensitive search

-- ── Generic helpers ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- The clinic_id of the currently authenticated user. SECURITY DEFINER so it
-- reads cp_users without triggering cp_users' own RLS (breaks recursion — same
-- trick HMS uses for its super-admin helper).
CREATE OR REPLACE FUNCTION cp_current_clinic_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT clinic_id FROM cp_users
  WHERE id = auth.uid() AND deleted_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role::TEXT FROM cp_users
  WHERE id = auth.uid() AND deleted_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM cp_users
    WHERE id = auth.uid() AND role = 'admin' AND deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM cp_users
    WHERE id = auth.uid() AND role IN ('admin','accountant') AND deleted_at IS NULL
  );
$$;

-- BEFORE INSERT auto-fill: stamp the caller's clinic on any row that didn't set
-- one, so existing app inserts work unchanged and RLS WITH CHECK still passes.
-- A row that explicitly sets clinic_id (seed/provisioning) is left untouched.
CREATE OR REPLACE FUNCTION fn_set_clinic_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.clinic_id IS NULL THEN
    NEW.clinic_id := cp_current_clinic_id();
  END IF;
  RETURN NEW;
END;
$$;

-- ── Tenancy core: cp_clinics ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cp_clinics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  country       TEXT NOT NULL DEFAULT 'PK',     -- ISO 3166-1 alpha-2
  currency      TEXT NOT NULL DEFAULT 'PKR',    -- ISO 4217
  phone         TEXT,                           -- E.164
  trial_ends_at TIMESTAMPTZ,                    -- NULL = no trial window
  frozen        BOOLEAN NOT NULL DEFAULT FALSE, -- unpaid/suspended (future paywall)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_cp_clinics_owner ON cp_clinics(owner_id);

ALTER TABLE cp_clinics ENABLE ROW LEVEL SECURITY;

-- Guard billing/ownership columns: only the service role (auth.uid() IS NULL,
-- i.e. provisioning / server with service key) may change trial/frozen/owner.
CREATE OR REPLACE FUNCTION fn_guard_clinic_billing()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
       OR NEW.frozen IS DISTINCT FROM OLD.frozen
       OR NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      RAISE EXCEPTION 'Billing/ownership columns are not client-editable';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cp_clinics_updated_at ON cp_clinics;
CREATE TRIGGER trg_cp_clinics_updated_at
  BEFORE UPDATE ON cp_clinics FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_cp_clinics_guard ON cp_clinics;
CREATE TRIGGER trg_cp_clinics_guard
  BEFORE UPDATE ON cp_clinics FOR EACH ROW EXECUTE FUNCTION fn_guard_clinic_billing();

DROP POLICY IF EXISTS "clinic_select_own" ON cp_clinics;
CREATE POLICY "clinic_select_own" ON cp_clinics
  FOR SELECT USING (id = cp_current_clinic_id() OR owner_id = auth.uid());

DROP POLICY IF EXISTS "clinic_update_own" ON cp_clinics;
CREATE POLICY "clinic_update_own" ON cp_clinics
  FOR UPDATE USING (id = cp_current_clinic_id() AND is_admin())
  WITH CHECK (id = cp_current_clinic_id());
-- No INSERT/DELETE policy: clinics are created only by the SECURITY DEFINER
-- provisioning trigger (which bypasses RLS). Clients cannot create clinics.

-- ── cp_users (profile; extends auth.users) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS cp_users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id   UUID REFERENCES cp_clinics(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'accountant' CHECK (role IN ('admin','accountant')),
  avatar_url  TEXT,
  phone       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_cp_users_clinic ON cp_users(clinic_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cp_users_role   ON cp_users(role) WHERE deleted_at IS NULL;

ALTER TABLE cp_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own" ON cp_users;
CREATE POLICY "users_select_own" ON cp_users
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "admin_select_clinic_users" ON cp_users;
CREATE POLICY "admin_select_clinic_users" ON cp_users
  FOR SELECT USING (is_admin() AND clinic_id = cp_current_clinic_id());

DROP POLICY IF EXISTS "admin_insert_clinic_users" ON cp_users;
CREATE POLICY "admin_insert_clinic_users" ON cp_users
  FOR INSERT WITH CHECK (is_admin() AND clinic_id = cp_current_clinic_id());

DROP POLICY IF EXISTS "admin_update_clinic_users" ON cp_users;
CREATE POLICY "admin_update_clinic_users" ON cp_users
  FOR UPDATE USING (is_admin() AND clinic_id = cp_current_clinic_id());

-- Users may update their own safe fields (avatar_url, phone, full_name) only —
-- never their role, clinic, or active flag (re-asserted via WITH CHECK).
DROP POLICY IF EXISTS "users_update_own_safe_fields" ON cp_users;
CREATE POLICY "users_update_own_safe_fields" ON cp_users
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role      = (SELECT role      FROM cp_users WHERE id = auth.uid())
    AND is_active = (SELECT is_active FROM cp_users WHERE id = auth.uid())
    AND clinic_id IS NOT DISTINCT FROM (SELECT clinic_id FROM cp_users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_delete_clinic_users" ON cp_users;
CREATE POLICY "admin_delete_clinic_users" ON cp_users
  FOR DELETE USING (is_admin() AND clinic_id = cp_current_clinic_id());

DROP TRIGGER IF EXISTS trg_cp_users_updated_at ON cp_users;
CREATE TRIGGER trg_cp_users_updated_at
  BEFORE UPDATE ON cp_users FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ── cp_audit_logs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cp_audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id    UUID REFERENCES cp_clinics(id) ON DELETE CASCADE,
  table_name   TEXT NOT NULL,
  record_id    UUID,
  action       TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_data     JSONB,
  new_data     JSONB,
  performed_by UUID,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cp_audit_clinic ON cp_audit_logs(clinic_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_cp_audit_table  ON cp_audit_logs(table_name, record_id);

ALTER TABLE cp_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_clinic_audit" ON cp_audit_logs;
CREATE POLICY "admin_select_clinic_audit" ON cp_audit_logs
  FOR SELECT USING (is_admin() AND clinic_id = cp_current_clinic_id());
-- Writes happen only via fn_audit_log (SECURITY DEFINER); no client write policy.

-- Audit trigger: captures the row's clinic_id so logs stay per-tenant.
CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_record_id UUID;
  v_old JSONB;
  v_new JSONB;
  v_action TEXT;
  v_clinic UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_record_id := NEW.id; v_old := NULL; v_new := to_jsonb(NEW); v_action := 'INSERT';
  ELSIF TG_OP = 'UPDATE' THEN
    v_record_id := NEW.id; v_old := to_jsonb(OLD); v_new := to_jsonb(NEW); v_action := 'UPDATE';
  ELSE
    v_record_id := OLD.id; v_old := to_jsonb(OLD); v_new := NULL; v_action := 'DELETE';
  END IF;

  v_clinic := COALESCE(
    (v_new->>'clinic_id')::UUID,
    (v_old->>'clinic_id')::UUID,
    cp_current_clinic_id()
  );

  INSERT INTO cp_audit_logs (clinic_id, table_name, record_id, action, old_data, new_data, performed_by)
  VALUES (v_clinic, TG_TABLE_NAME, v_record_id, v_action, v_old, v_new, auth.uid());

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
