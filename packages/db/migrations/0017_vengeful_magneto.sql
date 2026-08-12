CREATE TYPE "public"."invoice_transaction_type" AS ENUM('refund', 'adjustment');--> statement-breakpoint
ALTER TYPE "public"."invoice_status" ADD VALUE 'partially_paid' BEFORE 'paid';--> statement-breakpoint
ALTER TYPE "public"."invoice_status" ADD VALUE 'refunded' BEFORE 'voided';--> statement-breakpoint
CREATE TABLE "invoice_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"type" "invoice_transaction_type" NOT NULL,
	"amount_php" numeric(10, 2) NOT NULL,
	"payment_method" "payment_method",
	"transaction_date" varchar(20) NOT NULL,
	"reason" text NOT NULL,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "treatment_plan_id" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "subtotal_php" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "discount_amount_php" numeric(10, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "discount_reason" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "discount_applied_by" uuid;--> statement-breakpoint
ALTER TABLE "invoice_transactions" ADD CONSTRAINT "invoice_transactions_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoice_transactions_invoice_idx" ON "invoice_transactions" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_transactions_clinic_idx" ON "invoice_transactions" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "invoice_transactions_date_idx" ON "invoice_transactions" USING btree ("clinic_id","transaction_date");--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_treatment_plan_id_treatment_plans_id_fk" FOREIGN KEY ("treatment_plan_id") REFERENCES "public"."treatment_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoices_treatment_plan_id_idx" ON "invoices" USING btree ("treatment_plan_id");