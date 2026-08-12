CREATE TYPE "public"."subscription_request_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."subscription_request_type" AS ENUM('upgrade', 'downgrade', 'addon');--> statement-breakpoint
CREATE TABLE "clinic_usage_counters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"metric" varchar(60) NOT NULL,
	"period_key" varchar(20) NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	"limit" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clinic_usage_metric_period_unique" UNIQUE("clinic_id","metric","period_key")
);
--> statement-breakpoint
CREATE TABLE "subscription_change_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"requested_package_id" uuid,
	"type" "subscription_request_type" NOT NULL,
	"reason" text NOT NULL,
	"status" "subscription_request_status" DEFAULT 'pending' NOT NULL,
	"requested_by" uuid NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clinic_usage_counters" ADD CONSTRAINT "clinic_usage_counters_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_change_requests" ADD CONSTRAINT "subscription_change_requests_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_change_requests" ADD CONSTRAINT "subscription_change_requests_requested_package_id_packages_id_fk" FOREIGN KEY ("requested_package_id") REFERENCES "public"."packages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clinic_usage_clinic_idx" ON "clinic_usage_counters" USING btree ("clinic_id","period_key");--> statement-breakpoint
CREATE INDEX "subscription_requests_clinic_idx" ON "subscription_change_requests" USING btree ("clinic_id","status");--> statement-breakpoint
CREATE INDEX "subscription_requests_status_idx" ON "subscription_change_requests" USING btree ("status");