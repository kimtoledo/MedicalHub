CREATE TYPE "public"."review_report_status" AS ENUM('pending', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TABLE "review_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"reason" varchar(100) NOT NULL,
	"details" text,
	"status" "review_report_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_reports_review_account_unique" UNIQUE("review_id","account_id")
);
--> statement-breakpoint
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_review_id_clinic_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."clinic_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_account_id_patient_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."patient_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "review_reports_review_idx" ON "review_reports" USING btree ("review_id","status");