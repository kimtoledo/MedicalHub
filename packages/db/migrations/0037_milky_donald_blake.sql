CREATE TYPE "public"."notification_provider_channel" AS ENUM('email', 'sms');--> statement-breakpoint
CREATE TYPE "public"."notification_provider_name" AS ENUM('sendgrid', 'twilio');--> statement-breakpoint
CREATE TYPE "public"."notification_provider_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TABLE "clinic_notification_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"channel" "notification_provider_channel" NOT NULL,
	"provider_name" "notification_provider_name" NOT NULL,
	"from_address" varchar(320) NOT NULL,
	"credential_ciphertext" text NOT NULL,
	"status" "notification_provider_status" DEFAULT 'active' NOT NULL,
	"last_used_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clinic_notification_providers_clinic_channel_unique" UNIQUE("clinic_id","channel")
);
--> statement-breakpoint
ALTER TABLE "clinic_notification_providers" ADD CONSTRAINT "clinic_notification_providers_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clinic_notification_providers_clinic_idx" ON "clinic_notification_providers" USING btree ("clinic_id");