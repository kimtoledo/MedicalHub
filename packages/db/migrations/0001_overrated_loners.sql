DO $$ BEGIN
 CREATE TYPE "public"."encounter_status" AS ENUM('draft', 'final');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patient_dental_histories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"last_dental_visit" varchar(50),
	"previous_treatments" text,
	"has_sensitivity" varchar(10),
	"has_bleeding_gums" varchar(10),
	"has_pain" varchar(10),
	"oral_habits" text,
	"orthodontic_history" text,
	"chief_concerns" text,
	"notes" text,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "encounters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"dentist_id" uuid,
	"appointment_id" uuid,
	"date" varchar(20) NOT NULL,
	"chief_complaint" text,
	"examination" text,
	"assessment" text,
	"procedures" text,
	"recommendations" text,
	"notes" text,
	"status" "encounter_status" DEFAULT 'draft' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "treatment_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"encounter_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"service_id" uuid,
	"tooth_ref" varchar(50),
	"notes" text,
	"performed_by" uuid,
	"performed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "odontogram_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"dentist_id" uuid,
	"encounter_id" uuid,
	"tooth_number" varchar(10) NOT NULL,
	"surfaces" varchar(30) DEFAULT '' NOT NULL,
	"condition_code" varchar(50),
	"procedure_code" varchar(50),
	"note" text,
	"correction_of" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_dental_histories" ADD CONSTRAINT "patient_dental_histories_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_dental_histories" ADD CONSTRAINT "patient_dental_histories_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encounters" ADD CONSTRAINT "encounters_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encounters" ADD CONSTRAINT "encounters_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encounters" ADD CONSTRAINT "encounters_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encounters" ADD CONSTRAINT "encounters_dentist_id_dentists_id_fk" FOREIGN KEY ("dentist_id") REFERENCES "public"."dentists"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "treatment_records" ADD CONSTRAINT "treatment_records_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "treatment_records" ADD CONSTRAINT "treatment_records_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "treatment_records" ADD CONSTRAINT "treatment_records_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "treatment_records" ADD CONSTRAINT "treatment_records_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "treatment_records" ADD CONSTRAINT "treatment_records_performed_by_dentists_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."dentists"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "odontogram_events" ADD CONSTRAINT "odontogram_events_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "odontogram_events" ADD CONSTRAINT "odontogram_events_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "odontogram_events" ADD CONSTRAINT "odontogram_events_dentist_id_dentists_id_fk" FOREIGN KEY ("dentist_id") REFERENCES "public"."dentists"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dental_hist_patient_id_idx" ON "patient_dental_histories" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "encounters_clinic_id_idx" ON "encounters" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "encounters_patient_id_idx" ON "encounters" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "encounters_dentist_id_idx" ON "encounters" USING btree ("dentist_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "encounters_date_idx" ON "encounters" USING btree ("clinic_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "encounters_appointment_id_idx" ON "encounters" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_records_clinic_id_idx" ON "treatment_records" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_records_encounter_id_idx" ON "treatment_records" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "treatment_records_patient_id_idx" ON "treatment_records" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "odontogram_clinic_id_idx" ON "odontogram_events" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "odontogram_patient_id_idx" ON "odontogram_events" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "odontogram_tooth_idx" ON "odontogram_events" USING btree ("patient_id","tooth_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "odontogram_encounter_id_idx" ON "odontogram_events" USING btree ("encounter_id");