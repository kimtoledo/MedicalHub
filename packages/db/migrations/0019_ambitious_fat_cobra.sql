CREATE TYPE "public"."notification_channel" AS ENUM('email', 'sms');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('queued', 'processing', 'sent', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('booking_confirmation', 'appointment_reminder', 'appointment_cancelled', 'appointment_rescheduled', 'recall_reminder');--> statement-breakpoint
CREATE TABLE "notification_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid,
	"channel" "notification_channel" NOT NULL,
	"type" "notification_type" NOT NULL,
	"recipient" varchar(320) NOT NULL,
	"subject" varchar(300) NOT NULL,
	"body" text NOT NULL,
	"dedupe_key" varchar(300) NOT NULL,
	"status" "notification_status" DEFAULT 'queued' NOT NULL,
	"attempts" varchar(10) DEFAULT '0' NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_outbox_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
ALTER TABLE "notification_outbox" ADD CONSTRAINT "notification_outbox_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_outbox_status_idx" ON "notification_outbox" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "notification_outbox_clinic_idx" ON "notification_outbox" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "notification_outbox_type_idx" ON "notification_outbox" USING btree ("type");