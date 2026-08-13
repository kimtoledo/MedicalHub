CREATE TYPE "public"."patient_referral_status" AS ENUM('pending', 'accepted', 'declined');--> statement-breakpoint
CREATE TABLE "patient_referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"source_clinic_id" uuid NOT NULL,
	"source_patient_id" uuid NOT NULL,
	"target_clinic_id" uuid NOT NULL,
	"target_patient_id" uuid,
	"reason" text NOT NULL,
	"consented_at" timestamp with time zone NOT NULL,
	"status" "patient_referral_status" DEFAULT 'pending' NOT NULL,
	"created_by" uuid NOT NULL,
	"responded_by" uuid,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patient_referrals" ADD CONSTRAINT "patient_referrals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_referrals" ADD CONSTRAINT "patient_referrals_source_clinic_id_clinics_id_fk" FOREIGN KEY ("source_clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_referrals" ADD CONSTRAINT "patient_referrals_source_patient_id_patients_id_fk" FOREIGN KEY ("source_patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_referrals" ADD CONSTRAINT "patient_referrals_target_clinic_id_clinics_id_fk" FOREIGN KEY ("target_clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_referrals" ADD CONSTRAINT "patient_referrals_target_patient_id_patients_id_fk" FOREIGN KEY ("target_patient_id") REFERENCES "public"."patients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "patient_referrals_source_clinic_idx" ON "patient_referrals" USING btree ("source_clinic_id","status");--> statement-breakpoint
CREATE INDEX "patient_referrals_target_clinic_idx" ON "patient_referrals" USING btree ("target_clinic_id","status");