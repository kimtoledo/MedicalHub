CREATE TABLE "organization_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"category" varchar(100) NOT NULL,
	"description" text,
	"duration_minutes" varchar(10) NOT NULL,
	"base_price_php" numeric(10, 2),
	"is_active" varchar(10) DEFAULT 'true' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "organization_service_id" uuid;--> statement-breakpoint
ALTER TABLE "organization_services" ADD CONSTRAINT "organization_services_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organization_services_org_idx" ON "organization_services" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_organization_service_id_organization_services_id_fk" FOREIGN KEY ("organization_service_id") REFERENCES "public"."organization_services"("id") ON DELETE set null ON UPDATE no action;