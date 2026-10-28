'use client';

import { useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, AlertTriangle, Clock, MapPin, Phone, Mail, Briefcase, Award, Calendar, FileText, Building2, Loader2, Camera, User, Download } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import { useTechnician, uploadTechnicianPhoto, useTechnicianCertificationDocuments } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { SITE_URL } from '@/lib/site-url';
import type { Technician } from '@/types/index';

const HEVACRAZ_LOGO_PATH = '/logos/hevacraz-logo.jpeg';
const MOECT_LOGO_PATH = '/logos/ministry-of-environment.jpeg';

async function loadImageAsDataUrl(path: string): Promise<string | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function buildCertificateDoc(
  technician: Technician,
  qrCanvas: HTMLCanvasElement | null,
): Promise<{ doc: jsPDF; certificateNumber: string }> {
  const [logoLeft, logoRight] = await Promise.all([
    loadImageAsDataUrl(HEVACRAZ_LOGO_PATH),
    loadImageAsDataUrl(MOECT_LOGO_PATH),
  ]);
  const qrDataUrl = qrCanvas?.toDataURL('image/png') ?? null;

  const INK: [number, number, number] = [28, 25, 23];
  const AMBER: [number, number, number] = [217, 119, 6];
  const GREEN: [number, number, number] = [90, 125, 90];
  const MUTED: [number, number, number] = [120, 113, 108];

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const PAGE_W = 297;
  const PAGE_H = 210;
  const issueYear = new Date().getFullYear();
  const certificateNumber = `HEVACRAZ/CERT/${technician.registrationNumber}/${issueYear}`;

  // Ornate double border
  doc.setDrawColor(...INK);
  doc.setLineWidth(1.1);
  doc.rect(8, 8, PAGE_W - 16, PAGE_H - 16);
  doc.setDrawColor(...AMBER);
  doc.setLineWidth(0.4);
  doc.rect(12, 12, PAGE_W - 24, PAGE_H - 24);

  // Logos
  if (logoLeft) { try { doc.addImage(logoLeft, 'JPEG', 24, 20, 20, 20); } catch { /* logo optional */ } }
  if (logoRight) { try { doc.addImage(logoRight, 'JPEG', PAGE_W - 44, 20, 20, 20); } catch { /* logo optional */ } }

  // Header
  doc.setFontSize(11);
  doc.setTextColor(...AMBER);
  doc.setFont('', 'bold');
  doc.text('NOU / HEVACRAZ  ·  NATIONAL OZONE UNIT ZIMBABWE', PAGE_W / 2, 32, { align: 'center' });

  doc.setFontSize(28);
  doc.setTextColor(...INK);
  doc.text('CERTIFICATE OF COMPETENCY', PAGE_W / 2, 48, { align: 'center' });

  doc.setDrawColor(...AMBER);
  doc.setLineWidth(0.6);
  doc.line(PAGE_W / 2 - 30, 53, PAGE_W / 2 + 30, 53);

  doc.setFont('', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(...MUTED);
  doc.text('This is to certify that', PAGE_W / 2, 68, { align: 'center' });

  // Name
  doc.setFont('', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(...INK);
  doc.text(technician.name.toUpperCase(), PAGE_W / 2, 84, { align: 'center' });

  doc.setFont('', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(...MUTED);
  doc.text('has successfully completed the national assessment for', PAGE_W / 2, 100, { align: 'center' });

  doc.setFont('', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...GREEN);
  doc.text(technician.specialization, PAGE_W / 2, 114, { align: 'center' });

  // Detail columns
  const detailY = 138;
  const cols: [string, string][] = [
    ['Certificate No', certificateNumber],
    ['Registration No', technician.registrationNumber],
    ['Issue Date', new Intl.DateTimeFormat('en-ZW', { dateStyle: 'medium' }).format(new Date())],
    ['Valid Until', technician.expiryDate || 'Not set'],
  ];
  const colWidth = (PAGE_W - 60) / cols.length;
  cols.forEach(([label, value], i) => {
    const x = 30 + colWidth * i + colWidth / 2;
    doc.setFont('', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x, detailY, { align: 'center' });
    doc.setFont('', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(value, x, detailY + 6, { align: 'center', maxWidth: colWidth - 4 });
  });

  // QR code — unique, verifiable at the public verification portal
  if (qrDataUrl) {
    const qrSize = 26;
    const qrX = PAGE_W - 24 - qrSize;
    const qrY = PAGE_H - 24 - qrSize - 6;
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    doc.setFont('', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text('Scan to verify', qrX + qrSize / 2, qrY + qrSize + 4, { align: 'center' });
  }

  // Footer
  doc.setFont('', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text('National Refrigeration Program', 32, PAGE_H - 34);
  doc.setFont('', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('Republic of Zimbabwe', 32, PAGE_H - 29);
  doc.text(
    `Verify this certificate at ${SITE_URL}/verify-technician?mode=registration&q=${encodeURIComponent(technician.registrationNumber)}`,
    32,
    PAGE_H - 20,
    { maxWidth: 180 },
  );

  return { doc, certificateNumber };
}

export default function TechnicianDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { success, info, error: toastError } = useToast();
  const { user: session } = useAuth();
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [generatingCertificate, setGeneratingCertificate] = useState(false);
  const [sendingCertificate, setSendingCertificate] = useState(false);
  const [resendingActivation, setResendingActivation] = useState(false);
  const [generatingIdCard, setGeneratingIdCard] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : undefined;
  const { data: technician, error, isLoading } = useTechnician(id);
  const isReviewer = session?.role === 'trainer' || session?.role === 'lecturer' || session?.role === 'org_admin';

  const handleResendActivation = async () => {
    if (!id) return;
    setResendingActivation(true);
    try {
      const response = await fetch('/api/admin/technicians/activation-invites', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id], resendAll: true }),
      });
      const body = await response.json().catch(() => ({})) as { sent?: number; failed?: Array<{ reason: string }>; error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Could not send the activation email.');
      if (body.sent) success(`Activation email sent to ${technician?.email}.`);
      else toastError(body.failed?.[0]?.reason ?? 'The activation email could not be sent.');
    } catch (cause) {
      toastError(cause instanceof Error ? cause.message : 'Could not send the activation email.');
    } finally {
      setResendingActivation(false);
    }
  };

  const handlePhotoSelected = async (file: File) => {
    if (!id) return;
    setUploadingPhoto(true);
    try {
      await uploadTechnicianPhoto(id, file);
      success('Photo uploaded');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Photo upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-sm text-slate-500">Loading…</div>;
  }

  if (error) {
    return <div className="p-8 text-sm text-red-600">Failed to load. {error.message}</div>;
  }

  if (!technician) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-yellow-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Technician Not Found</h3>
        <p className="text-gray-500 mb-4">The requested technician could not be found in the registry.</p>
        <button
          onClick={() => router.push('/technician-registry')}
          className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          Return to Registry
        </button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };

    const labels = {
      active: 'Active',
      inactive: 'Inactive',
      suspended: 'Suspended',
      pending: 'Pending'
    };

    const icons = {
      active: CheckCircle,
      inactive: AlertTriangle,
      suspended: AlertTriangle,
      pending: Clock
    };

    const Icon = icons[status as keyof typeof icons];

    return (
      <span className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        <Icon className="h-4 w-4" />
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Not set';
    return new Intl.DateTimeFormat('en-ZW', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/technician-registry')}
          className="p-2 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>

        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handlePhotoSelected(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          disabled={uploadingPhoto}
          title="Upload technician photo"
          className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-50 disabled:cursor-wait"
        >
          {technician.photoUrl ? (
            <img src={technician.photoUrl} alt={technician.name} className="h-full w-full object-cover" />
          ) : (
            <User className="mx-auto h-8 w-8 mt-3.5 text-gray-300" />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            {uploadingPhoto ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Camera className="h-5 w-5 text-white" />}
          </span>
        </button>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">{technician.name}</h1>
          <p className="text-gray-500 mt-1">National RAC Technician Verification and Competency Registry</p>
        </div>
        {getStatusBadge(technician.status)}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Personal Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Details */}
          <div className="bg-white border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Full Name</p>
                <p className="text-gray-900">{technician.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">National ID</p>
                <p className="text-gray-900">{technician.nationalId}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Registration Number</p>
                <p className="text-gray-900">{technician.registrationNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Specialization</p>
                <p className="text-gray-900">{technician.specialization}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Contact Number</p>
                <p className="text-gray-900">{technician.contactNumber}</p>
              </div>
              {technician.email && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-gray-900">{technician.email}</p>
                  {session?.role === 'org_admin' && (
                    <button
                      type="button"
                      onClick={handleResendActivation}
                      disabled={resendingActivation}
                      className="mt-2 min-h-10 border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {resendingActivation ? 'Sending…' : 'Resend activation email'}
                    </button>
                  )}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-500">Employment Status</p>
                <p className="text-gray-900 capitalize">{technician.employmentStatus.replace('-', ' ')}</p>
              </div>
              {technician.employer && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Employer</p>
                  <p className="text-gray-900">{technician.employer}</p>
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="bg-white border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Location</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Province</p>
                <p className="text-gray-900">{technician.province}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">District</p>
                <p className="text-gray-900">{technician.district}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Region</p>
                <p className="text-gray-900">{technician.region}</p>
              </div>
            </div>
          </div>

          {/* Certifications */}
          <div className="bg-white border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Certifications</h2>
            <div className="space-y-4">
              {technician.certifications.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No certifications on record</p>
              ) : (
                technician.certifications.map((cert) => (
                  <div key={cert.id} className="border border-gray-200 p-4 hover:border-blue-300 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{cert.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{cert.issuingBody}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            <span>Cert No: {cert.certificateNumber}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Issued: {formatDate(cert.dateIssued)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Expiry: {formatDate(cert.expiryDate)}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${cert.status === 'valid' ? 'bg-green-100 text-green-800' :
                          cert.status === 'expired' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                        }`}>
                        {cert.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Uploaded certification documents */}
          {isReviewer && <TechnicianDocumentsCard technicianId={technician.id} />}

          {/* Training History */}
          <div className="bg-white border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Training History</h2>
            <div className="space-y-4">
              {technician.trainingHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No training records on file</p>
              ) : (
                technician.trainingHistory.map((training) => (
                  <div key={training.id} className="border border-gray-200 p-4 hover:border-blue-300 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{training.courseName}</h3>
                        <p className="text-sm text-gray-500 mt-1">{training.provider}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Completed: {formatDate(training.dateCompleted)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>Duration: {training.duration}</span>
                          </div>
                          {training.certificateNumber && (
                            <div className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              <span>Cert No: {training.certificateNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Registration Details */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Registration Status</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500">Registration Date</p>
                <p className="text-gray-900">{formatDate(technician.registrationDate)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Expiry Date</p>
                <p className="text-gray-900">{formatDate(technician.expiryDate)}</p>
              </div>
              {technician.lastRenewalDate && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Last Renewal</p>
                  <p className="text-gray-900">{formatDate(technician.lastRenewalDate)}</p>
                </div>
              )}
              {technician.nextRenewalDate && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Next Renewal</p>
                  <p className="text-gray-900">{formatDate(technician.nextRenewalDate)}</p>
                </div>
              )}
            </div>
          </div>


          <div className="absolute -left-[9999px]" aria-hidden>
            <QRCodeCanvas
              ref={qrCanvasRef}
              value={`${SITE_URL}/verify-technician?mode=registration&q=${encodeURIComponent(technician.registrationNumber)}`}
              size={256}
              level="M"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                disabled={generatingCertificate}
                onClick={async () => {
                  setGeneratingCertificate(true);
                  try {
                    const { doc } = await buildCertificateDoc(technician, qrCanvasRef.current);
                    doc.save(`${technician.name.replace(/\s+/g, '-')}-certificate.pdf`);
                    success('Certificate downloaded successfully');
                  } finally {
                    setGeneratingCertificate(false);
                  }
                }}
                className="w-full px-4 py-3 bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generatingCertificate ? <Loader2 className="h-5 w-5 animate-spin" /> : <Award className="h-5 w-5" />}
                Generate National Certificate
              </button>
              <button
                disabled={sendingCertificate || !technician.email}
                title={technician.email ? undefined : 'This technician has no email on file'}
                onClick={async () => {
                  setSendingCertificate(true);
                  try {
                    const { doc, certificateNumber } = await buildCertificateDoc(technician, qrCanvasRef.current);
                    const pdfBase64 = doc.output('datauristring').split(',')[1] ?? '';
                    const res = await fetch(`/api/technicians/${technician.id}/send-certificate`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ pdfBase64, certificateNumber }),
                    });
                    if (!res.ok) {
                      const body = await res.json().catch(() => ({}));
                      throw new Error(body.error ?? 'Failed to send certificate');
                    }
                    success(`Certificate emailed to ${technician.email}`);
                  } catch (err) {
                    toastError(err instanceof Error ? err.message : 'Failed to send certificate');
                  } finally {
                    setSendingCertificate(false);
                  }
                }}
                className="w-full px-4 py-2 bg-white text-blue-600 border border-blue-300 hover:bg-blue-50 transition-colors disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {sendingCertificate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Send Certificate
              </button>
              <button
                onClick={() => window.print()}
                className="w-full px-4 py-2 bg-white text-blue-600 border border-blue-300 hover:bg-blue-50 transition-colors"
              >
                Print Full Profile
              </button>
              <button
                disabled={generatingIdCard}
                onClick={async () => {
                  setGeneratingIdCard(true);
                  try {
                    const [logoLeft, logoRight, photo] = await Promise.all([
                      loadImageAsDataUrl(HEVACRAZ_LOGO_PATH),
                      loadImageAsDataUrl(MOECT_LOGO_PATH),
                      technician.photoUrl ? loadImageAsDataUrl(technician.photoUrl) : Promise.resolve(null),
                    ]);
                    const qrDataUrl = qrCanvasRef.current?.toDataURL('image/png') ?? null;

                    const INK: [number, number, number] = [28, 25, 23];
                    const AMBER: [number, number, number] = [217, 119, 6];
                    const GREEN: [number, number, number] = [90, 125, 90];
                    const MUTED: [number, number, number] = [120, 113, 108];
                    const LINE: [number, number, number] = [229, 224, 219];
                    const CARD_W = 85.6;
                    const CARD_H = 54;

                    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [CARD_W, CARD_H] });

                    // White premium card background
                    doc.setFillColor(255, 255, 255);
                    doc.rect(0, 0, CARD_W, CARD_H, 'F');
                    doc.setDrawColor(...LINE);
                    doc.setLineWidth(0.4);
                    doc.rect(1, 1, CARD_W - 2, CARD_H - 2);
                    doc.setDrawColor(...AMBER);
                    doc.setLineWidth(0.6);
                    doc.line(1, 12, CARD_W - 1, 12);

                    // Logos
                    if (logoLeft) { try { doc.addImage(logoLeft, 'JPEG', 3, 2.5, 7, 7); } catch { /* logo optional */ } }
                    if (logoRight) { try { doc.addImage(logoRight, 'JPEG', CARD_W - 10, 2.5, 7, 7); } catch { /* logo optional */ } }

                    doc.setFont('', 'bold');
                    doc.setFontSize(6);
                    doc.setTextColor(...AMBER);
                    doc.text('NOU / HEVACRAZ', CARD_W / 2, 5.5, { align: 'center' });
                    doc.setFont('', 'normal');
                    doc.setFontSize(4.8);
                    doc.setTextColor(...MUTED);
                    doc.text('TECHNICIAN IDENTIFICATION CARD', CARD_W / 2, 9, { align: 'center' });

                    // Photo frame
                    const photoX = 4;
                    const photoY = 16;
                    const photoSize = 17;
                    doc.setDrawColor(...LINE);
                    doc.setLineWidth(0.3);
                    doc.roundedRect(photoX, photoY, photoSize, photoSize, 1.5, 1.5);
                    if (photo) {
                      try { doc.addImage(photo, photoX, photoY, photoSize, photoSize); } catch { /* photo optional */ }
                    } else {
                      doc.setFillColor(245, 245, 244);
                      doc.roundedRect(photoX, photoY, photoSize, photoSize, 1.5, 1.5, 'F');
                      doc.setFont('', 'bold');
                      doc.setFontSize(10);
                      doc.setTextColor(...MUTED);
                      const initials = technician.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
                      doc.text(initials, photoX + photoSize / 2, photoY + photoSize / 2 + 1.5, { align: 'center' });
                    }

                    // Name + specialization
                    const infoX = photoX + photoSize + 4;
                    doc.setFont('', 'bold');
                    doc.setFontSize(9.5);
                    doc.setTextColor(...INK);
                    doc.text(technician.name.toUpperCase(), infoX, 21, { maxWidth: CARD_W - infoX - 4 });
                    doc.setFont('', 'normal');
                    doc.setFontSize(6.5);
                    doc.setTextColor(...MUTED);
                    doc.text(technician.specialization, infoX, 26);

                    // Status pill
                    const statusColor: [number, number, number] = technician.status === 'active' ? GREEN : [190, 60, 60];
                    doc.setFillColor(...statusColor);
                    doc.roundedRect(infoX, 29, 16, 4.5, 1, 1, 'F');
                    doc.setFont('', 'bold');
                    doc.setFontSize(4.5);
                    doc.setTextColor(255, 255, 255);
                    doc.text(technician.status.toUpperCase(), infoX + 8, 32, { align: 'center' });

                    // Detail rows
                    doc.setDrawColor(...LINE);
                    doc.setLineWidth(0.25);
                    doc.line(4, 37, CARD_W - 4, 37);

                    const rows: [string, string][] = [
                      ['REG NO', technician.registrationNumber],
                      ['PROVINCE', technician.province],
                      ['VALID UNTIL', technician.expiryDate || 'Not set'],
                    ];
                    const rowColWidth = (CARD_W - 8 - 24) / rows.length;
                    rows.forEach(([label, value], i) => {
                      const x = 4 + rowColWidth * i;
                      doc.setFont('', 'normal');
                      doc.setFontSize(4.5);
                      doc.setTextColor(...MUTED);
                      doc.text(label, x, 41);
                      doc.setFont('', 'bold');
                      doc.setFontSize(5.5);
                      doc.setTextColor(...INK);
                      doc.text(value, x, 45, { maxWidth: rowColWidth - 2 });
                    });

                    // QR code — verifiable at the public verification portal
                    if (qrDataUrl) {
                      const qrSize = 15;
                      doc.addImage(qrDataUrl, 'PNG', CARD_W - qrSize - 4, CARD_H - qrSize - 4, qrSize, qrSize);
                    }

                    doc.save(`${technician.name.replace(/\s+/g, '-')}-digital-id.pdf`);
                    success('Digital ID card downloaded successfully');
                  } finally {
                    setGeneratingIdCard(false);
                  }
                }}
                className="w-full px-4 py-2 bg-white text-blue-600 border border-blue-300 hover:bg-blue-50 transition-colors disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {generatingIdCard && <Loader2 className="h-4 w-4 animate-spin" />}
                Send Digital ID Card
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function formatDocumentSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Documents the technician uploaded from their own account, for trainers and administrators reviewing certification. */
function TechnicianDocumentsCard({ technicianId }: { technicianId: string }) {
  const { data, error, isLoading } = useTechnicianCertificationDocuments(technicianId);
  const documents = data?.documents ?? [];

  return (
    <div className="bg-white border border-gray-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Certification documents</h2>
      <p className="text-sm text-gray-500">Uploaded by the technician from their own account.</p>
      {isLoading ? (
        <p className="mt-4 text-sm text-gray-400">Loading…</p>
      ) : error ? (
        <p className="mt-4 text-sm text-rose-600">Could not load the uploaded documents.</p>
      ) : documents.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No documents uploaded yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="flex min-w-0 items-center gap-2 text-sm text-gray-900">
                <FileText className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                <span className="truncate">{doc.fileName}</span>
                <span className="shrink-0 text-xs text-gray-500">
                  {formatDocumentSize(doc.sizeBytes)} · {new Date(doc.uploadedAt).toLocaleDateString('en-GB')}
                </span>
              </span>
              <a
                href={`/api/technicians/${technicianId}/certification-documents/${doc.id}`}
                className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Download
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
