CREATE TYPE "public"."patient_account_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."patient_portal_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."patient_portal_request_type" AS ENUM('contact_update', 'appointment_cancel', 'appointment_reschedule');--> statement-breakpoint
CREATE TABLE "patient_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255),
	"phone" varchar(20),
	"password_hash" text NOT NULL,
	"status" "patient_account_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_portal_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"consented_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patient_portal_account_patient_unique" UNIQUE("account_id","patient_id")
);
--> statement-breakpoint
CREATE TABLE "patient_portal_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"appointment_id" uuid,
	"type" "patient_portal_request_type" NOT NULL,
	"payload" text NOT NULL,
	"status" "patient_portal_request_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_portal_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"token_hash" varchar(128) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patient_portal_session_token_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "patient_portal_links" ADD CONSTRAINT "patient_portal_links_account_id_patient_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."patient_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_portal_links" ADD CONSTRAINT "patient_portal_links_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_portal_links" ADD CONSTRAINT "patient_portal_links_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_portal_requests" ADD CONSTRAINT "patient_portal_requests_account_id_patient_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."patient_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_portal_requests" ADD CONSTRAINT "patient_portal_requests_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_portal_requests" ADD CONSTRAINT "patient_portal_requests_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_portal_requests" ADD CONSTRAINT "patient_portal_requests_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_portal_sessions" ADD CONSTRAINT "patient_portal_sessions_account_id_patient_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."patient_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "patient_accounts_email_idx" ON "patient_accounts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "patient_accounts_phone_idx" ON "patient_accounts" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "patient_portal_link_account_idx" ON "patient_portal_links" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "patient_portal_link_clinic_idx" ON "patient_portal_links" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "patient_portal_requests_account_idx" ON "patient_portal_requests" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "patient_portal_requests_clinic_idx" ON "patient_portal_requests" USING btree ("clinic_id","status");--> statement-breakpoint
CREATE INDEX "patient_portal_session_account_idx" ON "patient_portal_sessions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "patient_portal_session_expiry_idx" ON "patient_portal_sessions" USING btree ("expires_at");