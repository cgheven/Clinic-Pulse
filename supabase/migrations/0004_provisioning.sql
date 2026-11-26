-- =============================================================================
-- ClinicPulse — Signup provisioning + RPCs
-- On auth.users INSERT (Supabase native signup): create the owner's clinic, their
-- cp_users profile (role=admin), and seed that clinic's default payment methods /
-- expense heads / clinic name. Runs SECURITY DEFINER so it bypasses RLS.
-- Signup metadata (raw_user_meta_data) carries: clinic_name, full_name, country,
-- currency, phone — all set by the /signup form via supabase.auth.signUp options.
-- =============================================================================

SET check_function_bodies = off;

CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_meta     JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_name     TEXT  := NULLIF(trim(v_meta->>'clinic_name'), '');
  v_owner    TEXT  := NULLIF(trim(v_meta->>'full_name'), '');
  v_country  TEXT  := UPPER(COALESCE(NULLIF(trim(v_meta->>'country'), ''), 'PK'));
  v_currency TEXT  := UPPER(COALESCE(NULLIF(trim(v_meta->>'currency'), ''), 'PKR'));
  v_phone    TEXT  := NULLIF(trim(v_meta->>'phone'), '');
  v_clinic   UUID;
BEGIN
  -- Idempotent: if this user already has a profile, do nothing.
  IF EXISTS (SELECT 1 FROM cp_users WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  v_name  := COALESCE(v_name, 'My Clinic');
  v_owner := COALESCE(v_owner, split_part(NEW.email, '@', 1));

  -- 1) Clinic (the tenant) — 14-day trial, no card.
  INSERT INTO cp_clinics (owner_id, name, country, currency, phone, trial_ends_at)
  VALUES (NEW.id, v_name, v_country, v_currency, v_phone, NOW() + INTERVAL '14 days')
  RETURNING id INTO v_clinic;

  -- 2) Owner profile (admin of their own clinic).
  INSERT INTO cp_users (id, clinic_id, email, full_name, role, phone, is_active)
  VALUES (NEW.id, v_clinic, NEW.email, v_owner, 'admin', v_phone, TRUE);

  -- 3) Seed default payment methods. JazzCash/Easypaisa are PK wallets — enabled
  --    only for PK clinics; cash + bank transfer everywhere.
  INSERT INTO cp_payment_methods (clinic_id, method, label, is_enabled, sort_order) VALUES
    (v_clinic, 'cash',          'Cash',          TRUE,                 0),
    (v_clinic, 'bank_transfer', 'Bank Transfer', TRUE,                 1),
    (v_clinic, 'jazzcash',      'JazzCash',      (v_country = 'PK'),   2),
    (v_clinic, 'easypaisa',     'Easypaisa',     (v_country = 'PK'),   3);

  -- 4) Seed default expense heads.
  INSERT INTO cp_expense_heads (clinic_id, name, department, is_active, is_system, sort_order) VALUES
    (v_clinic, 'Rent',          'general', TRUE, TRUE,  0),
    (v_clinic, 'Utilities',     'general', TRUE, TRUE,  1),
    (v_clinic, 'Salaries',      'general', TRUE, TRUE,  2),
    (v_clinic, 'Supplies',      'general', TRUE, FALSE, 3),
    (v_clinic, 'Maintenance',   'general', TRUE, FALSE, 4),
    (v_clinic, 'Miscellaneous', 'general', TRUE, FALSE, 5);

  -- 5) Seed clinic name setting (dashboard header reads cp_settings['clinic.clinic_name']).
  INSERT INTO cp_settings (clinic_id, setting_key, setting_value, updated_by)
  VALUES (v_clinic, 'clinic.clinic_name', to_jsonb(v_name), NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_handle_new_user();

-- ── RPC: replace_parameter_ranges ────────────────────────────────────────────
-- Atomically replace all reference ranges on a lab parameter (delete + re-insert
-- in one transaction). SECURITY INVOKER: RLS + clinic_id autofill scope every
-- row to the caller's clinic; the parameter itself is already clinic-scoped.
CREATE OR REPLACE FUNCTION replace_parameter_ranges(p_parameter_id UUID, p_ranges JSONB)
RETURNS SETOF cp_lab_reference_ranges
LANGUAGE plpgsql AS $$
DECLARE r JSONB;
BEGIN
  DELETE FROM cp_lab_reference_ranges WHERE parameter_id = p_parameter_id;

  FOR r IN SELECT * FROM jsonb_array_elements(COALESCE(p_ranges, '[]'::jsonb))
  LOOP
    INSERT INTO cp_lab_reference_ranges
      (parameter_id, sex, age_min_years, age_max_years, low, high, text_value, critical_low, critical_high, note)
    VALUES (
      p_parameter_id,
      COALESCE(r->>'sex', 'any'),
      NULLIF(r->>'age_min_years','')::NUMERIC,
      NULLIF(r->>'age_max_years','')::NUMERIC,
      NULLIF(r->>'low','')::NUMERIC,
      NULLIF(r->>'high','')::NUMERIC,
      r->>'text_value',
      NULLIF(r->>'critical_low','')::NUMERIC,
      NULLIF(r->>'critical_high','')::NUMERIC,
      r->>'note'
    );
  END LOOP;

  RETURN QUERY
    SELECT * FROM cp_lab_reference_ranges
    WHERE parameter_id = p_parameter_id
    ORDER BY created_at;
END;
$$;
