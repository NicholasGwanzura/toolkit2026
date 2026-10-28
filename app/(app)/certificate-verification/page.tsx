import TechnicianVerificationPortal from '@/components/verify/TechnicianVerificationPortal';

export default function CertificateVerificationPage() {
  return (
    <TechnicianVerificationPortal
      variant="embedded"
      heading="Certificate Verification"
      description="Verify a technician by registration number or name, or validate a HEVACRAZ / CertifyZim certificate using the certificate number or its QR share link."
    />
  );
}
