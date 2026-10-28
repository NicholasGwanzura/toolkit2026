'use client';

import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  CheckSquare,
  Clock,
  ClipboardCheck,
  FileCheck,
  Loader2,
  PackageCheck,
  PlusCircle,
  Ruler,
  Save,
  Search,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { createCocRequest, createInstallation, useCocRequests, useInstallations } from '@/lib/api';
import { CocPdfButton } from '@/components/CocPdfButton';
import { Modal } from '@/components/ui/Modal';
import { JobTypeLabels, type CocRequest, type Installation, type InstallationChecklistSnapshot, type JobType } from '@/types/index';
import { JOB_TYPE_OPTIONS } from './checklists';

const MAX_PHOTOS = 10;
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 8 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const inputClass = 'min-h-11 w-full rounded-lg border border-[#E7E5E4] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#D97706] focus:ring-2 focus:ring-[#D97706]/20';

type StatusFilter = 'all' | Installation['status'] | 'coc_pending' | 'coc_ready';
type SortOrder = 'newest' | 'oldest' | 'client';

const EMPTY_FORM = { clientName: '', location: '', jobDetails: '', floorSpace: '', jobType: 'COLD_ROOM' as JobType };

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wide text-[#78716C]">{label}</label>
      {children}
    </div>
  );
}

interface InstallationsTabProps {
  checklist: InstallationChecklistSnapshot | null;
  onChecklistUsed: () => void;
  onGoToChecklist: () => void;
}

