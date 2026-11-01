-- Equipment belongs to a person by id, not by name, and can be archived instead of deleted.
ALTER TABLE "equipment_records" ADD COLUMN IF NOT EXISTS "technician_id" uuid;
--> statement-breakpoint
ALTER TABLE "equipment_records" ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "equipment_records_technician_id_idx" ON "equipment_records" ("technician_id");
--> statement-breakpoint
-- Only where exactly one account has that name. Others keep matching by name until corrected.
UPDATE "equipment_records" e SET "technician_id" = u."id"
FROM "users" u
WHERE e."technician_id" IS NULL
  AND u."name" = e."technician_name"
  AND (SELECT count(*) FROM "users" x WHERE x."name" = e."technician_name") = 1;
