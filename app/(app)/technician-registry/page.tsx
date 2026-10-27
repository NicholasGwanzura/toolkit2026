'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, Download, Mail, Phone, Search, ShieldCheck } from 'lucide-react';
import autoTable from 'jspdf-autotable';
import { jsPDF } from 'jspdf';
import { Technician } from '@/types/index';
import { useAuth } from '@/lib/auth';
import { useTechnicians } from '@/lib/api';
import { RegistryLoginsPanel } from '@/components/admin/RegistryLoginsPanel';
import { TECHNICIAN_SPECIALIZATIONS, ZIMBABWE_PROVINCES } from '@/constants/registry';

type CertificationFilter = '' | 'valid' | 'expired' | 'pending';

function TechnicianRegistryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: session } = useAuth();

  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') ?? '');
  const [selectedProvince, setSelectedProvince] = useState(() => searchParams.get('province') ?? '');
  const [selectedDistrict, setSelectedDistrict] = useState(() => searchParams.get('district') ?? '');
  const [selectedSpecialization, setSelectedSpecialization] = useState(() => searchParams.get('specialization') ?? '');
  const [selectedStatus, setSelectedStatus] = useState(() => searchParams.get('status') ?? '');
  const [selectedEmploymentStatus, setSelectedEmploymentStatus] = useState('');
  const [selectedCertificationStatus, setSelectedCertificationStatus] = useState<CertificationFilter>('');

  const availableDistricts = useMemo(() => {
    if (!selectedProvince) {
      return ZIMBABWE_PROVINCES.flatMap(province => province.districts).sort();
    }

    return (
      ZIMBABWE_PROVINCES.find(province => province.name === selectedProvince)?.districts ?? []
    );
  }, [selectedProvince]);

  const { data: techniciansData, error: techniciansError, isLoading: techniciansLoading } = useTechnicians(searchTerm.trim() || undefined);

  const filteredTechnicians = useMemo(() => {
    const data = techniciansData ?? [];
    const term = searchTerm.trim().toLowerCase();

    return data.filter(tech => {
      const matchesSearch =
        !term ||
        [
          tech.name,
          tech.registrationNumber,
          tech.nationalId,
          tech.specialization,
          tech.province,
          tech.district,
          tech.contactNumber,
          tech.email ?? '',
          tech.employer ?? '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(term);

      const matchesProvince = !selectedProvince || tech.province === selectedProvince;
      const matchesDistrict = !selectedDistrict || tech.district === selectedDistrict;
      const matchesSpecialization = !selectedSpecialization || tech.specialization === selectedSpecialization;
      const matchesStatus = !selectedStatus || tech.status === selectedStatus;
      const matchesEmploymentStatus = !selectedEmploymentStatus || tech.employmentStatus === selectedEmploymentStatus;
      const matchesCertificationStatus =
        !selectedCertificationStatus ||
        tech.certifications.some(certification => certification.status === selectedCertificationStatus);

      return (
        matchesSearch &&
        matchesProvince &&
        matchesDistrict &&
        matchesSpecialization &&
        matchesStatus &&
        matchesEmploymentStatus &&
        matchesCertificationStatus
      );
    });
  }, [
    techniciansData,
    searchTerm,
    selectedProvince,
    selectedDistrict,
    selectedSpecialization,
    selectedStatus,
    selectedEmploymentStatus,
    selectedCertificationStatus,
  ]);

  const registrySummary = useMemo(() => {
    return {
      total: filteredTechnicians.length,
      active: filteredTechnicians.filter(tech => tech.status === 'active').length,
      employed: filteredTechnicians.filter(tech => tech.employmentStatus === 'employed').length,
      provinces: new Set(
        filteredTechnicians
          .map((tech) => tech.province)
          .filter((province) => ZIMBABWE_PROVINCES.some((known) => known.name === province))
      ).size,
      towns: new Set(filteredTechnicians.map(tech => tech.district)).size,
      validCertificates: filteredTechnicians.filter(tech =>
        tech.certifications.some(certification => certification.status === 'valid')
      ).length,
    };
  }, [filteredTechnicians]);

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(18);
    doc.text('National RAC Technician Verification and Competency Registry Report', 14, 18);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString('en-ZW')}`, 14, 26);
    doc.text(`Records: ${filteredTechnicians.length}`, 14, 32);

    autoTable(doc, {
      startY: 38,
      head: [[
        'Name',
        'Registration',
        'Province',
        'Town',
        'Specialization',
        'Status',
        'Employer',
        'Contact',
        'Email',
      ]],
      body: filteredTechnicians.map(tech => [
        tech.name,
        tech.registrationNumber,
        tech.province,
        tech.district,
        tech.specialization,
        tech.status,
        tech.employer ?? tech.employmentStatus,
        tech.contactNumber,
        tech.email ?? 'N/A',
      ]),
      headStyles: { fillColor: [44, 36, 32] },
      styles: { fontSize: 8, cellPadding: 2.5 },
    });

    doc.save(`technician-registry-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const statusBadge = (status: Technician['status']) => {
    const classes: Record<Technician['status'], string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };

    return (
      <span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${classes[status]}`}>
        {status}
      </span>
    );
  };

  if (techniciansLoading) {
    return <div className="p-8 text-sm text-slate-500">Loading…</div>;
  }

  if (techniciansError) {
    return <div className="p-8 text-sm text-red-600">Failed to load. {techniciansError.message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Tech Registry</h1>

          </div>
          <p className="mt-1 text-gray-500">
            All registered technicians, searchable by province, town, specialization, and status.
          </p>
        </div>
        <button
          onClick={exportPdf}
          className="inline-flex items-center gap-2 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
        >
          <Download className="h-4 w-4" />
          Export PDF Report
        </button>
      </div>

      {session?.role === 'org_admin' && <RegistryLoginsPanel />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <SummaryCard label="Registered Techs" value={registrySummary.total} />
        <SummaryCard label="Active" value={registrySummary.active} />
        <SummaryCard label="Employed" value={registrySummary.employed} />
        <SummaryCard label="Provinces" value={registrySummary.provinces} />
        <SummaryCard label="Towns" value={registrySummary.towns} />
        <SummaryCard label="Valid Certs" value={registrySummary.validCertificates} />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-2">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Name, registration, ID, employer, email, contact, town..."
                className="w-full border border-gray-300 py-2.5 pl-10 pr-4 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <FilterSelect
            label="Province"
            value={selectedProvince}
            onChange={value => {
              setSelectedProvince(value);
              setSelectedDistrict('');
            }}
            options={ZIMBABWE_PROVINCES.map(province => province.name)}
          />
          <FilterSelect
            label="Town"
            value={selectedDistrict}
            onChange={setSelectedDistrict}
            options={availableDistricts}
          />
          <FilterSelect
            label="Specialization"
            value={selectedSpecialization}
            onChange={setSelectedSpecialization}
            options={TECHNICIAN_SPECIALIZATIONS}
          />
          <FilterSelect
            label="Registration Status"
            value={selectedStatus}
            onChange={setSelectedStatus}
            options={['active', 'inactive', 'suspended', 'pending']}
          />
          <FilterSelect
            label="Employment"
            value={selectedEmploymentStatus}
            onChange={setSelectedEmploymentStatus}
            options={['employed', 'self-employed', 'unemployed']}
          />
          <FilterSelect
            label="Certification"
            value={selectedCertificationStatus}
            onChange={value => setSelectedCertificationStatus(value as CertificationFilter)}
            options={['valid', 'expired', 'pending']}
          />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="divide-y divide-gray-200">
          {filteredTechnicians.map(technician => (
            <div key={technician.id} className="p-6 transition-colors hover:bg-gray-50">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-4 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">{technician.name}</h3>
                    {statusBadge(technician.status)}
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {technician.specialization}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-sm text-gray-600 md:grid-cols-2 xl:grid-cols-4">
                    <FieldLine label="Reg No" value={technician.registrationNumber} />
                    <FieldLine label="National ID" value={technician.nationalId} />
                    <FieldLine label="Province" value={technician.province} />
                    <FieldLine label="Town" value={technician.district} />
                    <FieldLine label="Employment" value={technician.employmentStatus.replace('-', ' ')} />
                    <FieldLine label="Employer" value={technician.employer ?? 'Independent'} />
                    <FieldLine label="Registered" value={technician.registrationDate} />
                    <FieldLine label="Expiry" value={technician.expiryDate} />
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-sm text-gray-600 md:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{technician.contactNumber}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>{technician.email ?? 'No email on file'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {technician.certifications.map(certification => (
                      <span
                        key={certification.id}
                        className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600"
                      >
                        {certification.name} · {certification.status}
                      </span>
                    ))}
                  </div>
                </div>

                  <button
                    onClick={() => router.push(`/technician-registry/${technician.id}`)}
                    className="inline-flex items-center gap-2 bg-gray-900 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-600"
                  >
                    View Profile
                    <ChevronRight className="h-4 w-4" />
                  </button>
              </div>
            </div>
          ))}
        </div>

        {filteredTechnicians.length === 0 && (
          <div className="p-12 text-center">
            <Search className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900">No technicians found</h3>
            <p className="text-gray-500">Adjust your filters to broaden the registry search.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">{label}</label>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full border border-gray-300 px-3 py-2.5 focus:border-transparent focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All {label}</option>
        {options.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function FieldLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="font-semibold text-gray-400">{label}:</span>
      <span className="text-gray-700">{value}</span>
    </div>
  );
}

export default function TechnicianRegistryPage() {
  return (
    <Suspense fallback={
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    }>
      <TechnicianRegistryContent />
    </Suspense>
  );
}
