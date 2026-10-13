"use client";

export const STORAGE_KEYS = {
    plannerJobs: 'coolpro_job_planner_jobs',
    fieldSchedulingRecords: 'coolpro_field_scheduling_records',
    trainingSessions: 'coolpro_training_sessions',
    trainerCertificateRequests: 'coolpro_trainer_certificate_requests',
    supplierProfilesLegacy: 'coolpro_supplier_profiles',
    fieldToolkitInstallations: 'field_toolkit_installations',
    fieldToolkitLogs: 'refrigerant_logs',
    fieldToolkitChecklists: 'field_toolkit_checklists',
    fieldToolkitPendingSync: 'field_toolkit_pending_sync',
    imageRecords: 'coolpro_image_records',
    voiceSessions: 'coolpro_voice_sessions',
    ttsVoice: 'coolpro_tts_voice',
    voiceAutoSpeak: 'coolpro_voice_autospeak',
    voiceHandsFree: 'coolpro_voice_handsfree',
    language: 'coolpro_language',
    emergencyMode: 'coolpro_emergency_mode',
    certificateRecords: 'coolpro_certificate_records',
    courses: 'coolpro_courses',
    examSubmissions: 'coolpro_exam_submissions',
    supplierReorders: 'coolpro_supplier_reorders',
    technicianVerifications: 'coolpro_technician_verifications',
} as const;

// ---------------------------------------------------------------------------
// Course & Exam types
// ---------------------------------------------------------------------------

export interface CourseAttachment {
    id: string;
    fileName: string;
    fileType: string;
    sizeBytes: number;
    r2Key: string;
    uploadedAt: string;
}

export interface CourseModule {
    title: string;
    content: string;
    minutes: number;
    attachments?: CourseAttachment[];
}

export type CourseStatus = 'draft' | 'pending_nou' | 'approved' | 'rejected';

import type { ExamQuestion } from '@/lib/exam';

export interface ManagedCourse {
    id: string;
    lecturerId: string;
    lecturerName: string;
    title: string;
    description: string;
    modules: CourseModule[];
    /** How many exam questions the course has. Safe for everyone to see. */
    examQuestionCount: number;
    /** The questions with their answer key. Only sent to the course's author and administrators. */
    examQuestions?: ExamQuestion[];
    status: CourseStatus;
    rejectionReason?: string;
    passMark: number;
    cpdCredits: number;
    createdAt: string;
    updatedAt: string;
}

export type ExamSubmissionStatus = 'pending' | 'graded';

export interface ExamAnswer {
    question: string;
    answer: string;
    /** Set when the answer was marked automatically (multiple choice). */
    correct?: boolean;
}

export interface ExamSubmission {
    id: string;
    courseId: string;
    courseTitle: string;
    studentId: string;
    studentName: string;
    answers: ExamAnswer[];
    score?: number;
    passed?: boolean;
    feedback?: string;
    status: ExamSubmissionStatus;
    submittedAt: string;
    gradedAt?: string;
}

// ---------------------------------------------------------------------------
// Supplier Reorder Types
// ---------------------------------------------------------------------------

export type ReorderStatus = 'pending_hevacraz' | 'pending_nou' | 'approved' | 'rejected';

export interface SupplierReorder {
    id: string;
    vendorId: string;
    vendorName: string;
    gasType: string;
    quantityKg: number;
    purpose: string;
    /** New stock bought, or reclaimed refrigerant returned. */
    reorderType: 'purchase' | 'recovery';
    supplierNotes: string;
    status: ReorderStatus;
    hevacrazReviewerId?: string;
    hevacrazReviewedAt?: string;
    nouReviewerId?: string;
    nouReviewedAt?: string;
    rejectionReason?: string;
    rejectedBy?: 'hevacraz' | 'nou';
    createdAt: string;
}

// ---------------------------------------------------------------------------
// Technician Verification Types
// ---------------------------------------------------------------------------

export type VerificationMethod = 'reg_number' | 'qr' | 'name';
export type VerificationResult = 'valid' | 'expired' | 'revoked' | 'not_found';

export interface TechnicianVerification {
    id: string;
    vendorId: string;
    vendorName: string;
    method: VerificationMethod;
    query: string;
    technicianId?: string;
    result: VerificationResult;
    createdAt: string;
}

