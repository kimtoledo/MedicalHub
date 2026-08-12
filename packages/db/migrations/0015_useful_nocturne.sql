CREATE TYPE "public"."treatment_plan_item_status" AS ENUM('proposed', 'accepted', 'scheduled', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."treatment_plan_status" AS ENUM('draft', 'approved', 'archived');--> statement-breakpoint
CREATE TABLE "treatment_plan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"service_id" uuid,
	"tooth_ref" varchar(50),
	"area" varchar(100),
	"estimated_fee_php" numeric(10, 2) DEFAULT '0' NOT NULL,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"sequence" integer NOT NULL,
	"status" "treatment_plan_item_status" DEFAULT 'proposed' NOT NULL,
	"treatment_record_id" uuid,
	"completed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treatment_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"dentist_id" uuid,
	"title" varchar(200) NOT NULL,
	"notes" text,
	"status" "treatment_plan_status" DEFAULT 'draft' NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "treatment_plan_items" ADD CONSTRAINT "treatment_plan_items_plan_id_treatment_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."treatment_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plan_items" ADD CONSTRAINT "treatment_plan_items_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plan_items" ADD CONSTRAINT "treatment_plan_items_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plan_items" ADD CONSTRAINT "treatment_plan_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plan_items" ADD CONSTRAINT "treatment_plan_items_treatment_record_id_treatment_records_id_fk" FOREIGN KEY ("treatment_record_id") REFERENCES "public"."treatment_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_dentist_id_dentists_id_fk" FOREIGN KEY ("dentist_id") REFERENCES "public"."dentists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "treatment_plan_items_plan_id_idx" ON "treatment_plan_items" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "treatment_plan_items_patient_id_idx" ON "treatment_plan_items" USING btree ("clinic_id","patient_id");--> statement-breakpoint
CREATE INDEX "treatment_plan_items_status_idx" ON "treatment_plan_items" USING btree ("clinic_id","status");--> statement-breakpoint
CREATE INDEX "treatment_plans_clinic_id_idx" ON "treatment_plans" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "treatment_plans_patient_id_idx" ON "treatment_plans" USING btree ("clinic_id","patient_id");--> statement-breakpoint
CREATE INDEX "treatment_plans_dentist_id_idx" ON "treatment_plans" USING btree ("dentist_id");--> statement-breakpoint
CREATE INDEX "treatment_plans_status_idx" ON "treatment_plans" USING btree ("clinic_id","status");
--> statement-breakpoint
INSERT INTO "package_features" ("id", "package_id", "feature_key", "is_enabled")
SELECT gen_random_uuid(), "id", 'clinical.treatment_plans', true
FROM "packages"
WHERE "slug" IN ('professional', 'enterprise')
  AND NOT EXISTS (
    SELECT 1
    FROM "package_features"
    WHERE "package_features"."package_id" = "packages"."id"
      AND "package_features"."feature_key" = 'clinical.treatment_plans'
  );
