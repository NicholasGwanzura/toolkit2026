-- What a technician does within their RAC sub-sector: local assembly and installation, servicing, or both.
-- Existing technicians and applications stay empty and show as "Not recorded".
ALTER TABLE "technicians" ADD COLUMN IF NOT EXISTS "technician_skills" text;
--> statement-breakpoint
ALTER TABLE "technician_applications" ADD COLUMN IF NOT EXISTS "technician_skills" text;
