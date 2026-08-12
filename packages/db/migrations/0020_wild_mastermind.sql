CREATE TYPE "public"."recall_status" AS ENUM('upcoming', 'due', 'contacted', 'dismissed', 'booked');--> statement-breakpoint
CREATE TABLE "patient_recalls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"service_id" uuid,
	"rule_id" uuid,
	"treatment_record_id" uuid,
	"due_at" timestamp with time zone NOT NULL,
	"status" "recall_status" DEFAULT 'upcoming' NOT NULL,
	"last_contacted_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	"override_reason" text,
	"booked_appointment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patient_recalls_treatment_unique" UNIQUE("treatment_record_id")
);
--> statement-breakpoint
CREATE TABLE "recall_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"interval_days" integer NOT NULL,
	"is_active" varchar(10) DEFAULT 'true' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recall_rules_clinic_service_unique" UNIQUE("clinic_id","service_id")
);
--> statement-breakpoint
ALTER TABLE "patient_recalls" ADD CONSTRAINT "patient_recalls_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_recalls" ADD CONSTRAINT "patient_recalls_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_recalls" ADD CONSTRAINT "patient_recalls_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_recalls" ADD CONSTRAINT "patient_recalls_rule_id_recall_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."recall_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_recalls" ADD CONSTRAINT "patient_recalls_treatment_record_id_treatment_records_id_fk" FOREIGN KEY ("treatment_record_id") REFERENCES "public"."treatment_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recall_rules" ADD CONSTRAINT "recall_rules_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recall_rules" ADD CONSTRAINT "recall_rules_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "patient_recalls_clinic_due_idx" ON "patient_recalls" USING btree ("clinic_id","due_at");--> statement-breakpoint
CREATE INDEX "patient_recalls_patient_idx" ON "patient_recalls" USING btree ("clinic_id","patient_id");--> statement-breakpoint
CREATE INDEX "recall_rules_clinic_idx" ON "recall_rules" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "recall_rules_service_idx" ON "recall_rules" USING btree ("clinic_id","service_id");