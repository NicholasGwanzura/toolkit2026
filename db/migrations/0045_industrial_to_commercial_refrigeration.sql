-- Industrial Commercial Refrigeration becomes the Commercial Refrigeration Service Sector. Runs after 0044, which has already
-- moved the earlier Commercial Refrigeration technicians to Commercial Refrigeration Assembly and Installation.
UPDATE "technicians" SET "specialization" = 'Commercial Refrigeration Service Sector' WHERE "specialization" = 'Industrial Commercial Refrigeration';
--> statement-breakpoint
UPDATE "technician_applications" SET "specialization" = 'Commercial Refrigeration Service Sector' WHERE "specialization" = 'Industrial Commercial Refrigeration';
