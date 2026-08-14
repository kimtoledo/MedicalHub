CREATE TABLE "platform_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"support_email" varchar(255),
	"support_phone" varchar(50),
	"maintenance_banner_enabled" boolean DEFAULT false NOT NULL,
	"maintenance_banner_message" text,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
