import type { ExamQuestion } from '@/lib/exam';
import type { CourseModule, ManagedCourse } from '@/lib/platformStore';
import { courses } from '@/db/schema/index';

const ALLOWED_MATERIAL_TYPES = [
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
];

export const MAX_MATERIAL_SIZE_BYTES = 500 * 1024 * 1024; // 500MB, covers course video uploads

/** `includeAnswers` adds the exam questions with their answer key. Pass it only for the course's author or an administrator. */
export function toManagedCourse(row: typeof courses.$inferSelect, includeAnswers = false): ManagedCourse {
  const questions = (row.examQuestions ?? []) as ExamQuestion[];
  return {
    id: row.id,
    lecturerId: row.lecturerId,
    lecturerName: row.lecturerName,
    title: row.title,
    description: row.description,
    modules: row.modules as ManagedCourse['modules'],
    examQuestionCount: questions.length,
    ...(includeAnswers ? { examQuestions: questions } : {}),
    status: row.status as ManagedCourse['status'],
    rejectionReason: row.rejectionReason ?? undefined,
    passMark: row.passMark,
    cpdCredits: row.cpdCredits,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function isAllowedCourseMaterialType(fileType: string) {
  return ALLOWED_MATERIAL_TYPES.includes(fileType);
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

type Attachment = NonNullable<CourseModule['attachments']>[number];

function validateAttachment(raw: unknown, courseId: string | undefined): Attachment | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Record<string, unknown>;
  const id = cleanText(candidate.id);
  const fileName = cleanText(candidate.fileName);
  const fileType = cleanText(candidate.fileType);
  const r2Key = cleanText(candidate.r2Key);
  const uploadedAt = cleanText(candidate.uploadedAt);
  const sizeBytes = Number(candidate.sizeBytes);

  if (!id || !fileName || !fileType || !r2Key || !uploadedAt) return null;
  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_MATERIAL_SIZE_BYTES) return null;
  if (!isAllowedCourseMaterialType(fileType)) return null;
  // A course may only reference files that were uploaded under its own storage prefix.
  if (!courseId || !r2Key.startsWith(`courses/${courseId}/`)) return null;

  return { id, fileName, fileType, sizeBytes, r2Key, uploadedAt };
}

/**
 * courseId is required to keep attachments: they must live under `courses/<courseId>/`. When it
 * is omitted (a brand-new course that has no id yet) any attachment is rejected.
 */
export function validateCourseModules(value: unknown, courseId?: string): { modules?: CourseModule[]; error?: string } {
  if (!Array.isArray(value) || value.length === 0) {
    return { error: 'Add at least one course module before saving.' };
  }

  const modules: CourseModule[] = [];

  for (const [index, raw] of value.entries()) {
    if (!raw || typeof raw !== 'object') {
      return { error: `Module ${index + 1} is invalid.` };
    }

    const item = raw as Record<string, unknown>;
    const title = cleanText(item.title);
    const content = cleanText(item.content);
    const minutes = Number(item.minutes);

    if (!title) return { error: `Module ${index + 1} needs a title.` };
    if (!content) return { error: `Module ${index + 1} needs learning content.` };
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 480) {
      return { error: `Module ${index + 1} minutes must be between 1 and 480.` };
    }

    let attachments: Attachment[] | undefined;
    if (Array.isArray(item.attachments)) {
      attachments = [];
      for (const rawAttachment of item.attachments) {
        const attachment = validateAttachment(rawAttachment, courseId);
        if (!attachment) {
          return { error: `Module ${index + 1} has an invalid or unsupported attachment. Remove it and upload the file again.` };
        }
        attachments.push(attachment);
      }
    }

    modules.push({
      title,
      content,
      minutes: Math.round(minutes),
      attachments,
    });
  }

  return { modules };
}

/** Every attachment saved on a course's modules, in module order. */
export function collectAttachments(modules: unknown): Attachment[] {
  if (!Array.isArray(modules)) return [];
  return modules.flatMap((module) => {
    const attachments = module && typeof module === 'object' ? (module as { attachments?: unknown }).attachments : undefined;
    return Array.isArray(attachments) ? (attachments as Attachment[]) : [];
  });
}

export function findAttachment(modules: unknown, r2Key: string): Attachment | undefined {
  return collectAttachments(modules).find((attachment) => attachment?.r2Key === r2Key);
}

export function courseReferencesMaterial(modules: unknown, r2Key: string) {
  return findAttachment(modules, r2Key) !== undefined;
}

function wholeNumberInRange(value: unknown, min: number, max: number): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

/** passMark and cpdCredits are optional on input; when present they must be whole numbers in range. */
export function validateCourseBasics(body: { title?: unknown; description?: unknown; passMark?: unknown; cpdCredits?: unknown }) {
  const title = cleanText(body.title);
  const description = cleanText(body.description);

  if (!title) return { error: 'Course title is required.' };
  if (!description) return { error: 'Course description is required.' };
  if (title.length > 180) return { error: 'Course title must be 180 characters or fewer.' };
  if (description.length > 3000) return { error: 'Course description must be 3000 characters or fewer.' };

  let passMark: number | undefined;
  if (body.passMark !== undefined && body.passMark !== null) {
    const value = wholeNumberInRange(body.passMark, 1, 100);
    if (value === null) return { error: 'Pass mark must be a whole number between 1 and 100.' };
    passMark = value;
  }
  let cpdCredits: number | undefined;
  if (body.cpdCredits !== undefined && body.cpdCredits !== null) {
    const value = wholeNumberInRange(body.cpdCredits, 0, 100);
    if (value === null) return { error: 'CPD credits must be a whole number between 0 and 100.' };
    cpdCredits = value;
  }

  return { title, description, passMark, cpdCredits };
}
