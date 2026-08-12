CREATE TABLE "clinic_gallery_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"image_url" varchar(1000) NOT NULL,
	"alt_text" varchar(200) NOT NULL,
	"caption" text,
	"sort_order" varchar(10) DEFAULT '0' NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "theme_preset" varchar(40) DEFAULT 'violet-clean' NOT NULL;--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "brand_accent" varchar(7) DEFAULT '#7C3AED' NOT NULL;--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "show_gallery" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "show_team" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "show_services" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "seo_title" varchar(160);--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "seo_description" varchar(320);--> statement-breakpoint
ALTER TABLE "clinics" ADD COLUMN "og_image_url" varchar(1000);--> statement-breakpoint
ALTER TABLE "clinic_gallery_items" ADD CONSTRAINT "clinic_gallery_items_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clinic_gallery_clinic_idx" ON "clinic_gallery_items" USING btree ("clinic_id");