ALTER TYPE "public"."notification_status" ADD VALUE 'held' BEFORE 'queued';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'dentist_verification_approved';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'dentist_verification_rejected';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'dentist_verification_revoked';--> statement-breakpoint
ALTER TABLE "dentists" ADD CONSTRAINT "dentists_license_number_unique" UNIQUE("license_number");