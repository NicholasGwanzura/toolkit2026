-- The specialisation is now called Industrial Commercial Refrigeration. Existing records move with it.
UPDATE "technicians" SET "specialization" = 'Industrial Commercial Refrigeration' WHERE "specialization" = 'Industrial Refrigeration';
--> statement-breakpoint
UPDATE "technician_applications" SET "specialization" = 'Industrial Commercial Refrigeration' WHERE "specialization" = 'Industrial Refrigeration';
