ALTER TABLE "clinics" ADD COLUMN "prefix" varchar(8) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "clinics" ADD CONSTRAINT "clinics_prefix_unique" UNIQUE("prefix");