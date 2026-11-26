-- =============================================================================
-- ClinicPulse — Audit log cascade fix
-- cp_audit_logs.clinic_id had an FK to cp_clinics. When an owner (auth.users) is
-- deleted, the cascade deletes the clinic and its rows; each row's DELETE audit
-- trigger then INSERTs an audit row referencing the clinic being deleted in the
-- same statement → FK violation → the whole delete fails. Audit logs are an
-- append-only historical record and should not be bound by that FK, so drop it.
-- clinic_id remains a plain column (still used for per-clinic RLS scoping).
-- =============================================================================

ALTER TABLE cp_audit_logs DROP CONSTRAINT IF EXISTS cp_audit_logs_clinic_id_fkey;
