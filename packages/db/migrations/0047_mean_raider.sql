ALTER TABLE "clinics" ADD COLUMN "cover_mode" varchar(20) DEFAULT 'gradient' NOT NULL;--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "logo_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "logo_mime_type" varchar(20);--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "cover_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "cover_mime_type" varchar(20);