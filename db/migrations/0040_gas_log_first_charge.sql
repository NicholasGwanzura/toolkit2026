-- Marks the refrigerant charged into a newly installed system, so it is reported apart from top-ups.
ALTER TABLE "gas_usage_logs" ADD COLUMN IF NOT EXISTS "first_charge" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
-- Charges already counted from completed new-system jobs, written by the job or linked to it.
UPDATE "gas_usage_logs" g SET "first_charge" = true
WHERE g."action_type" = 'Charge'
  AND g."first_charge" = false
  AND (
    g."client_log_id" LIKE 'planner-job-charge:%'
    OR EXISTS (SELECT 1 FROM "planner_jobs" j WHERE j."id" = g."planner_job_id" AND j."new_system" = true)
  );
