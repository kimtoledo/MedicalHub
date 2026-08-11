-- Migration: 0004_billing_lite
-- Adds service pricing, invoices, invoice line items, and invoice payments.

--> statement-breakpoint
-- Add price_php to services
ALTER TABLE "services" ADD COLUMN "price_php" numeric(10, 2);

--> statement-breakpoint
-- Invoice status enum
CREATE TYPE "public"."invoice_status" AS ENUM('pending', 'paid', 'voided');

--> statement-breakpoint
-- Payment method enum
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'gcash', 'card', 'bank_transfer', 'other');

--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"encounter_id" uuid,
	"invoice_number" varchar(30) NOT NULL,
	"status" "invoice_status" DEFAULT 'pending' NOT NULL,
	"total_amount_php" numeric(10, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"issued_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);

--> statement-breakpoint
CREATE TABLE "invoice_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"service_id" uuid,
	"description" varchar(300) NOT NULL,
	"unit_price_php" numeric(10, 2) DEFAULT '0' NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"total_php" numeric(10, 2) DEFAULT '0' NOT NULL,
	"tooth_ref" varchar(50),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "invoice_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"amount_php" numeric(10, 2) NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"payment_date" varchar(20) NOT NULL,
	"recorded_by" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE restrict ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE restrict ON UPDATE no action;

--> statement-breakpoint
CREATE INDEX "invoices_clinic_id_idx" ON "invoices" USING btree ("clinic_id");
CREATE INDEX "invoices_patient_id_idx" ON "invoices" USING btree ("patient_id");
CREATE INDEX "invoices_encounter_id_idx" ON "invoices" USING btree ("encounter_id");
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("clinic_id","status");
CREATE INDEX "invoices_issued_at_idx" ON "invoices" USING btree ("clinic_id","issued_at");
CREATE INDEX "invoice_line_items_invoice_id_idx" ON "invoice_line_items" USING btree ("invoice_id");
CREATE UNIQUE INDEX "invoice_payments_invoice_id_unique_idx" ON "invoice_payments" USING btree ("invoice_id");
CREATE INDEX "invoice_payments_clinic_id_idx" ON "invoice_payments" USING btree ("clinic_id");
CREATE INDEX "invoice_payments_date_idx" ON "invoice_payments" USING btree ("clinic_id","payment_date");
