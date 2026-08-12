CREATE TABLE "service_price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"branch_id" uuid,
	"price_php" numeric(10, 2),
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "category" varchar(100) DEFAULT 'General' NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "is_bookable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "service_price_history" ADD CONSTRAINT "service_price_history_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_price_history" ADD CONSTRAINT "service_price_history_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_price_history" ADD CONSTRAINT "service_price_history_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "service_price_history_service_idx" ON "service_price_history" USING btree ("clinic_id","service_id","effective_from");--> statement-breakpoint
CREATE INDEX "service_price_history_branch_idx" ON "service_price_history" USING btree ("clinic_id","branch_id","service_id","effective_from");--> statement-breakpoint
CREATE INDEX "service_price_history_active_idx" ON "service_price_history" USING btree ("clinic_id","service_id","branch_id","effective_to");
--> statement-breakpoint
INSERT INTO "service_price_history" ("id", "clinic_id", "service_id", "branch_id", "price_php", "effective_from", "created_by", "created_at", "updated_at")
SELECT gen_random_uuid(), "clinic_id", "id", NULL, "price_php", "created_at", NULL, "created_at", "updated_at"
FROM "services"
WHERE "price_php" IS NOT NULL;
--> statement-breakpoint
INSERT INTO "package_features" ("id", "package_id", "feature_key", "is_enabled")
SELECT gen_random_uuid(), "id", 'billing.service_catalog', true
FROM "packages"
WHERE "slug" IN ('professional', 'enterprise')
  AND NOT EXISTS (
    SELECT 1 FROM "package_features" pf
    WHERE pf."package_id" = "packages"."id"
      AND pf."feature_key" = 'billing.service_catalog'
  );
