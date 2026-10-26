CREATE TABLE "field_image_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"technician_id" uuid NOT NULL,
	"job_id" text NOT NULL,
	"before_after" text NOT NULL,
	"annotations_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"gps_tag" text,
	"image_data_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "field_image_records" ADD CONSTRAINT "field_image_records_technician_id_users_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "field_image_records_technician_created_idx" ON "field_image_records" USING btree ("technician_id","created_at");