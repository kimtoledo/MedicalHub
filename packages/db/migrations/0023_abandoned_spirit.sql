CREATE TABLE "clinic_membership_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"permission_key" varchar(100) NOT NULL,
	"is_enabled" boolean NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_permission_unique" UNIQUE("membership_id","permission_key")
);
--> statement-breakpoint
ALTER TABLE "clinic_membership_permissions" ADD CONSTRAINT "clinic_membership_permissions_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_membership_permissions" ADD CONSTRAINT "clinic_membership_permissions_membership_id_clinic_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."clinic_memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "membership_permissions_membership_idx" ON "clinic_membership_permissions" USING btree ("membership_id");--> statement-breakpoint
CREATE INDEX "membership_permissions_clinic_idx" ON "clinic_membership_permissions" USING btree ("clinic_id");