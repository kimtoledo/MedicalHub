CREATE TYPE "public"."clinic_verification_status" AS ENUM('unverified', 'pending', 'verified');--> statement-breakpoint
CREATE TYPE "public"."verification_subject" AS ENUM('dentist', 'clinic');--> statement-breakpoint
CREATE TYPE "public"."verification_submission_status" AS ENUM('pending', 'approved', 'rejected', 'revoked');--> statement-breakpoint
CREATE TABLE "verification_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_type" "verification_subject" NOT NULL,
	"dentist_id" uuid,
	"clinic_id" uuid,
	"documents" text NOT NULL,
	"status" "verification_submission_status" DEFAULT 'pending' NOT NULL,
	"submitted_by" uuid NOT NULL,
	"reviewed_by" uuid,
	"review_reason" text,
	"expires_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "verification_status" "clinic_verification_status" DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE "verification_submissions" ADD CONSTRAINT "verification_submissions_dentist_id_dentists_id_fk" FOREIGN KEY ("dentist_id") REFERENCES "public"."dentists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_submissions" ADD CONSTRAINT "verification_submissions_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "verification_dentist_idx" ON "verification_submissions" USING btree ("dentist_id","status");--> statement-breakpoint
CREATE INDEX "verification_clinic_idx" ON "verification_submissions" USING btree ("clinic_id","status");--> statement-breakpoint
CREATE INDEX "verification_status_idx" ON "verification_submissions" USING btree ("status");