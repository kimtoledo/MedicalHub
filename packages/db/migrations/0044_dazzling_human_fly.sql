CREATE TYPE "public"."retention_flag_status" AS ENUM('pending', 'dismissed', 'anonymize_requested', 'delete_requested');--> statement-breakpoint
CREATE TYPE "public"."security_alert_status" AS ENUM('open', 'acknowledged', 'dismissed');--> statement-breakpoint
CREATE TABLE "data_retention_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"clinic_archived_at" timestamp with time zone NOT NULL,
	"status" "retention_flag_status" DEFAULT 'pending' NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"resolution_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_type" varchar(100) NOT NULL,
	"actor_id" uuid,
	"actor_email" varchar(255),
	"clinic_id" uuid,
	"severity" varchar(20) DEFAULT 'warning' NOT NULL,
	"details" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"window_end" timestamp with time zone NOT NULL,
	"status" "security_alert_status" DEFAULT 'open' NOT NULL,
	"acknowledged_by" uuid,
	"acknowledged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "data_retention_flags" ADD CONSTRAINT "data_retention_flags_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_alerts" ADD CONSTRAINT "security_alerts_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "data_retention_flags_clinic_idx" ON "data_retention_flags" USING btree ("clinic_id","status");--> statement-breakpoint
CREATE INDEX "data_retention_flags_status_idx" ON "data_retention_flags" USING btree ("status");--> statement-breakpoint
CREATE INDEX "security_alerts_status_idx" ON "security_alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "security_alerts_actor_window_idx" ON "security_alerts" USING btree ("actor_id","window_start");