import { cocRequests, supplierApplications, supplierReorders, trainerCertificateRequests } from '@/db/schema/index';
import type { SupplierReorder } from '@/lib/platformStore';
import type { CocRequest, SupplierRegistration, TrainerCertificateRequest } from '@/types/index';

export function toTrainerCertificateRequest(
  row: typeof trainerCertificateRequests.$inferSelect,
): TrainerCertificateRequest {
  return {
    id: row.id,
    examSubmissionId: row.examSubmissionId ?? undefined,
    technicianId: row.technicianId,
    technicianName: row.technicianName,
    technicianRegistrationNumber: row.technicianRegistrationNumber,
    technicianCompany: row.technicianCompany,
    trainerName: row.trainerName,
    trainerEmail: row.trainerEmail,
    courseTitle: row.courseTitle,
    examDate: row.examDate,
    theoryScore: row.theoryScore,
    practicalScore: row.practicalScore,
    overallScore: row.overallScore,
    notes: row.notes ?? undefined,
    status: row.status as TrainerCertificateRequest['status'],
    submittedAt: row.submittedAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? undefined,
    adminReviewer: row.adminReviewer ?? undefined,
    certificateNumber: row.certificateNumber ?? undefined,
    issuedAt: row.issuedAt?.toISOString() ?? undefined,
    verificationToken: row.verificationToken ?? undefined,
    verificationUrl:
      row.certificateNumber && row.verificationToken
        ? `/verify-technician?mode=certificate&q=${encodeURIComponent(row.certificateNumber)}&token=${row.verificationToken}`
        : undefined,
    cpdCredits: row.cpdCredits ?? undefined,
  };
}

export function toCocRequest(row: typeof cocRequests.$inferSelect): CocRequest {
  return {
    id: row.id,
    certificateNumber: row.certificateNumber,
    plannerJobId: row.plannerJobId ?? undefined,
    installationId: row.installationId ?? undefined,
    technicianId: row.technicianId,
    technicianName: row.technicianName,
    clientName: row.clientName,
    location: row.location,
    equipmentType: row.equipmentType,
    serialNumber: row.serialNumber ?? undefined,
    installationDate: row.installationDate,
    details: row.details ?? undefined,
    checklistSnapshot: row.checklistSnapshot ?? null,
    evidenceImages: row.evidenceImages ?? [],
    complianceCheck: row.complianceCheck,
    status: row.status as CocRequest['status'],
    verificationToken: row.verificationToken ?? undefined,
    verificationUrl:
      row.verificationToken && row.status === 'approved'
        ? `/verify-coc?q=${encodeURIComponent(row.certificateNumber)}&token=${row.verificationToken}`
        : undefined,
    reviewedBy: row.reviewedBy ?? undefined,
    reviewedAt: row.reviewedAt?.toISOString() ?? undefined,
    reviewNote: row.reviewNote ?? undefined,
    issuedDate: row.issuedDate ?? undefined,
    submittedAt: row.submittedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export type SupplierRegistrationRecord = SupplierRegistration & {
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
  /** Annual import quota in kg set by an administrator; absent until one is set. */
  importQuotaKg?: number;
};

export function toSupplierRegistration(row: typeof supplierApplications.$inferSelect): SupplierRegistrationRecord {
  return {
    id: row.id,
    companyName: row.companyName,
    tradingName: row.tradingName ?? undefined,
    registrationNumber: row.registrationNumber,
    supplierType: row.supplierType as SupplierRegistration['supplierType'],
    contactName: row.contactName,
    email: row.email,
    phone: row.phone,
    province: row.province,
    city: row.city,
    address: row.address,
    refrigerantsSupplied: row.refrigerantsSupplied as string[],
    taxNumber: row.taxNumber ?? undefined,
    website: row.website ?? undefined,
    notes: row.notes ?? undefined,
    surveyData: (row.surveyData as SupplierRegistration['surveyData']) ?? undefined,
    status: row.status as SupplierRegistration['status'],
    submittedAt: row.submittedAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? undefined,
    reviewedBy: row.reviewedBy ?? undefined,
    reviewNote: row.reviewNote ?? undefined,
    importQuotaKg: row.importQuotaKg === null ? undefined : Number(row.importQuotaKg),
  };
}

export function toSupplierReorder(row: typeof supplierReorders.$inferSelect): SupplierReorder {
  return {
    id: row.id,
    vendorId: row.vendorId,
    vendorName: row.vendorName,
    gasType: row.gasType,
    quantityKg: Number(row.quantityKg),
    purpose: row.purpose,
    reorderType: row.reorderType === 'recovery' ? 'recovery' : 'purchase',
    supplierNotes: row.supplierNotes,
    status: row.status as SupplierReorder['status'],
    hevacrazReviewerId: row.hevacrazReviewerId ?? undefined,
    hevacrazReviewedAt: row.hevacrazReviewedAt?.toISOString() ?? undefined,
    nouReviewerId: row.nouReviewerId ?? undefined,
    nouReviewedAt: row.nouReviewedAt?.toISOString() ?? undefined,
    rejectionReason: row.rejectionReason ?? undefined,
    rejectedBy: row.rejectedBy ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}
