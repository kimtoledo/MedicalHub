-- Reconciles the two valid migration histories that were merged after both
-- branches had independently allocated migration numbers 0004 through 0007.
-- Every statement is safe when the original migration has already run.

ALTER TABLE "packages"
  ADD COLUMN IF NOT EXISTS "price_display" varchar(50) DEFAULT 'Contact us' NOT NULL;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'package_features_package_key_unique'
      AND conrelid = 'package_features'::regclass
  ) THEN
    ALTER TABLE "package_features"
      ADD CONSTRAINT "package_features_package_key_unique"
      UNIQUE("package_id", "feature_key");
  END IF;
END
$$;
--> statement-breakpoint

ALTER TABLE "clinics"
  ADD COLUMN IF NOT EXISTS "hero_text" varchar(300);
--> statement-breakpoint

ALTER TABLE "branches"
  ADD COLUMN IF NOT EXISTS "operating_hours" text;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'patients_clinic_patient_number_unique'
      AND conrelid = 'patients'::regclass
  ) THEN
    ALTER TABLE "patients"
      ADD CONSTRAINT "patients_clinic_patient_number_unique"
      UNIQUE("clinic_id", "patient_number");
  END IF;
END
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION dentra_prevent_audit_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only'
    USING ERRCODE = '55000';
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS audit_events_append_only ON audit_events;
--> statement-breakpoint

CREATE TRIGGER audit_events_append_only
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW
EXECUTE FUNCTION dentra_prevent_audit_event_mutation();
