-- =============================================================================
-- ClinicPulse — RLS + triggers for all data tables
-- Uniform per table: enable RLS, one clinic-isolation policy (FOR ALL), and a
-- BEFORE INSERT clinic_id autofill. Role nuance (admin vs accountant) is enforced
-- by the app (requireAdmin / middleware); the DB guarantees TENANT ISOLATION.
-- =============================================================================

SET check_function_bodies = off;

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'cp_settings','cp_payment_methods','cp_doctors','cp_patients','cp_patient_visits',
    'cp_pharmacy_inventory','cp_pharmacy_sales','cp_pharmacy_sale_items',
    'cp_lab_tests','cp_lab_test_logs','cp_lab_test_parameters','cp_lab_reference_ranges',
    'cp_lab_result_values','cp_lab_chemicals','cp_lab_machinery','cp_lab_maintenance',
    'cp_xray_revenue','cp_xray_partners','cp_xray_partner_splits',
    'cp_expense_heads','cp_expenses','cp_staff','cp_salary_records',
    'cp_bp_logs','cp_pharmacy_revenue_split'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(clinic_id);', 'idx_'||t||'_clinic', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'clinic_isolation', t);
    EXECUTE format($f$
      CREATE POLICY %I ON %I FOR ALL
      USING (clinic_id = cp_current_clinic_id())
      WITH CHECK (clinic_id = cp_current_clinic_id());
    $f$, 'clinic_isolation', t);
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I;', 'trg_aa_set_clinic', t);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION fn_set_clinic_id();',
      'trg_aa_set_clinic', t);
  END LOOP;
END $$;

-- ── updated_at triggers (only tables that have the column) ───────────────────
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'cp_settings','cp_doctors','cp_patients','cp_patient_visits','cp_pharmacy_inventory',
    'cp_pharmacy_sales','cp_lab_result_values','cp_lab_chemicals','cp_lab_machinery',
    'cp_xray_partners','cp_expenses','cp_staff'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I;', 'trg_updated_at', t);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();',
      'trg_updated_at', t);
  END LOOP;
END $$;

-- ── Per-clinic sequential numbering (replaces generic autofill on these two) ──
DROP TRIGGER IF EXISTS trg_bb_assign_no ON cp_patients;
CREATE TRIGGER trg_bb_assign_no
  BEFORE INSERT ON cp_patients FOR EACH ROW EXECUTE FUNCTION fn_assign_patient_no();

DROP TRIGGER IF EXISTS trg_bb_assign_no ON cp_patient_visits;
CREATE TRIGGER trg_bb_assign_no
  BEFORE INSERT ON cp_patient_visits FOR EACH ROW EXECUTE FUNCTION fn_assign_voucher_no();

-- ── Audit triggers (financially / clinically sensitive tables) ───────────────
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'cp_patients','cp_patient_visits','cp_doctors','cp_expenses','cp_pharmacy_sales',
    'cp_xray_revenue','cp_settings','cp_staff','cp_salary_records','cp_lab_test_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I;', 'trg_audit', t);
    EXECUTE format(
      'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION fn_audit_log();',
      'trg_audit', t);
  END LOOP;
END $$;
