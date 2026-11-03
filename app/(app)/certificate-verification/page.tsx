import TechnicianVerificationPortal from '@/components/verify/TechnicianVerificationPortal';

export default function CertificateVerificationPage() {
  return (
    <TechnicianVerificationPortal
      variant="embedded"
      heading="Public Verification Portal"
      description="Check that a technician is registered, by registration number or name. A HEVACRAZ / CertifyZim training certificate can also be checked by its number or QR share link."
    />
  );
}
