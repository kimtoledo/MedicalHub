-- Migration: 0008_remote_assessments
-- Tele-dentistry remote photo consultation requests.

--> statement-breakpoint
CREATE TABLE "remote_assessments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "clinic_id" uuid NOT NULL,
  "patient_name" varchar(200) NOT NULL,
  "patient_email" varchar(300) NOT NULL,
  "patient_phone" varchar(50),
  "complaint" text NOT NULL,
  "photos" jsonb NOT NULL DEFAULT '[]',
  "status" varchar(30) NOT NULL DEFAULT 'pending',
  "dentist_notes" text,
  "next_step" varchar(50),
  "reviewed_by" uuid,
  "reviewed_at" timestamp with time zone,
  "patient_id" uuid,
  "email_sent" varchar(5) NOT NULL DEFAULT 'false',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE "remote_assessments"
  ADD CONSTRAINT "remote_assessments_clinic_id_clinics_id_fk"
  FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE restrict ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "remote_assessments"
  ADD CONSTRAINT "remote_assessments_reviewed_by_users_id_fk"
  FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "remote_assessments"
  ADD CONSTRAINT "remote_assessments_patient_id_patients_id_fk"
  FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE set null ON UPDATE no action;

--> statement-breakpoint
CREATE INDEX "remote_assessments_clinic_id_idx"  ON "remote_assessments" ("clinic_id");
CREATE INDEX "remote_assessments_status_idx"      ON "remote_assessments" ("clinic_id", "status");
CREATE INDEX "remote_assessments_email_idx"       ON "remote_assessments" ("patient_email");
CREATE INDEX "remote_assessments_patient_id_idx"  ON "remote_assessments" ("patient_id");
