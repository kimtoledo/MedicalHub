-- Migration: 0006_clinical_files
-- Adds clinical_files table for private X-ray / photo / document storage.

--> statement-breakpoint
CREATE TABLE "clinical_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"encounter_id" uuid,
	"file_type" varchar(50) NOT NULL,
	"storage_key" varchar(500) NOT NULL,
	"original_filename" varchar(300) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"tooth_ref" varchar(50),
	"notes" text,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE "clinical_files" ADD CONSTRAINT "clinical_files_clinic_id_clinics_id_fk"
  FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE restrict ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "clinical_files" ADD CONSTRAINT "clinical_files_branch_id_branches_id_fk"
  FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "clinical_files" ADD CONSTRAINT "clinical_files_patient_id_patients_id_fk"
  FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "clinical_files" ADD CONSTRAINT "clinical_files_encounter_id_encounters_id_fk"
  FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;

--> statement-breakpoint
CREATE INDEX "clinical_files_clinic_id_idx" ON "clinical_files" ("clinic_id");
CREATE INDEX "clinical_files_patient_id_idx" ON "clinical_files" ("patient_id");
CREATE INDEX "clinical_files_encounter_id_idx" ON "clinical_files" ("encounter_id");
CREATE INDEX "clinical_files_file_type_idx" ON "clinical_files" ("clinic_id", "file_type");