// ---------------------------------------------------------------------------
// Legacy localStorage helpers kept for non-migrated features only
// ---------------------------------------------------------------------------

function isBrowser() {
    return typeof window !== 'undefined';
}

export function readCollection<T>(key: string, fallback: T[] = [], legacyKeys: string[] = []): T[] {
    if (!isBrowser()) return fallback;

    const keysToCheck = [key, ...legacyKeys];
    for (const currentKey of keysToCheck) {
        const stored = window.localStorage.getItem(currentKey);
        if (!stored) continue;

        try {
            const parsed = JSON.parse(stored) as T[];
            if (currentKey !== key) {
                window.localStorage.setItem(key, JSON.stringify(parsed));
                window.localStorage.removeItem(currentKey);
            }
            return parsed;
        } catch {
            window.localStorage.removeItem(currentKey);
        }
    }

    return fallback;
}

export function writeCollection<T>(key: string, items: T[]) {
    if (!isBrowser()) return;
    window.localStorage.setItem(key, JSON.stringify(items));
}

export function prependCollectionItem<T>(key: string, item: T, fallback: T[] = [], legacyKeys: string[] = []) {
    const existing = readCollection<T>(key, fallback, legacyKeys);
    const next = [item, ...existing];
    writeCollection(key, next);
    return next;
}

// ---------------------------------------------------------------------------
// Course API wrappers (thin re-exports from lib/api.ts)
// ---------------------------------------------------------------------------

export {
    useCourses,
    useCourse,
    createCourse,
    updateCourse,
    deleteCourse,
    submitCourse as submitCourseForApproval,
    approveCourse,
    rejectCourse,
    unpublishCourse,
    enrollInCourse,
    useEnrollments,
    uploadCourseMaterial,
    getCourseMaterialDownloadUrl,
} from '@/lib/api';

// ---------------------------------------------------------------------------
// Exam submission API wrappers
// ---------------------------------------------------------------------------

export { useExamSubmissions } from '@/lib/api';

import { gradeExamSubmission as _gradeExamSubmission } from '@/lib/api';

export function gradeExamSubmission(
    id: string,
    score: number,
    passed: boolean | undefined,
    feedback: string
): Promise<ExamSubmission> {
    return _gradeExamSubmission(id, { score, passed, feedback });
}

// ---------------------------------------------------------------------------
// Supplier reorder API wrappers
// ---------------------------------------------------------------------------

export { useReorders } from '@/lib/api';

import {
    createReorder as _createReorder,
    hevacrazApproveReorder as _hevacrazApproveReorder,
    hevacrazRejectReorder as _hevacrazRejectReorder,
    nouApproveReorder as _nouApproveReorder,
    nouRejectReorder as _nouRejectReorder,
} from '@/lib/api';

export function submitReorder(
    _vendorId: string,
    _vendorName: string,
    gasType: string,
    quantityKg: number,
    purpose: string,
    supplierNotes: string
): Promise<SupplierReorder> {
    return _createReorder({ gasType, quantityKg, purpose, supplierNotes });
}

export function hevacrazApproveReorder(id: string, _reviewerId: string): Promise<SupplierReorder> {
    return _hevacrazApproveReorder(id);
}

export function hevacrazRejectReorder(id: string, reason: string, _reviewerId: string): Promise<SupplierReorder> {
    return _hevacrazRejectReorder(id, reason);
}

export function nouApproveReorder(id: string, _reviewerId: string): Promise<SupplierReorder> {
    return _nouApproveReorder(id);
}

export function nouRejectReorder(id: string, reason: string, _reviewerId: string): Promise<SupplierReorder> {
    return _nouRejectReorder(id, reason);
}

// ---------------------------------------------------------------------------
// Technician verification API wrappers
// ---------------------------------------------------------------------------

export { useVerifications } from '@/lib/api';

import { verifyTechnician as _verifyTechnician } from '@/lib/api';

export function logVerification(entry: Omit<TechnicianVerification, 'id' | 'createdAt'>): Promise<TechnicianVerification> {
    return _verifyTechnician({ method: entry.method, query: entry.query })
        .then(r => r.verification);
}

// ---------------------------------------------------------------------------
// Technicians API wrappers
// ---------------------------------------------------------------------------

export { useTechnicians, useTechnician } from '@/lib/api';
