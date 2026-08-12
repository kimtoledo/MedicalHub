CREATE TYPE "public"."ai_imaging_status" AS ENUM('queued', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "ai_imaging_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"encounter_id" uuid,
	"model" varchar(100) NOT NULL,
	"status" "ai_imaging_status" DEFAULT 'queued' NOT NULL,
	"findings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"oral_health_score" integer,
	"confirmed_by" uuid,
	"confirmed_at" timestamp with time zone,
	"failure_reason" varchar(300),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_imaging_analyses" ADD CONSTRAINT "ai_imaging_analyses_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_imaging_analyses" ADD CONSTRAINT "ai_imaging_analyses_file_id_clinical_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."clinical_files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_imaging_analyses" ADD CONSTRAINT "ai_imaging_analyses_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_imaging_analyses" ADD CONSTRAINT "ai_imaging_analyses_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_imaging_analyses" ADD CONSTRAINT "ai_imaging_analyses_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_imaging_clinic_idx" ON "ai_imaging_analyses" USING btree ("clinic_id","status");--> statement-breakpoint
CREATE INDEX "ai_imaging_file_idx" ON "ai_imaging_analyses" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "ai_imaging_patient_idx" ON "ai_imaging_analyses" USING btree ("patient_id");