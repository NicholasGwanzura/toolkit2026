-- A device-made reference on records saved offline, so a retried send is stored only once.
ALTER TABLE "installations" ADD COLUMN IF NOT EXISTS "client_ref" text;
--> statement-breakpoint
ALTER TABLE "field_image_records" ADD COLUMN IF NOT EXISTS "client_ref" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "installations_client_ref_idx" ON "installations" ("client_ref");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "field_image_records_client_ref_idx" ON "field_image_records" ("client_ref");
