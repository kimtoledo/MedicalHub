-- Migration: 0007_ai_interactions
-- AI interaction audit log — metadata only, no PHI.

--> statement-breakpoint
CREATE TABLE "ai_interactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "clinic_id" uuid NOT NULL,
  "encounter_id" uuid,
  "actor_id" uuid,
  "feature" varchar(50) NOT NULL,
  "model" varchar(100) NOT NULL,
  "prompt_tokens" integer,
  "completion_tokens" integer,
  "latency_ms" integer,
  "outcome" varchar(20) NOT NULL DEFAULT 'completed',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE "ai_interactions" ADD CONSTRAINT "ai_interactions_clinic_id_clinics_id_fk"
  FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE restrict ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "ai_interactions" ADD CONSTRAINT "ai_interactions_encounter_id_encounters_id_fk"
  FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "ai_interactions" ADD CONSTRAINT "ai_interactions_actor_id_users_id_fk"
  FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;

--> statement-breakpoint
CREATE INDEX "ai_interactions_clinic_id_idx" ON "ai_interactions" ("clinic_id");
CREATE INDEX "ai_interactions_encounter_id_idx" ON "ai_interactions" ("encounter_id");
CREATE INDEX "ai_interactions_feature_idx" ON "ai_interactions" ("clinic_id", "feature");
