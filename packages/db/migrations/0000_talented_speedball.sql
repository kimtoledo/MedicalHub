DO $$ BEGIN
 CREATE TYPE "public"."clinic_status" AS ENUM('trial', 'active', 'suspended', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."publication_status" AS ENUM('draft', 'published', 'unpublished');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."verification_status" AS ENUM('unverified', 'pending', 'verified');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."clinic_role" AS ENUM('clinic_owner', 'clinic_admin', 'dentist', 'receptionist', 'dental_assistant', 'cashier', 'inventory_staff');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."platform_role" AS ENUM('super_admin', 'platform_support');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."appointment_status" AS ENUM('pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."subscription_status" AS ENUM('trial', 'active', 'past_due', 'cancelled', 'expired');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(80) NOT NULL,
	"status" "clinic_status" DEFAULT 'trial' NOT NULL,
	"publication_status" "publication_status" DEFAULT 'draft' NOT NULL,
	"email" varchar(255),
	"phone" varchar(20),
	"website" varchar(500),
	"description" text,
	"logo_url" varchar(500),
	"cover_url" varchar(500),
	"address" text,
	"city" varchar(100),
	"province" varchar(100),
	"map_url" varchar(500),
	"facebook_url" varchar(500),
	"instagram_url" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "clinics_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"is_main" boolean DEFAULT false NOT NULL,
	"phone" varchar(20),
	"email" varchar(255),
	"address" text,
	"city" varchar(100),
	"province" varchar(100),
	"map_url" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dentist_branch_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dentist_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"is_active" varchar(10) DEFAULT 'true' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dentists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(80) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"license_number" varchar(50),
	"specialty" varchar(200),
	"bio" text,
	"photo_url" varchar(500),
	"phone" varchar(20),
	"email" varchar(255),
	"verification_status" "verification_status" DEFAULT 'unverified' NOT NULL,
	"publication_status" varchar(20) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "dentists_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinic_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"branch_id" uuid,
	"role" "clinic_role" NOT NULL,
	"dentist_id" uuid,
	"is_active" varchar(10) DEFAULT 'true' NOT NULL,
	"invited_at" varchar(50),
	"joined_at" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"phone" varchar(20),
	"avatar_url" varchar(500),
	"platform_role" "platform_role",
	"is_active" varchar(10) DEFAULT 'true' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patient_medical_histories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"allergies" text,
	"current_medications" text,
	"major_conditions" text,
	"is_pregnant" varchar(10),
	"physician_name" varchar(200),
	"physician_phone" varchar(20),
	"notes" text,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"patient_number" varchar(50) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"middle_name" varchar(100),
	"date_of_birth" varchar(20),
	"sex" varchar(10),
	"civil_status" varchar(20),
	"occupation" varchar(200),
	"nationality" varchar(100),
	"phone" varchar(20),
	"email" varchar(255),
	"address" text,
	"city" varchar(100),
	"province" varchar(100),
	"emergency_contact_name" varchar(200),
	"emergency_contact_phone" varchar(20),
	"emergency_contact_relation" varchar(100),
	"guardian_name" varchar(200),
	"guardian_phone" varchar(20),
	"guardian_relation" varchar(100),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointment_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"from_status" "appointment_status",
	"to_status" "appointment_status" NOT NULL,
	"changed_by" uuid,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"dentist_id" uuid,
	"service_id" uuid,
	"patient_id" uuid,
	"status" "appointment_status" DEFAULT 'pending' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"patient_first_name" varchar(100),
	"patient_last_name" varchar(100),
	"patient_phone" varchar(20),
	"patient_email" varchar(255),
	"chief_complaint" text,
	"notes" text,
	"cancellation_reason" text,
	"booked_by" uuid,
	"confirmed_at" timestamp with time zone,
	"checked_in_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"duration_minutes" varchar(10) DEFAULT '30' NOT NULL,
	"is_active" varchar(10) DEFAULT 'true' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinic_feature_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"feature_key" varchar(100) NOT NULL,
	"is_enabled" boolean NOT NULL,
	"reason" text NOT NULL,
	"granted_by" uuid NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinic_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	"status" "subscription_status" DEFAULT 'trial' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"assigned_by" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "package_features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"feature_key" varchar(100) NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(80) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" varchar(10) DEFAULT '0',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "packages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_email" varchar(255),
	"clinic_id" uuid,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" uuid,
	"action" varchar(100) NOT NULL,
	"metadata" text,
	"ip_address" varchar(45),
	"user_agent" varchar(500),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "branches" ADD CONSTRAINT "branches_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dentist_branch_assignments" ADD CONSTRAINT "dentist_branch_assignments_dentist_id_dentists_id_fk" FOREIGN KEY ("dentist_id") REFERENCES "public"."dentists"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dentist_branch_assignments" ADD CONSTRAINT "dentist_branch_assignments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dentist_branch_assignments" ADD CONSTRAINT "dentist_branch_assignments_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clinic_memberships" ADD CONSTRAINT "clinic_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clinic_memberships" ADD CONSTRAINT "clinic_memberships_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clinic_memberships" ADD CONSTRAINT "clinic_memberships_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clinic_memberships" ADD CONSTRAINT "clinic_memberships_dentist_id_dentists_id_fk" FOREIGN KEY ("dentist_id") REFERENCES "public"."dentists"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_medical_histories" ADD CONSTRAINT "patient_medical_histories_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patient_medical_histories" ADD CONSTRAINT "patient_medical_histories_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patients" ADD CONSTRAINT "patients_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointment_status_history" ADD CONSTRAINT "appointment_status_history_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_dentist_id_dentists_id_fk" FOREIGN KEY ("dentist_id") REFERENCES "public"."dentists"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "services" ADD CONSTRAINT "services_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clinic_feature_overrides" ADD CONSTRAINT "clinic_feature_overrides_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clinic_subscriptions" ADD CONSTRAINT "clinic_subscriptions_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clinic_subscriptions" ADD CONSTRAINT "clinic_subscriptions_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "package_features" ADD CONSTRAINT "package_features_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clinics_status_idx" ON "clinics" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "branches_clinic_id_idx" ON "branches" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dba_dentist_id_idx" ON "dentist_branch_assignments" USING btree ("dentist_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dba_branch_id_idx" ON "dentist_branch_assignments" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dba_clinic_id_idx" ON "dentist_branch_assignments" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dentists_publication_idx" ON "dentists" USING btree ("publication_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "memberships_user_clinic_idx" ON "clinic_memberships" USING btree ("user_id","clinic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "memberships_clinic_id_idx" ON "clinic_memberships" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_platform_role_idx" ON "users" USING btree ("platform_role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "med_hist_patient_id_idx" ON "patient_medical_histories" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_clinic_id_idx" ON "patients" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_patient_number_idx" ON "patients" USING btree ("clinic_id","patient_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patients_name_idx" ON "patients" USING btree ("clinic_id","last_name","first_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appt_hist_appointment_id_idx" ON "appointment_status_history" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_clinic_id_idx" ON "appointments" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_branch_id_idx" ON "appointments" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_dentist_id_idx" ON "appointments" USING btree ("dentist_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_patient_id_idx" ON "appointments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_starts_at_idx" ON "appointments" USING btree ("clinic_id","starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_status_idx" ON "appointments" USING btree ("clinic_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "services_clinic_id_idx" ON "services" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "overrides_clinic_feature_idx" ON "clinic_feature_overrides" USING btree ("clinic_id","feature_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_clinic_id_idx" ON "clinic_subscriptions" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "clinic_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pkg_features_package_id_idx" ON "package_features" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_clinic_id_idx" ON "audit_events" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_actor_id_idx" ON "audit_events" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_entity_idx" ON "audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_action_idx" ON "audit_events" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_occurred_at_idx" ON "audit_events" USING btree ("occurred_at");