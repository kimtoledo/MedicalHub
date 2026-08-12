CREATE TYPE "public"."inventory_transaction_direction" AS ENUM('in', 'out', 'adjustment');--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"sku" varchar(100),
	"category" varchar(100) DEFAULT 'General' NOT NULL,
	"unit" varchar(50) DEFAULT 'piece' NOT NULL,
	"supplier" varchar(200),
	"reorder_level" numeric(12, 3) DEFAULT '0' NOT NULL,
	"is_active" varchar(10) DEFAULT 'true' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"direction" "inventory_transaction_direction" NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"reason" text NOT NULL,
	"batch_number" varchar(100),
	"expires_at" timestamp with time zone,
	"recorded_by" uuid,
	"transaction_date" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_items_clinic_idx" ON "inventory_items" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "inventory_items_sku_idx" ON "inventory_items" USING btree ("clinic_id","sku");--> statement-breakpoint
CREATE INDEX "inventory_transactions_clinic_idx" ON "inventory_transactions" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "inventory_transactions_item_idx" ON "inventory_transactions" USING btree ("clinic_id","item_id");--> statement-breakpoint
CREATE INDEX "inventory_transactions_expiry_idx" ON "inventory_transactions" USING btree ("clinic_id","expires_at");