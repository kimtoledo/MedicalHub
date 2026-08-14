ALTER TYPE "public"."notification_type" ADD VALUE 'prescription_share';--> statement-breakpoint
ALTER TABLE "dentists" ADD COLUMN "signature_url" text;--> statement-breakpoint
ALTER TABLE "dentists" ADD COLUMN "template_id" varchar(20) DEFAULT 'classic' NOT NULL;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "clinic_logo_url" varchar(500);--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "template_id" varchar(20) DEFAULT 'classic' NOT NULL;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD COLUMN "signature_url" text;