export default function InstallationsTab({ checklist, onChecklistUsed, onGoToChecklist }: InstallationsTabProps) {
  const { user } = useAuth();
  const { data: installations = [], mutate } = useInstallations();
  const { data: cocRequests = [] } = useCocRequests();
  const [form, setForm] = useState(EMPTY_FORM);
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [notice, setNotice] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortOrder>('newest');
  const fileInput = useRef<HTMLInputElement>(null);

  const summary = useMemo(() => ({
    total: installations.length,
    pending: installations.filter(item => item.status === 'pending').length,
    cocPending: installations.filter(item => item.cocRequested && !item.cocApproved).length,
    cocReady: installations.filter(item => item.cocApproved).length,
  }), [installations]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = installations.filter(item => {
      const matchesSearch = !term || [item.clientName, item.jobDetails, item.floorSpace, item.technicianName, JobTypeLabels[item.jobType as JobType]].join(' ').toLowerCase().includes(term);
      const matchesStatus =
        filter === 'all' ||
        item.status === filter ||
        (filter === 'coc_pending' && item.cocRequested && !item.cocApproved) ||
        (filter === 'coc_ready' && item.cocApproved);
      return matchesSearch && matchesStatus;
    });
    return [...filtered].sort((a, b) => {
      if (sort === 'client') return a.clientName.localeCompare(b.clientName);
      const delta = new Date(a.installationDate).getTime() - new Date(b.installationDate).getTime();
      return sort === 'oldest' ? delta : -delta;
    });
  }, [installations, search, filter, sort]);

  const addPhotos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;
    if (formPhotos.length + files.length > MAX_PHOTOS) return setNotice({ kind: 'error', text: `You can attach up to ${MAX_PHOTOS} photos.` });
    const existingBytes = formPhotos.reduce((total, image) => total + Math.ceil(image.length * 0.75), 0);
    if (files.some(file => !PHOTO_TYPES.includes(file.type) || file.size > MAX_PHOTO_BYTES) || existingBytes + files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_BYTES) {
      return setNotice({ kind: 'error', text: 'Photos must be JPEG, PNG or WebP, up to 2 MB each and 8 MB in total.' });
    }
    try {
      const images = await Promise.all(files.map(file => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('unreadable')));
        reader.onerror = () => reject(new Error('unreadable'));
        reader.readAsDataURL(file);
      })));
      setFormPhotos(prev => [...prev, ...images]);
      setNotice(null);
    } catch {
      setNotice({ kind: 'error', text: 'A photo could not be read. Please try again.' });
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice(null);
    if (!form.clientName.trim() || !form.location.trim() || !form.jobDetails.trim()) {
      return setNotice({ kind: 'error', text: 'Client name, site location and job details are required.' });
    }
    setSaving(true);
    try {
      await createInstallation({
        clientName: form.clientName.trim(),
        location: form.location.trim(),
        jobDetails: form.jobDetails.trim(),
        floorSpace: form.floorSpace.trim(),
        jobType: form.jobType,
        images: formPhotos,
        checklistSnapshot: checklist,
      });
      await mutate();
      setForm(EMPTY_FORM);
      setFormPhotos([]);
      onChecklistUsed();
      setFormOpen(false);
      setNotice({ kind: 'ok', text: 'Installation saved. Request a COC from its card once the checklist is complete.' });
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to save the installation.' });
    } finally {
      setSaving(false);
    }
  };

  const requestCoc = async (installation: Installation) => {
    setNotice(null);
    const snapshot = installation.checklistSnapshot;
    if (!snapshot || snapshot.completedItems !== snapshot.totalItems || snapshot.items.some(item => !item.checked)) {
      return setNotice({ kind: 'error', text: 'Complete every checklist item and save the checklist before requesting a COC.' });
    }
    try {
      await createCocRequest({
        installationId: installation.id,
        clientName: installation.clientName,
        location: installation.location || '',
        equipmentType: JobTypeLabels[installation.jobType as JobType] ?? installation.jobType,
        installationDate: installation.installationDate.slice(0, 10),
        details: installation.jobDetails,
        complianceCheck: true,
      });
      await mutate();
      setNotice({ kind: 'ok', text: 'COC request sent for admin review, with the checklist and photos attached.' });
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Failed to request the COC.' });
    }
  };

  const checklistComplete = checklist !== null && checklist.completedItems === checklist.totalItems;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#1C1917]">Installation records</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#78716C]">
            File the site work, attach evidence photos and request a Certificate of Conformity once the checklist is complete.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setNotice(null); setFormOpen(true); }}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#D97706] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#D97706]/30 transition hover:bg-[#b45309] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97706] focus-visible:ring-offset-2"
        >
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          Record installation
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="Total" value={summary.total} icon={PackageCheck} hint="All installation records" />
        <Metric label="Pending review" value={summary.pending} icon={Clock} hint="Waiting for administrator" tone="amber" />
        <Metric label="COC pending" value={summary.cocPending} icon={FileCheck} hint="With the review team" tone="blue" />
        <Metric label="COC ready" value={summary.cocReady} icon={CheckCircle2} hint="Certificates issued" tone="emerald" />
      </div>

      {!formOpen && notice && (
        <p
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${notice.kind === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}
        >
          {notice.text}
        </p>
      )}

      <section className="overflow-hidden rounded-xl border border-[#E7E5E4] bg-white" aria-label="Installations">
        <div className="grid gap-2 border-b border-[#E7E5E4] bg-[#FAFAF9] p-3 md:grid-cols-[1fr_180px_180px]">
          <label className="relative block">
            <span className="sr-only">Search installations</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A8A29E]" aria-hidden="true" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search client, details or job type" className={`${inputClass} pl-9`} />
          </label>
          <label className="block">
            <span className="sr-only">Filter by status</span>
            <select value={filter} onChange={e => setFilter(e.target.value as StatusFilter)} className={inputClass}>
              <option value="all">All statuses</option>
              <option value="pending">Pending review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="coc_pending">COC pending</option>
              <option value="coc_ready">COC ready</option>
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Sort installations</span>
            <select value={sort} onChange={e => setSort(e.target.value as SortOrder)} className={inputClass}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="client">Client A–Z</option>
            </select>
          </label>
        </div>
        <div className="divide-y divide-[#F1F0EE]">
          {visible.length > 0 ? visible.map(installation => (
            <InstallationCard
              key={installation.id}
              installation={installation}
              onRequestCoc={requestCoc}
              cocRequest={cocRequests.find(request => request.id === installation.cocRequestId || request.installationId === installation.id)}
            />
          )) : (
            <div className="px-6 py-12 text-center">
              <ClipboardCheck className="mx-auto h-9 w-9 text-[#D6D3D1]" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-[#57534E]">{installations.length === 0 ? 'No installations recorded yet.' : 'No installations match this view.'}</p>
              <p className="mt-1 text-sm text-[#A8A29E]">{installations.length === 0 ? 'Record your first one to start the COC trail.' : 'Change the search, filter or sort order.'}</p>
            </div>
          )}
        </div>
      </section>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Record an installation"
        description={user ? `Saving as ${user.name}. Attach the checklist and evidence photos before requesting a COC.` : 'Attach the checklist and evidence photos before requesting a COC.'}
        icon={<ClipboardCheck className="h-5 w-5" />}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#A8A29E]">A COC can be requested from the card once every checklist item is ticked.</p>
            <div className="flex gap-2 sm:justify-end">
              <button type="button" onClick={() => setFormOpen(false)} className="min-h-11 rounded-xl border border-[#E7E5E4] bg-white px-4 py-2 text-sm font-semibold text-[#57534E] transition hover:bg-[#FAFAF9]">
                Cancel
              </button>
              <button type="submit" form="new-installation" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#D97706] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#b45309] disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                {saving ? 'Saving…' : 'Save installation'}
              </button>
            </div>
          </div>
        }
      >
        <form id="new-installation" onSubmit={save} className="space-y-4" aria-label="New installation">
          <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm ${checklist ? (checklistComplete ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800') : 'border-[#E7E5E4] bg-[#FAFAF9] text-[#57534E]'}`}>
            <span className="inline-flex items-center gap-2">
              {checklist ? <CheckSquare className="h-4 w-4" aria-hidden="true" /> : <AlertTriangle className="h-4 w-4" aria-hidden="true" />}
              {checklist
                ? `Checklist attached: ${checklist.completedItems} of ${checklist.totalItems} items${checklistComplete ? '' : '. A COC needs every item ticked.'}`
                : 'No checklist attached yet. Complete one first if you will need a COC.'}
            </span>
            <button type="button" onClick={onGoToChecklist} className="font-semibold text-[#b45309] underline underline-offset-2">{checklist ? 'Review checklist' : 'Open checklist'}</button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Client name" htmlFor="inst-client">
              <input id="inst-client" required value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} className={inputClass} placeholder="Shoprite Bulawayo" />
            </Field>
            <Field label="Site location" htmlFor="inst-location">
              <input id="inst-location" required value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className={inputClass} placeholder="Town or site address" />
            </Field>
            <Field label="Job type" htmlFor="inst-type">
              <select id="inst-type" value={form.jobType} onChange={e => setForm({ ...form, jobType: e.target.value as JobType })} className={inputClass}>
                {JOB_TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Floor space (m²)" htmlFor="inst-floor">
              <div className="relative">
                <Ruler className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A8A29E]" aria-hidden="true" />
                <input id="inst-floor" value={form.floorSpace} onChange={e => setForm({ ...form, floorSpace: e.target.value })} className={`${inputClass} pl-10`} placeholder="24" inputMode="decimal" />
              </div>
            </Field>
          </div>

          <Field label="Job details" htmlFor="inst-details">
            <textarea id="inst-details" required rows={4} value={form.jobDetails} onChange={e => setForm({ ...form, jobDetails: e.target.value })} className="w-full rounded-lg border border-[#E7E5E4] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#D97706] focus:ring-2 focus:ring-[#D97706]/20" placeholder="Equipment, commissioning notes, pressure and vacuum checks, handover status." />
          </Field>

          <div>
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addPhotos} className="hidden" aria-label="Add evidence photos" />
            <button type="button" onClick={() => fileInput.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-[#D6D3D1] bg-[#FAFAF9] px-4 py-2 text-sm font-semibold text-[#57534E] transition hover:border-[#D97706] hover:text-[#b45309]">
              <Camera className="h-4 w-4" aria-hidden="true" />
              {formPhotos.length > 0 ? `${formPhotos.length} of ${MAX_PHOTOS} photos · add more` : 'Add evidence photos'}
            </button>
            {formPhotos.length > 0 && (
              <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
                {formPhotos.map((image, index) => (
                  <li key={index} className="relative overflow-hidden rounded-lg border border-[#E7E5E4] bg-[#F5F5F4]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image} alt={`Evidence photo ${index + 1}`} className="h-20 w-full object-cover" />
                    <button type="button" onClick={() => setFormPhotos(prev => prev.filter((_, i) => i !== index))} aria-label={`Remove photo ${index + 1}`} className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#1C1917]/80 text-white shadow-sm hover:bg-rose-600">
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {notice && (
            <p role={notice.kind === 'error' ? 'alert' : 'status'} className={`text-sm font-medium ${notice.kind === 'error' ? 'text-rose-700' : 'text-emerald-700'}`}>{notice.text}</p>
          )}
        </form>
      </Modal>
    </div>
  );
}

function Metric({ label, value, icon: Icon, hint, tone = 'stone' }: { label: string; value: number; icon: typeof PackageCheck; hint: string; tone?: 'stone' | 'amber' | 'blue' | 'emerald' }) {
  const tones = {
    stone: 'bg-[#F5F5F4] text-[#57534E]',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
    emerald: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <div className="rounded-xl border border-[#E7E5E4] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#A8A29E]">{label}</p>
        <span className={`rounded-lg p-2 ${tones[tone]}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
      </div>
      <p className="mt-2 text-xl font-bold text-[#1C1917]">{value}</p>
      <p className="mt-0.5 text-[11px] text-[#A8A29E]">{hint}</p>
    </div>
  );
}

function InstallationCard({ installation, onRequestCoc, cocRequest }: { installation: Installation; onRequestCoc: (installation: Installation) => void; cocRequest?: CocRequest }) {
  const [confirmed, setConfirmed] = useState(false);
  const [cocOpen, setCocOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [photos, setPhotos] = useState<string[] | null>(null);
  const [photosState, setPhotosState] = useState<'idle' | 'loading' | 'error'>('idle');
  const photoCount = installation.imageCount ?? installation.images.length;

  // Photos are loaded on request, one installation at a time, so the list itself stays small.
  const showPhotos = async () => {
    setGalleryOpen(true);
    if (photos) return;
    setPhotosState('loading');
    try {
      const res = await fetch(`/api/installations/${installation.id}/images`, { credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      setPhotos(((await res.json()) as { images: string[] }).images);
      setPhotosState('idle');
    } catch {
      setPhotosState('error');
    }
  };

  const statusClass = installation.status === 'approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : installation.status === 'rejected' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700';
  const coc = installation.cocApproved
    ? { label: 'COC ready', className: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: CheckCircle2 }
    : installation.cocRequested
      ? { label: 'COC pending', className: 'border-blue-200 bg-blue-50 text-blue-700', icon: Clock }
      : { label: 'COC not requested', className: 'border-[#E7E5E4] bg-[#FAFAF9] text-[#57534E]', icon: FileCheck };
  const CocIcon = coc.icon;
  const snapshot = installation.checklistSnapshot;
  const checklistComplete = snapshot ? snapshot.completedItems === snapshot.totalItems : false;

  return (
    <article className="px-4 py-4 transition hover:bg-[#FAFAF9] sm:px-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClass}`}>{installation.status}</span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${coc.className}`}><CocIcon className="h-3.5 w-3.5" aria-hidden="true" />{coc.label}</span>
            <span className="text-xs font-medium text-[#A8A29E]">{new Date(installation.installationDate).toLocaleDateString('en-ZW')}</span>
          </div>
          <h4 className="mt-3 truncate text-base font-semibold text-[#1C1917]">{installation.clientName}</h4>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#57534E]">{installation.jobDetails}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#78716C]">
            <span className="inline-flex items-center gap-1.5"><PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />{JobTypeLabels[installation.jobType as JobType]}</span>
            {installation.floorSpace && <span className="inline-flex items-center gap-1.5"><Ruler className="h-3.5 w-3.5" aria-hidden="true" />{installation.floorSpace} m²</span>}
            <span className="inline-flex items-center gap-1.5"><User className="h-3.5 w-3.5" aria-hidden="true" />{installation.technicianName}</span>
            {photoCount > 0 && (
              <button type="button" onClick={() => void showPhotos()} className="inline-flex items-center gap-1.5 font-semibold text-[#b45309] underline underline-offset-2 hover:text-[#92400e]">
                <Camera className="h-3.5 w-3.5" aria-hidden="true" />{photoCount} photo{photoCount === 1 ? '' : 's'}
              </button>
            )}
            {snapshot && <span className={`inline-flex items-center gap-1.5 ${checklistComplete ? 'text-emerald-700' : 'text-amber-700'}`}><CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />Checklist {snapshot.completedItems}/{snapshot.totalItems}</span>}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
          {!installation.cocRequested && (
            <button
              type="button"
              onClick={() => setCocOpen(true)}
              disabled={!checklistComplete || !installation.location?.trim()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileCheck className="h-4 w-4" aria-hidden="true" />
              {checklistComplete ? 'Request COC' : 'Checklist incomplete'}
            </button>
          )}
          {installation.cocRequested && !installation.cocApproved && (
            <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700"><Clock className="h-4 w-4" aria-hidden="true" />Awaiting administrator</span>
          )}
          {cocRequest?.status === 'approved' && (
            <div className="inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-2"><CocPdfButton request={cocRequest} /></div>
          )}
        </div>
      </div>

      <Modal
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        title={`Evidence photos · ${installation.clientName}`}
        description={`${photoCount} photo${photoCount === 1 ? '' : 's'} attached to this installation.`}
        icon={<Camera className="h-5 w-5" />}
        size="xl"
      >
        {photosState === 'loading' && (
          <p className="flex items-center gap-2 text-sm text-[#78716C]"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading photos…</p>
        )}
        {photosState === 'error' && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <p className="font-semibold">Could not load the photos.</p>
            <p className="mt-1">Check your connection and try again.</p>
          </div>
        )}
        {photos && photos.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {photos.map((image, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={`${installation.id}-${index}`} src={image} alt={`Evidence photo ${index + 1} for ${installation.clientName}`} className="w-full rounded-xl border border-[#E7E5E4] object-cover" />
            ))}
          </div>
        )}
      </Modal>

      <Modal
        open={cocOpen}
        onClose={() => setCocOpen(false)}
        title="Request a Certificate of Conformity"
        description={`${installation.clientName} · ${JobTypeLabels[installation.jobType as JobType]}`}
        icon={<FileCheck className="h-5 w-5" />}
        size="md"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setCocOpen(false)} className="min-h-11 rounded-xl border border-[#E7E5E4] bg-white px-4 py-2 text-sm font-semibold text-[#57534E] transition hover:bg-[#FAFAF9]">
              Cancel
            </button>
            <button
              type="button"
              disabled={!confirmed}
              onClick={() => { setCocOpen(false); onRequestCoc(installation); }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#D97706] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#b45309] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileCheck className="h-4 w-4" aria-hidden="true" />
              Send for review
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <dl className="grid gap-2 rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[#78716C]">Checklist</dt>
              <dd className="font-semibold text-emerald-700">{snapshot?.completedItems ?? 0} of {snapshot?.totalItems ?? 0} items ticked</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[#78716C]">Evidence photos</dt>
              <dd className="font-semibold text-[#1C1917]">{photoCount}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[#78716C]">Site</dt>
              <dd className="truncate font-semibold text-[#1C1917]">{installation.location}</dd>
            </div>
          </dl>
          <label className="flex items-start gap-2 text-sm leading-6 text-[#57534E]">
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1 h-4 w-4 rounded border-[#D6D3D1] text-[#D97706] focus:ring-[#D97706]" />
            I confirm the checklist and photos accurately show the work done, and this request goes to an administrator for review.
          </label>
        </div>
      </Modal>
    </article>
  );
}
