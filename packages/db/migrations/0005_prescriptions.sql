-- Migration: 0005_prescriptions
-- Adds prescriptions and prescription_items tables for the e-Rx builder.

--> statement-breakpoint
CREATE TABLE "prescriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"dentist_id" uuid,
	"encounter_id" uuid,
	"amended_from_id" uuid,
	"prc_license_number" varchar(50),
	"clinic_name_snapshot" varchar(200),
	"clinic_address_snapshot" text,
	"patient_name_snapshot" varchar(200),
	"dentist_name_snapshot" varchar(200),
	"notes" text,
	"issued_at" timestamp with time zone,
	"issued_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "prescription_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prescription_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"medicine_name" varchar(300) NOT NULL,
	"dosage" varchar(200),
	"frequency" varchar(200),
	"duration" varchar(200),
	"special_instructions" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_clinic_id_clinics_id_fk"
  FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE restrict ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_branch_id_branches_id_fk"
  FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_patients_id_fk"
  FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_dentist_id_dentists_id_fk"
  FOREIGN KEY ("dentist_id") REFERENCES "public"."dentists"("id") ON DELETE set null ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_encounter_id_encounters_id_fk"
  FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescription_id_prescriptions_id_fk"
  FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_clinic_id_clinics_id_fk"
  FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE restrict ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_amended_from_id_prescriptions_id_fk"
  FOREIGN KEY ("amended_from_id") REFERENCES "public"."prescriptions"("id") ON DELETE restrict ON UPDATE no action;

--> statement-breakpoint
CREATE INDEX "prescriptions_clinic_id_idx" ON "prescriptions" ("clinic_id");
CREATE INDEX "prescriptions_patient_id_idx" ON "prescriptions" ("patient_id");
CREATE INDEX "prescriptions_encounter_id_idx" ON "prescriptions" ("encounter_id");
CREATE INDEX "prescriptions_dentist_id_idx" ON "prescriptions" ("dentist_id");
CREATE INDEX "prescriptions_amended_from_id_idx" ON "prescriptions" ("amended_from_id");
CREATE INDEX "prescription_items_prescription_id_idx" ON "prescription_items" ("prescription_id");
CREATE INDEX "prescription_items_clinic_id_idx" ON "prescription_items" ("clinic_id");
