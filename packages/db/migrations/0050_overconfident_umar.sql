CREATE TABLE "clinic_limit_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"metric" varchar(60) NOT NULL,
	"limit" integer,
	"reason" text NOT NULL,
	"granted_by" uuid NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "package_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"metric" varchar(60) NOT NULL,
	"limit" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "package_limits_package_metric_unique" UNIQUE("package_id","metric")
);
--> statement-breakpoint
ALTER TABLE "clinic_subscriptions" ADD COLUMN "negotiated_price_php" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "clinic_subscriptions" ADD COLUMN "billing_note" text;--> statement-breakpoint
ALTER TABLE "subscription_change_requests" ADD COLUMN "requested_metric" varchar(60);--> statement-breakpoint
ALTER TABLE "subscription_change_requests" ADD COLUMN "requested_limit" integer;--> statement-breakpoint
ALTER TABLE "clinic_limit_overrides" ADD CONSTRAINT "clinic_limit_overrides_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_limits" ADD CONSTRAINT "package_limits_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "limit_overrides_clinic_metric_idx" ON "clinic_limit_overrides" USING btree ("clinic_id","metric");--> statement-breakpoint
CREATE INDEX "pkg_limits_package_id_idx" ON "package_limits" USING btree ("package_id");