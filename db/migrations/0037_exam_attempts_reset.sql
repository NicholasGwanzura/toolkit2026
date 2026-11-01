ALTER TABLE "course_enrollments" ADD COLUMN IF NOT EXISTS "exam_attempts_reset_at" timestamp with time zone;
