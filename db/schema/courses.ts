import { pgTable, pgEnum, uuid, text, integer, boolean, numeric, jsonb, timestamp, unique, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const courseStatusEnum = pgEnum('course_status', [
  'draft',
  'pending_nou',
  'approved',
  'rejected',
]);

export const examSubmissionStatusEnum = pgEnum('exam_submission_status', [
  'pending',
  'graded',
]);

// Matches ManagedCourse interface
export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  lecturerId: uuid('lecturer_id').notNull(),
  lecturerName: text('lecturer_name').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  // CourseModule[] stored as JSONB: [{title, content, minutes}]
  modules: jsonb('modules').notNull().default([]),
  // ExamQuestion[] stored as JSONB (see lib/exam.ts). Includes the answer key, so it is only ever returned to the course's author and administrators.
  examQuestions: jsonb('exam_questions').notNull().default([]),
  status: courseStatusEnum('status').notNull().default('draft'),
  rejectionReason: text('rejection_reason'),
  // Minimum score (0-100) a learner needs for an exam on this course to count as passed.
  passMark: integer('pass_mark').notNull().default(70),
  // CPD credits awarded on a certificate issued for this course.
  cpdCredits: integer('cpd_credits').notNull().default(12),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('courses_status_idx').on(table.status),
  index('courses_lecturer_id_idx').on(table.lecturerId),
]);

// A learner's enrollment in an approved course. Exams and downloads require one.
export const courseEnrollments = pgTable('course_enrollments', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  enrolledAt: timestamp('enrolled_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [unique('course_enrollments_course_user_unique').on(table.courseId, table.userId)]);

// Matches ExamSubmission interface
export const examSubmissions = pgTable('exam_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull().references(() => courses.id),
  courseTitle: text('course_title').notNull(),
  studentId: uuid('student_id').notNull(),
  studentName: text('student_name').notNull(),
  // ExamAnswer[] stored as JSONB: [{question, answer}]
  answers: jsonb('answers').notNull().default([]),
  score: numeric('score', { precision: 5, scale: 2 }),
  passed: boolean('passed'),
  feedback: text('feedback'),
  status: examSubmissionStatusEnum('status').notNull().default('pending'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  gradedAt: timestamp('graded_at', { withTimezone: true }),
}, (table) => [
  index('exam_submissions_course_id_idx').on(table.courseId),
  index('exam_submissions_student_id_idx').on(table.studentId),
  index('exam_submissions_status_idx').on(table.status),
]);
