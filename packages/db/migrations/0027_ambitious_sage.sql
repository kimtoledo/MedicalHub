CREATE TYPE "public"."review_status" AS ENUM('pending', 'approved', 'rejected', 'hidden');--> statement-breakpoint
CREATE TABLE "clinic_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"dentist_id" uuid,
	"appointment_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text NOT NULL,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"response" text,
	"response_at" timestamp with time zone,
	"moderation_reason" text,
	"moderated_by" uuid,
	"moderated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clinic_reviews_appointment_unique" UNIQUE("appointment_id")
);
--> statement-breakpoint
ALTER TABLE "clinic_reviews" ADD CONSTRAINT "clinic_reviews_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_reviews" ADD CONSTRAINT "clinic_reviews_dentist_id_dentists_id_fk" FOREIGN KEY ("dentist_id") REFERENCES "public"."dentists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_reviews" ADD CONSTRAINT "clinic_reviews_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_reviews" ADD CONSTRAINT "clinic_reviews_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_reviews" ADD CONSTRAINT "clinic_reviews_account_id_patient_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."patient_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clinic_reviews_clinic_idx" ON "clinic_reviews" USING btree ("clinic_id","status");--> statement-breakpoint
CREATE INDEX "clinic_reviews_dentist_idx" ON "clinic_reviews" USING btree ("dentist_id","status");--> statement-breakpoint
CREATE INDEX "clinic_reviews_patient_idx" ON "clinic_reviews" USING btree ("patient_id");