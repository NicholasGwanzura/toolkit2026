'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, Plus, Edit2, Trash2, CheckCircle, XCircle, Clock, ChevronRight, UserPlus, Download, Eye, X } from 'lucide-react';
import { Technician } from '@/types/index';
import { ZIMBABWE_PROVINCES, TECHNICIAN_SPECIALIZATIONS } from '@/constants/registry';
import { useClientSession } from '@/lib/useClientSession';
import { useTechnicians, updateTechnician, deleteTechnician, useMemberships, createMembership } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';

const PENDING_CERTIFICATIONS: Array<{ id: string; tech: string; cert: string; date: string; score: string; details: string }> = [];

export default function ManageTechniciansPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const session = useClientSession();
  const canReview = session?.role === 'org_admin';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedMembershipStatus, setSelectedMembershipStatus] = useState('');
  const [activeTab, setActiveTab] = useState<'technicians' | 'certifications'>('technicians');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [suspendTargetId, setSuspendTargetId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingCerts, setPendingCerts] = useState(PENDING_CERTIFICATIONS);
  const [examModal, setExamModal] = useState<typeof PENDING_CERTIFICATIONS[number] | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { data: techniciansData, error: techniciansError, isLoading: techniciansLoading } = useTechnicians();
  const { data: membershipsData } = useMemberships();

  const membershipByTechnicianId = useMemo(() => {
    const map = new Map<string, NonNullable<typeof membershipsData>[number]>();
    for (const m of membershipsData ?? []) {
      // Prefer the active membership if a technician has more than one record (e.g. renewed).
      const existing = map.get(m.technicianId);
      if (!existing || (m.status === 'active' && existing.status !== 'active')) map.set(m.technicianId, m);
    }
    return map;
  }, [membershipsData]);

  const provinceStats = useMemo(() => {
    const byProvince = new Map<string, number>();
    for (const t of techniciansData ?? []) {
      byProvince.set(t.province, (byProvince.get(t.province) ?? 0) + 1);
    }
    return [...byProvince.entries()].map(([province, total]) => ({ province, total })).sort((a, b) => b.total - a.total);
  }, [techniciansData]);

  const filteredTechnicians = useMemo(() => {
    const data = techniciansData ?? [];
    let filtered = [...data];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(tech =>
        tech.name.toLowerCase().includes(term) ||
        tech.registrationNumber.toLowerCase().includes(term) ||
        tech.nationalId.toLowerCase().includes(term) ||
        tech.specialization.toLowerCase().includes(term) ||
        (tech.email ?? '').toLowerCase().includes(term) ||
        tech.contactNumber.toLowerCase().includes(term) ||
        (membershipByTechnicianId.get(tech.id)?.membershipNumber ?? '').toLowerCase().includes(term)
      );
    }

    if (selectedProvince) {
      filtered = filtered.filter(tech => tech.province === selectedProvince);
    }

    if (selectedSpecialization) {
      filtered = filtered.filter(tech => tech.specialization === selectedSpecialization);
    }

    if (selectedStatus) {
      filtered = filtered.filter(tech => tech.status === selectedStatus);
    }

    if (selectedMembershipStatus) {
      filtered = filtered.filter(tech => {
        const membership = membershipByTechnicianId.get(tech.id);
        if (selectedMembershipStatus === 'none') return !membership;
        return membership?.status === selectedMembershipStatus;
      });
    }

    return filtered;
  }, [searchTerm, selectedProvince, selectedSpecialization, selectedStatus, selectedMembershipStatus, techniciansData, membershipByTechnicianId]);

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
      inactive: XCircle,
      suspended: XCircle,
      pending: Clock
    };

    const Icon = icons[status as keyof typeof icons];

    return (
      <span className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        <Icon className="h-3 w-3" />
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const handleApprove = async (id: string, techName: string) => {
    setMutationError(null);
    setBusyId(id);
    try {
      await updateTechnician(id, { status: 'active' });
      await createMembership({ technicianId: id });
      success(`${techName} approved — membership created and confirmation sent.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Approval failed';
      setMutationError(message);
      toastError(message);
    } finally {
      setBusyId(null);
    }
  };

  const handleReactivate = async (id: string, techName: string) => {
    setMutationError(null);
    setBusyId(id);
    try {
      await updateTechnician(id, { status: 'active' });
      success(`${techName} reactivated.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Status update failed';
      setMutationError(message);
      toastError(message);
    } finally {
      setBusyId(null);
    }
  };

  const handleSuspend = (id: string) => {
    setSuspendTargetId(id);
  };

  const confirmSuspend = async () => {
    if (!suspendTargetId) return;
    const id = suspendTargetId;
    const techName = techniciansData?.find((t) => t.id === id)?.name ?? 'Technician';
    setSuspendTargetId(null);
    setMutationError(null);
    setBusyId(id);
    try {
      await updateTechnician(id, { status: 'suspended' });
      success(`${techName} suspended.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Status update failed';
      setMutationError(message);
      toastError(message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);
    setMutationError(null);
    setBusyId(id);
    try {
      await deleteTechnician(id);
      success('Technician record deleted.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      setMutationError(message);
      toastError(message);
    } finally {
      setBusyId(null);
    }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Registration Number', 'National ID', 'Specialization', 'Province', 'District', 'Status', 'Employment Status', 'Employer', 'Contact', 'Email', 'Expiry Date'];
    const rows = filteredTechnicians.map(t => [
      t.name, t.registrationNumber, t.nationalId, t.specialization,
      t.province, t.district, t.status, t.employmentStatus,
      t.employer ?? '', t.contactNumber, t.email ?? '', t.expiryDate,
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `technician-registry-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    success(`Exported ${filteredTechnicians.length} technician records`);
  };

  const approveCert = (id: string, techName: string, certName: string) => {
    setPendingCerts(prev => prev.filter(c => c.id !== id));
    setExamModal(null);
    success(`Certification approved and issued to ${techName} ${certName}`);
  };

  if (techniciansLoading) {
    return <div className="p-8 text-sm text-slate-500">Loading…</div>;
  }

  if (techniciansError) {
    return <div className="p-8 text-sm text-red-600">Failed to load. {techniciansError.message}</div>;
  }

  return (
    <div className="space-y-6">
      <ConfirmModal
        open={deleteTargetId !== null}
        title="Delete technician record"
        description="This will permanently remove the technician from the registry. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />

      <ConfirmModal
        open={suspendTargetId !== null}
        title="Suspend technician"
        description="This immediately marks the technician as suspended — they will no longer verify as active on the public registry. You can reactivate them at any time."
        confirmLabel="Suspend"
        variant="danger"
        onConfirm={confirmSuspend}
        onCancel={() => setSuspendTargetId(null)}
      />

      {mutationError && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200">{mutationError}</div>
      )}

      {/* Exam Detail Modal */}
      {examModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900">Exam Submission</h3>
                <p className="text-sm text-gray-500 mt-0.5">{examModal.tech}</p>
              </div>
              <button onClick={() => setExamModal(null)} className="p-1 hover:bg-gray-100 transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Certification</p>
                <p className="font-semibold text-gray-900">{examModal.cert}</p>
              </div>
              <div className="flex gap-6">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Submitted</p>
                  <p className="font-semibold text-gray-900">{examModal.date}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Score</p>
                  <p className="font-bold text-green-600 text-lg">{examModal.score}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Examiner Notes</p>
                <p className="text-sm text-gray-700 leading-relaxed">{examModal.details}</p>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setExamModal(null)}
                className="flex-1 px-4 py-2 text-sm font-bold border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => approveCert(examModal.id, examModal.tech, examModal.cert)}
                className="flex-1 px-4 py-2 text-sm font-bold bg-gray-900 text-white hover:bg-blue-600 transition-colors"
              >
                Approve & Issue
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Program Administration</h1>
          <p className="text-gray-500 mt-1">Verify credentials, approve certifications, and manage the national registry</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/technician-registry/add')}
            className="px-4 py-2 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors flex items-center gap-2 font-semibold"
          >
            <UserPlus className="h-4 w-4" />
            Direct Entry
          </button>
          <button
            onClick={exportCSV}
            className="px-4 py-2 bg-[#B45309] text-white hover:bg-[#92400E] transition-colors flex items-center gap-2 font-semibold shadow-lg shadow-orange-500/20"
          >
            <Download className="h-4 w-4" />
            Export Registry
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white -2xl overflow-hidden">
        <button
          onClick={() => setActiveTab('technicians')}
          className={`px-8 py-4 text-sm font-bold transition-all border-b-2 ${activeTab === 'technicians'
              ? 'border-[#5A7D5A] text-[#5A7D5A] bg-[#5A7D5A]/5'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
        >
          National RAC Technician Verification and Competency Registry
        </button>
        <button
          onClick={() => setActiveTab('certifications')}
          className={`px-8 py-4 text-sm font-bold transition-all border-b-2 ${activeTab === 'certifications'
              ? 'border-[#5A7D5A] text-[#5A7D5A] bg-[#5A7D5A]/5'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
        >
          Certification Approvals
          <span className="ml-2 px-2 py-0.5 rounded-full bg-[#5A7D5A]/10 text-[#5A7D5A] text-[10px]">3 New</span>
        </button>
      </div>

      {activeTab === 'technicians' ? (
        <>
          {/* Province summary */}
          {provinceStats.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {provinceStats.map((p) => (
                <button
                  key={p.province}
                  onClick={() => setSelectedProvince(selectedProvince === p.province ? '' : p.province)}
                  className={`p-3 text-left border transition-colors ${selectedProvince === p.province ? 'border-[#5A7D5A] bg-[#5A7D5A]/5' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{p.province}</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">{p.total}</p>
                </button>
              ))}
            </div>
          )}

          {/* Search and Filters */}
          <div className="bg-white border border-gray-200 shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search name, email, phone, reg./membership number..."
                    aria-label="Search technicians by name, email, phone, registration or membership number"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 focus:ring-2 focus:ring-[#5A7D5A] focus:border-transparent outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <select
                aria-label="Filter by province"
                className="rounded-lg w-full px-3 py-2.5 border border-gray-200 focus:ring-2 focus:ring-[#5A7D5A] focus:border-transparent outline-none transition-all"
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
              >
                <option value="">All Provinces</option>
                {ZIMBABWE_PROVINCES.map(province => (
                  <option key={province.id} value={province.name}>{province.name}</option>
                ))}
              </select>

              <select
                aria-label="Filter by status"
                className="rounded-lg w-full px-3 py-2.5 border border-gray-200 focus:ring-2 focus:ring-[#5A7D5A] focus:border-transparent outline-none transition-all"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </select>

              <select
                aria-label="Filter by membership status"
                className="rounded-lg w-full px-3 py-2.5 border border-gray-200 focus:ring-2 focus:ring-[#5A7D5A] focus:border-transparent outline-none transition-all"
                value={selectedMembershipStatus}
                onChange={(e) => setSelectedMembershipStatus(e.target.value)}
              >
                <option value="">All Memberships</option>
                <option value="active">Active member</option>
                <option value="expired">Expired member</option>
                <option value="suspended">Suspended member</option>
                <option value="revoked">Revoked member</option>
                <option value="none">No membership</option>
              </select>
            </div>
          </div>

          {/* Technician List */}
          <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-200">
              {filteredTechnicians.map((technician) => (
                <div key={technician.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{technician.name}</h3>
                        {getStatusBadge(technician.status)}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-semibold text-gray-500 uppercase tracking-tight">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">REG:</span>
                          <span className="text-gray-900">{technician.registrationNumber}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">FIELD:</span>
                          <span className="text-gray-900">{technician.specialization}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">EXP:</span>
                          <span className="text-gray-900">{technician.expiryDate}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">MEMBERSHIP:</span>
                          {membershipByTechnicianId.get(technician.id) ? (
                            <span className={
                              membershipByTechnicianId.get(technician.id)?.status === 'active'
                                ? 'text-emerald-700'
                                : 'text-gray-500'
                            }>
                              {membershipByTechnicianId.get(technician.id)?.status} ({membershipByTechnicianId.get(technician.id)?.membershipNumber})
                            </span>
                          ) : (
                            <span className="text-gray-400 normal-case">None</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/technician-registry/${technician.id}`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit Profile"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>

                      {canReview && membershipByTechnicianId.get(technician.id)?.status !== 'active' && (
                        <button
                          onClick={() => handleApprove(technician.id, technician.name)}
                          disabled={busyId === technician.id}
                          className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 transition-all font-bold text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Approve and create a HEVACRAZ membership"
                        >
                          {busyId === technician.id ? 'Approving…' : 'Approve'}
                        </button>
                      )}

                      {canReview && technician.status !== 'pending' && (
                        <button
                          onClick={() => technician.status === 'active' ? handleSuspend(technician.id) : handleReactivate(technician.id, technician.name)}
                          disabled={busyId === technician.id}
                          className={`p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${technician.status === 'active'
                              ? 'text-red-500 hover:bg-red-50'
                              : 'text-green-500 hover:bg-green-50'
                            }`}
                          title={technician.status === 'active' ? 'Suspend' : 'Reactivate'}
                        >
                          {technician.status === 'active' ? <XCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                        </button>
                      )}

                      {canReview && (
                        <button
                          onClick={() => handleDelete(technician.id)}
                          disabled={busyId === technician.id}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {filteredTechnicians.length === 0 && (
              <div className="p-12 text-center">
                <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No technicians found</h3>
                <p className="text-gray-500">Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 uppercase text-xs tracking-widest">Pending Certification Reviews</h2>
              <div className="text-xs font-bold text-blue-600">3 assessments awaiting verifier</div>
            </div>
            <div className="divide-y divide-gray-100">
              {pendingCerts.length === 0 ? (
                <div className="p-12 text-center">
                  <CheckCircle className="mx-auto h-10 w-10 text-green-400 mb-3" />
                  <p className="font-semibold text-gray-700">All certifications reviewed</p>
                  <p className="text-sm text-gray-400 mt-1">No pending exam submissions</p>
                </div>
              ) : pendingCerts.map((item) => (
                <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900">{item.tech}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">EXAM SUBMISSION</span>
                    </div>
                    <p className="text-sm font-medium text-gray-500">{item.cert}</p>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                      <span>Submitted: {item.date}</span>
                      <span className="text-green-600">Score: {item.score}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setExamModal(item)}
                      className="px-4 py-2 text-sm font-bold border border-gray-200 hover:bg-white transition-colors flex items-center gap-1.5"
                    >
                      <Eye className="h-4 w-4" />
                      View Exam
                    </button>
                    <button
                      onClick={() => approveCert(item.id, item.tech, item.cert)}
                      className="px-4 py-2 text-sm font-bold bg-gray-900 text-white hover:bg-blue-600 transition-colors"
                    >
                      Approve & Issue
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-6 flex items-start gap-4">
            <div className="bg-amber-100 p-2 ">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h4 className="font-bold text-amber-900">Compliance Deadline Approaching</h4>
              <p className="text-sm text-amber-700 mt-1">There are 12 technicians whose GWP certifications expire in the next 30 days. Auto-notifications have been queued for dispatch.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
