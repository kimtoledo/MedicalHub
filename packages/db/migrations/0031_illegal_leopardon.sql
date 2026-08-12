CREATE TYPE "public"."integration_api_key_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."integration_webhook_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TABLE "integration_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"key_prefix" varchar(24) NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "integration_api_key_status" DEFAULT 'active' NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "integration_api_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "integration_webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"endpoint_url" varchar(500) NOT NULL,
	"secret_hash" varchar(64) NOT NULL,
	"event_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "integration_webhook_status" DEFAULT 'active' NOT NULL,
	"last_delivery_at" timestamp with time zone,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "integration_api_keys" ADD CONSTRAINT "integration_api_keys_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_webhooks" ADD CONSTRAINT "integration_webhooks_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "integration_api_keys_clinic_idx" ON "integration_api_keys" USING btree ("clinic_id","status");--> statement-breakpoint
CREATE INDEX "integration_webhooks_clinic_idx" ON "integration_webhooks" USING btree ("clinic_id","status");