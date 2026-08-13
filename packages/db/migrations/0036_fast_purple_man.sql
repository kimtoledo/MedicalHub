CREATE TYPE "public"."webhook_delivery_status" AS ENUM('queued', 'delivered', 'failed');--> statement-breakpoint
CREATE TABLE "integration_webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"payload" text NOT NULL,
	"status" "webhook_delivery_status" DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"response_status" integer,
	"last_error" text,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "integration_webhooks" ADD COLUMN "secret_ciphertext" text;--> statement-breakpoint
ALTER TABLE "integration_webhook_deliveries" ADD CONSTRAINT "integration_webhook_deliveries_webhook_id_integration_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."integration_webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_webhook_deliveries" ADD CONSTRAINT "integration_webhook_deliveries_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "integration_webhook_deliveries_webhook_idx" ON "integration_webhook_deliveries" USING btree ("webhook_id","status");--> statement-breakpoint
CREATE INDEX "integration_webhook_deliveries_due_idx" ON "integration_webhook_deliveries" USING btree ("status","next_attempt_at");