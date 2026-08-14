CREATE TYPE "public"."closure_source" AS ENUM('ph_holiday', 'custom');--> statement-breakpoint
CREATE TABLE "branch_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"weekday" integer NOT NULL,
	"opens_at" integer,
	"closes_at" integer,
	"is_closed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_hours_branch_weekday_unique" UNIQUE("branch_id","weekday")
);
--> statement-breakpoint
CREATE TABLE "clinic_closures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"branch_id" uuid,
	"date" varchar(10) NOT NULL,
	"label" varchar(200) NOT NULL,
	"source" "closure_source" DEFAULT 'custom' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dentist_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dentist_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"weekday" integer NOT NULL,
	"starts_at" integer NOT NULL,
	"ends_at" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dentist_schedules_dentist_branch_weekday_unique" UNIQUE("dentist_id","branch_id","weekday")
);
--> statement-breakpoint
CREATE TABLE "dentist_time_off" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dentist_id" uuid NOT NULL,
	"start_date" varchar(10) NOT NULL,
	"end_date" varchar(10) NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "branch_hours" ADD CONSTRAINT "branch_hours_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_closures" ADD CONSTRAINT "clinic_closures_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_closures" ADD CONSTRAINT "clinic_closures_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dentist_schedules" ADD CONSTRAINT "dentist_schedules_dentist_id_dentists_id_fk" FOREIGN KEY ("dentist_id") REFERENCES "public"."dentists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dentist_schedules" ADD CONSTRAINT "dentist_schedules_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dentist_time_off" ADD CONSTRAINT "dentist_time_off_dentist_id_dentists_id_fk" FOREIGN KEY ("dentist_id") REFERENCES "public"."dentists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "branch_hours_branch_id_idx" ON "branch_hours" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "clinic_closures_clinic_id_idx" ON "clinic_closures" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "clinic_closures_clinic_date_idx" ON "clinic_closures" USING btree ("clinic_id","date");--> statement-breakpoint
CREATE INDEX "dentist_schedules_dentist_id_idx" ON "dentist_schedules" USING btree ("dentist_id");--> statement-breakpoint
CREATE INDEX "dentist_schedules_branch_id_idx" ON "dentist_schedules" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "dentist_time_off_dentist_id_idx" ON "dentist_time_off" USING btree ("dentist_id");