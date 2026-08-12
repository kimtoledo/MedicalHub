CREATE TYPE "public"."support_access_status" AS ENUM('pending', 'approved', 'denied', 'expired', 'used');--> statement-breakpoint
CREATE TYPE "public"."tenant_export_status" AS ENUM('requested', 'processing', 'ready', 'failed', 'cancelled');--> statement-breakpoint
CREATE TABLE "support_access_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" "support_access_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_export_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"status" "tenant_export_status" DEFAULT 'requested' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"retention_until" timestamp with time zone,
	"failure_reason" text,
	"artifact_reference" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "support_access_requests" ADD CONSTRAINT "support_access_requests_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_export_requests" ADD CONSTRAINT "tenant_export_requests_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_access_clinic_idx" ON "support_access_requests" USING btree ("clinic_id","status");--> statement-breakpoint
CREATE INDEX "support_access_status_idx" ON "support_access_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tenant_export_clinic_idx" ON "tenant_export_requests" USING btree ("clinic_id","status");--> statement-breakpoint
CREATE INDEX "tenant_export_status_idx" ON "tenant_export_requests" USING btree ("status");