-- Technicians in Commercial Refrigeration form the Commercial Refrigeration Assembly and Installation sub-sector, which replaces it.
UPDATE "technicians" SET "specialization" = 'Commercial Refrigeration Assembly and Installation' WHERE "specialization" = 'Commercial Refrigeration';
--> statement-breakpoint
UPDATE "technician_applications" SET "specialization" = 'Commercial Refrigeration Assembly and Installation' WHERE "specialization" = 'Commercial Refrigeration';
