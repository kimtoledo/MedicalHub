-- Migration: 0009_hmo_claims
-- HMO / Insurance claims module.

--> statement-breakpoint
-- HMO payer catalog (per clinic)
CREATE TABLE "hmo_payers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "clinic_id" uuid NOT NULL,
  "name" varchar(200) NOT NULL,
  "accreditation_number" varchar(100),
  "contact_person" varchar(200),
  "contact_phone" varchar(50),
  "contact_email" varchar(300),
  "notes" text,
  "is_active" varchar(5) NOT NULL DEFAULT 'true',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE "hmo_payers"
  ADD CONSTRAINT "hmo_payers_clinic_id_clinics_id_fk"
  FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
CREATE INDEX "hmo_payers_clinic_id_idx" ON "hmo_payers" ("clinic_id");

--> statement-breakpoint
-- Patient HMO memberships (card records)
CREATE TABLE "patient_hmo_memberships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "clinic_id" uuid NOT NULL,
  "patient_id" uuid NOT NULL,
  "hmo_payer_id" uuid,
  "payer_name_snapshot" varchar(200) NOT NULL,
  "card_number" varchar(100) NOT NULL,
  "member_name" varchar(200),
  "coverage_type" varchar(30) NOT NULL DEFAULT 'dental',
  "effective_date" varchar(20),
  "expiry_date" varchar(20),
  "is_active" varchar(5) NOT NULL DEFAULT 'true',
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE "patient_hmo_memberships"
  ADD CONSTRAINT "patient_hmo_memberships_clinic_id_clinics_id_fk"
  FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE restrict ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "patient_hmo_memberships"
  ADD CONSTRAINT "patient_hmo_memberships_patient_id_patients_id_fk"
  FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "patient_hmo_memberships"
  ADD CONSTRAINT "patient_hmo_memberships_hmo_payer_id_hmo_payers_id_fk"
  FOREIGN KEY ("hmo_payer_id") REFERENCES "public"."hmo_payers"("id") ON DELETE set null ON UPDATE no action;

--> statement-breakpoint
CREATE INDEX "patient_hmo_memberships_patient_id_idx" ON "patient_hmo_memberships" ("patient_id");
CREATE INDEX "patient_hmo_memberships_clinic_id_idx"  ON "patient_hmo_memberships" ("clinic_id");

--> statement-breakpoint
-- HMO claims tracker
CREATE TABLE "hmo_claims" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "clinic_id" uuid NOT NULL,
  "patient_id" uuid NOT NULL,
  "hmo_payer_id" uuid,
  "payer_name_snapshot" varchar(200) NOT NULL,
  "membership_id" uuid,
  "invoice_id" uuid,
  "encounter_id" uuid,
  "claim_number" varchar(60) NOT NULL,
  "loa_code" varchar(100),
  "claim_amount_php" numeric(10,2) NOT NULL,
  "approved_amount_php" numeric(10,2),
  "status" varchar(30) NOT NULL DEFAULT 'prepared',
  "submitted_at" timestamp with time zone,
  "approved_at" timestamp with time zone,
  "rejected_at" timestamp with time zone,
  "paid_at" timestamp with time zone,
  "rejection_reason" text,
  "notes" text,
  "prepared_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE "hmo_claims"
  ADD CONSTRAINT "hmo_claims_clinic_id_clinics_id_fk"
  FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE restrict ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "hmo_claims"
  ADD CONSTRAINT "hmo_claims_patient_id_patients_id_fk"
  FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "hmo_claims"
  ADD CONSTRAINT "hmo_claims_hmo_payer_id_hmo_payers_id_fk"
  FOREIGN KEY ("hmo_payer_id") REFERENCES "public"."hmo_payers"("id") ON DELETE set null ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "hmo_claims"
  ADD CONSTRAINT "hmo_claims_membership_id_patient_hmo_memberships_id_fk"
  FOREIGN KEY ("membership_id") REFERENCES "public"."patient_hmo_memberships"("id") ON DELETE set null ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "hmo_claims"
  ADD CONSTRAINT "hmo_claims_invoice_id_invoices_id_fk"
  FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "hmo_claims"
  ADD CONSTRAINT "hmo_claims_encounter_id_encounters_id_fk"
  FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "hmo_claims"
  ADD CONSTRAINT "hmo_claims_prepared_by_users_id_fk"
  FOREIGN KEY ("prepared_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

--> statement-breakpoint
CREATE INDEX "hmo_claims_clinic_id_idx"    ON "hmo_claims" ("clinic_id");
CREATE INDEX "hmo_claims_patient_id_idx"   ON "hmo_claims" ("patient_id");
CREATE INDEX "hmo_claims_invoice_id_idx"   ON "hmo_claims" ("invoice_id");
CREATE INDEX "hmo_claims_status_idx"       ON "hmo_claims" ("clinic_id", "status");
CREATE UNIQUE INDEX "hmo_claims_claim_number_idx" ON "hmo_claims" ("claim_number");

--> statement-breakpoint
-- Add HMO coverage fields to services
ALTER TABLE "services"
  ADD COLUMN IF NOT EXISTS "is_hmo_covered" varchar(5) NOT NULL DEFAULT 'false',
  ADD COLUMN IF NOT EXISTS "hmo_standard_rate_php" numeric(10,2);
