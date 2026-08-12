CREATE TYPE "public"."custom_domain_status" AS ENUM('pending_verification', 'verified', 'active', 'failed', 'disabled');--> statement-breakpoint
CREATE TABLE "custom_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"hostname" varchar(255) NOT NULL,
	"verification_token" varchar(128) NOT NULL,
	"status" "custom_domain_status" DEFAULT 'pending_verification' NOT NULL,
	"verified_at" timestamp with time zone,
	"activated_at" timestamp with time zone,
	"last_checked_at" timestamp with time zone,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "custom_domain_hostname_unique" UNIQUE("hostname")
);
--> statement-breakpoint
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "custom_domains_clinic_idx" ON "custom_domains" USING btree ("clinic_id");