import { and, asc, count, eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import { technicianDocuments, technicians } from '@/db/schema/index';
import { safeDocumentName } from '@/lib/application-documents';
import { MAX_CERTIFICATION_DOCUMENTS, certificationDocumentSlotsLeft } from '@/lib/technician-documents';
import { matchesDeclaredType, SIGNATURE_BYTES_NEEDED } from '@/lib/server/file-signatures';

export interface TechnicianDocumentSummary {
  id: string;
  fileName: string;
  fileType: string;
  sizeBytes: number;
  uploadedAt: string;
}

const summaryColumns = {
  id: technicianDocuments.id,
  fileName: technicianDocuments.fileName,
  fileType: technicianDocuments.fileType,
  sizeBytes: technicianDocuments.sizeBytes,
  uploadedAt: technicianDocuments.uploadedAt,
};

export { MAX_CERTIFICATION_DOCUMENTS };

/** The registry record behind a signed-in technician account, matched on email. */
export async function findTechnicianForUser(email: string) {
  const [row] = await db
    .select({ id: technicians.id, name: technicians.name, status: technicians.status })
    .from(technicians)
    .where(sql`lower(trim(${technicians.email})) = ${email.trim().toLowerCase()}`)
    .limit(1);
  return row ?? null;
}

export async function listTechnicianDocuments(technicianId: string): Promise<TechnicianDocumentSummary[]> {
  const rows = await db
    .select(summaryColumns)
    .from(technicianDocuments)
    .where(eq(technicianDocuments.technicianId, technicianId))
    .orderBy(asc(technicianDocuments.uploadedAt));
  return rows.map((row) => ({ ...row, uploadedAt: row.uploadedAt.toISOString() }));
}

/** Stores one upload after checking its real contents match the declared file type. */
export async function addTechnicianDocument(
  technicianId: string,
  uploadedByUserId: string,
  file: { name: string; type: string; data: Buffer },
): Promise<{ document: TechnicianDocumentSummary } | { error: string; status: number }> {
  if (!matchesDeclaredType(file.data.subarray(0, SIGNATURE_BYTES_NEEDED), file.type)) {
    return { error: 'That file does not look like a real PDF, JPG or PNG. Please upload the original file.', status: 400 };
  }
  const [{ total }] = await db
    .select({ total: count() })
    .from(technicianDocuments)
    .where(eq(technicianDocuments.technicianId, technicianId));
  if (certificationDocumentSlotsLeft(Number(total)) === 0) {
    return {
      error: `You have reached the limit of ${MAX_CERTIFICATION_DOCUMENTS} documents. Remove one to add another.`,
      status: 409,
    };
  }
  const [row] = await db
    .insert(technicianDocuments)
    .values({
      technicianId,
      uploadedByUserId,
      fileName: safeDocumentName(file.name),
      fileType: file.type,
      sizeBytes: file.data.length,
      data: file.data,
    })
    .returning(summaryColumns);
  return { document: { ...row, uploadedAt: row.uploadedAt.toISOString() } };
}

export async function removeTechnicianDocument(technicianId: string, documentId: string): Promise<boolean> {
  const removed = await db
    .delete(technicianDocuments)
    .where(and(
      eq(technicianDocuments.id, documentId),
      eq(technicianDocuments.technicianId, technicianId),
    ))
    .returning({ id: technicianDocuments.id });
  return removed.length > 0;
}

/** Reviewers only: the stored file itself. */
export async function getTechnicianDocumentFile(technicianId: string, documentId: string) {
  const [row] = await db
    .select()
    .from(technicianDocuments)
    .where(and(
      eq(technicianDocuments.id, documentId),
      eq(technicianDocuments.technicianId, technicianId),
    ))
    .limit(1);
  return row ?? null;
}
