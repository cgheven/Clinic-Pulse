-- =============================================================================
-- ClinicPulse — Insert-time column defaults (type ergonomics + defense in depth)
--
-- The app's inserts omit clinic_id (and patient_no / voucher_no) and rely on
-- BEFORE INSERT triggers to stamp them. Generated TypeScript types, however, mark
-- any NOT NULL column WITHOUT a default as REQUIRED on insert — which would force
-- every insert call to pass clinic_id. Giving these columns DB-level defaults
-- makes them genuinely optional-on-insert (so the generated types are accurate
-- AND ergonomic) while adding a second layer of tenant stamping behind the
-- triggers.
--
--   • clinic_id      → DEFAULT cp_current_clinic_id()  (the caller's own clinic)
--   • patient_no     → DEFAULT 0, trigger reassigns the real per-clinic number
--   • voucher_no     → DEFAULT 0, trigger reassigns the real per-clinic number
--
-- The numbering triggers are updated to assign on (NULL OR 0) so the placeholder
-- 0 can never persist and collide on UNIQUE(clinic_id, patient_no).
-- =============================================================================

SET check_function_bodies = off;

-- ── clinic_id default on every tenant-scoped data table ──────────────────────
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
    EXECUTE format('ALTER TABLE %I ALTER COLUMN clinic_id SET DEFAULT cp_current_clinic_id();', t);
  END LOOP;
END $$;

-- ── Per-clinic numbering: placeholder default + assign-on-(NULL OR 0) ─────────
ALTER TABLE cp_patients       ALTER COLUMN patient_no SET DEFAULT 0;
ALTER TABLE cp_patient_visits ALTER COLUMN voucher_no SET DEFAULT 0;

CREATE OR REPLACE FUNCTION fn_assign_patient_no()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.clinic_id IS NULL THEN NEW.clinic_id := cp_current_clinic_id(); END IF;
  IF NEW.patient_no IS NULL OR NEW.patient_no = 0 THEN
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
  IF NEW.voucher_no IS NULL OR NEW.voucher_no = 0 THEN
    SELECT COALESCE(MAX(voucher_no),0)+1 INTO NEW.voucher_no
    FROM cp_patient_visits WHERE clinic_id = NEW.clinic_id;
  END IF;
  RETURN NEW;
END;
$$;
