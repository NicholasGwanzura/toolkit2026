'use client';

import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, Camera, CheckCircle2, CheckSquare, Clock, ClipboardCheck, FileCheck, PackageCheck, Ruler, Save, Search, User, X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { createCocRequest, createInstallation, useCocRequests, useInstallations } from '@/lib/api';
import { CocPdfButton } from '@/components/CocPdfButton';
import { JobTypeLabels, type CocRequest, type Installation, type InstallationChecklistSnapshot, type JobType } from '@/types/index';
import { JOB_TYPE_OPTIONS } from './checklists';

const MAX_PHOTOS = 10;
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 8 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const inputClass = 'min-h-11 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#D97706] focus:ring-2 focus:ring-[#D97706]/20';

type StatusFilter = 'all' | Installation['status'] | 'coc_pending' | 'coc_ready';

const EMPTY_FORM = { clientName: '', location: '', jobDetails: '', floorSpace: '', jobType: 'COLD_ROOM' as JobType };

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wide text-stone-600">{label}</label>
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
  const [photos, setPhotos] = useState<string[]>([]);
  const [notice, setNotice] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const fileInput = useRef<HTMLInputElement>(null);

  const summary = useMemo(() => ({
    total: installations.length,
    pending: installations.filter(item => item.status === 'pending').length,
    cocPending: installations.filter(item => item.cocRequested && !item.cocApproved).length,
    cocReady: installations.filter(item => item.cocApproved).length,
  }), [installations]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return installations.filter(item => {
      const matchesSearch = !term || [item.clientName, item.jobDetails, item.floorSpace, item.technicianName, JobTypeLabels[item.jobType as JobType]].join(' ').toLowerCase().includes(term);
      const matchesStatus =
        filter === 'all' ||
        item.status === filter ||
        (filter === 'coc_pending' && item.cocRequested && !item.cocApproved) ||
        (filter === 'coc_ready' && item.cocApproved);
      return matchesSearch && matchesStatus;
    });
  }, [installations, search, filter]);

  const addPhotos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;
    if (photos.length + files.length > MAX_PHOTOS) return setNotice({ kind: 'error', text: `You can attach up to ${MAX_PHOTOS} photos.` });
    const existingBytes = photos.reduce((total, image) => total + Math.ceil(image.length * 0.75), 0);
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
      setPhotos(prev => [...prev, ...images]);
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
        images: photos,
        checklistSnapshot: checklist,
      });
      await mutate();
      setForm(EMPTY_FORM);
      setPhotos([]);
      onChecklistUsed();
      setNotice({ kind: 'ok', text: 'Installation saved. Request a COC from its card below once the checklist is complete.' });
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
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total" value={summary.total} icon={PackageCheck} tone="stone" />
        <Metric label="Pending review" value={summary.pending} icon={Clock} tone="amber" />
        <Metric label="COC pending" value={summary.cocPending} icon={FileCheck} tone="blue" />
        <Metric label="COC ready" value={summary.cocReady} icon={CheckCircle2} tone="emerald" />
      </div>

      <form onSubmit={save} className="space-y-4 border border-stone-200 bg-white p-4 sm:p-5" aria-label="New installation">
        <div>
          <h3 className="text-lg font-semibold text-stone-900">Record an installation</h3>
          <p className="text-sm text-stone-600">Save the installation first, then request the COC from its card. Administrators approve COCs.{user ? ` Recorded as ${user.name}.` : ''}</p>
        </div>

        <div className={`flex flex-wrap items-center justify-between gap-2 border px-3 py-2 text-sm ${checklist ? (checklistComplete ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800') : 'border-stone-200 bg-stone-50 text-stone-700'}`}>
          <span className="inline-flex items-center gap-2">
            {checklist ? <CheckSquare className="h-4 w-4" aria-hidden="true" /> : <AlertTriangle className="h-4 w-4" aria-hidden="true" />}
            {checklist
              ? `Checklist attached: ${checklist.completedItems} of ${checklist.totalItems} items${checklistComplete ? '' : '. A COC needs every item ticked.'}`
              : 'No checklist attached yet. Complete one first if you will need a COC.'}
          </span>
          <button type="button" onClick={onGoToChecklist} className="font-semibold underline">{checklist ? 'Review checklist' : 'Open checklist'}</button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
              <Ruler className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
              <input id="inst-floor" value={form.floorSpace} onChange={e => setForm({ ...form, floorSpace: e.target.value })} className={`${inputClass} pl-10`} placeholder="24" inputMode="decimal" />
            </div>
          </Field>
        </div>

        <Field label="Job details" htmlFor="inst-details">
          <textarea id="inst-details" required rows={4} value={form.jobDetails} onChange={e => setForm({ ...form, jobDetails: e.target.value })} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#D97706] focus:ring-2 focus:ring-[#D97706]/20" placeholder="Equipment, commissioning notes, pressure and vacuum checks, handover status." />
        </Field>

        <div>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addPhotos} className="hidden" aria-label="Add evidence photos" />
          <button type="button" onClick={() => fileInput.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-[#D97706] hover:text-[#b45309]">
            <Camera className="h-4 w-4" aria-hidden="true" />
            {photos.length > 0 ? `${photos.length} of ${MAX_PHOTOS} photos. Add more` : 'Add evidence photos'}
          </button>
          {photos.length > 0 && (
            <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-6">
              {photos.map((image, index) => (
                <li key={index} className="relative overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt={`Evidence photo ${index + 1}`} className="h-20 w-full object-cover" />
                  <button type="button" onClick={() => setPhotos(prev => prev.filter((_, i) => i !== index))} aria-label={`Remove photo ${index + 1}`} className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white shadow-sm hover:bg-red-700">
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {notice ? (
            <p role={notice.kind === 'error' ? 'alert' : 'status'} className={`text-sm font-medium ${notice.kind === 'error' ? 'text-rose-700' : 'text-emerald-700'}`}>{notice.text}</p>
          ) : <span />}
          <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#D97706] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#b45309] disabled:opacity-60">
            <Save className="h-4 w-4" aria-hidden="true" />
            {saving ? 'Saving…' : 'Save installation'}
          </button>
        </div>
      </form>

      <section className="border border-stone-200 bg-white" aria-label="Installations">
        <div className="grid gap-3 border-b border-stone-200 bg-stone-50 p-4 md:grid-cols-[1fr_220px]">
          <label className="relative block">
            <span className="sr-only">Search installations</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search client, details or job type" className={`${inputClass} pl-10`} />
          </label>
          <select value={filter} onChange={e => setFilter(e.target.value as StatusFilter)} aria-label="Filter by status" className={inputClass}>
            <option value="all">All statuses</option>
            <option value="pending">Pending review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="coc_pending">COC pending</option>
            <option value="coc_ready">COC ready</option>
          </select>
        </div>
        <div className="divide-y divide-stone-100">
          {visible.length > 0 ? visible.map(installation => (
            <InstallationCard
              key={installation.id}
              installation={installation}
              onRequestCoc={requestCoc}
              cocRequest={cocRequests.find(request => request.id === installation.cocRequestId || request.installationId === installation.id)}
            />
          )) : (
            <div className="px-6 py-12 text-center">
              <ClipboardCheck className="mx-auto h-9 w-9 text-stone-300" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-stone-700">{installations.length === 0 ? 'No installations recorded yet.' : 'No installations match this view.'}</p>
              <p className="mt-1 text-sm text-stone-500">{installations.length === 0 ? 'Record your first one above.' : 'Change the search or the filter.'}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof PackageCheck; tone: 'stone' | 'amber' | 'blue' | 'emerald' }) {
  const tones = { stone: 'bg-stone-100 text-stone-700', amber: 'bg-amber-100 text-amber-700', blue: 'bg-blue-100 text-blue-700', emerald: 'bg-emerald-100 text-emerald-700' };
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
        <span className={`rounded-lg p-2 ${tones[tone]}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function InstallationCard({ installation, onRequestCoc, cocRequest }: { installation: Installation; onRequestCoc: (installation: Installation) => void; cocRequest?: CocRequest }) {
  const [confirmed, setConfirmed] = useState(false);
  const statusClass = installation.status === 'approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : installation.status === 'rejected' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700';
  const coc = installation.cocApproved
    ? { label: 'COC ready', className: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: CheckCircle2 }
    : installation.cocRequested
      ? { label: 'COC pending', className: 'border-blue-200 bg-blue-50 text-blue-700', icon: Clock }
      : { label: 'COC not requested', className: 'border-stone-200 bg-stone-50 text-stone-600', icon: FileCheck };
  const CocIcon = coc.icon;
  const snapshot = installation.checklistSnapshot;
  const checklistComplete = snapshot ? snapshot.completedItems === snapshot.totalItems : false;

  return (
    <article className="px-4 py-4 transition hover:bg-stone-50 sm:px-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClass}`}>{installation.status}</span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${coc.className}`}><CocIcon className="h-3.5 w-3.5" aria-hidden="true" />{coc.label}</span>
            <span className="text-xs font-medium text-stone-500">{new Date(installation.installationDate).toLocaleDateString('en-ZW')}</span>
          </div>
          <h4 className="mt-3 truncate text-base font-semibold text-stone-950">{installation.clientName}</h4>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-stone-600">{installation.jobDetails}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-stone-500">
            <span className="inline-flex items-center gap-1.5"><PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />{JobTypeLabels[installation.jobType as JobType]}</span>
            {installation.floorSpace && <span className="inline-flex items-center gap-1.5"><Ruler className="h-3.5 w-3.5" aria-hidden="true" />{installation.floorSpace} m²</span>}
            <span className="inline-flex items-center gap-1.5"><User className="h-3.5 w-3.5" aria-hidden="true" />{installation.technicianName}</span>
            {installation.images.length > 0 && <span className="inline-flex items-center gap-1.5"><Camera className="h-3.5 w-3.5" aria-hidden="true" />{installation.images.length} photo{installation.images.length === 1 ? '' : 's'}</span>}
            {snapshot && <span className={`inline-flex items-center gap-1.5 ${checklistComplete ? 'text-emerald-700' : 'text-amber-700'}`}><CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />Checklist {snapshot.completedItems}/{snapshot.totalItems}</span>}
          </div>
          {installation.images.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {installation.images.slice(0, 5).map((image, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={`${installation.id}-${index}`} src={image} alt={`Evidence photo ${index + 1} for ${installation.clientName}`} className="h-14 w-20 shrink-0 rounded-lg border border-stone-200 object-cover" />
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
          {!installation.cocRequested && (
            <div className="max-w-xs space-y-2">
              <label className="flex items-start gap-2 text-xs leading-5 text-stone-600">
                <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={!checklistComplete} className="mt-1" />
                I confirm the checklist and photos accurately show the work done.
              </label>
              <button
                type="button"
                onClick={() => onRequestCoc(installation)}
                disabled={!checklistComplete || !confirmed || !installation.location?.trim()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileCheck className="h-4 w-4" aria-hidden="true" />
                {checklistComplete ? 'Request COC' : 'Checklist incomplete'}
              </button>
              {!checklistComplete && <p className="text-xs text-stone-500">Every checklist item must be ticked and saved before a COC can be requested.</p>}
            </div>
          )}
          {installation.cocRequested && !installation.cocApproved && (
            <span className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700"><Clock className="h-4 w-4" aria-hidden="true" />Awaiting administrator</span>
          )}
          {cocRequest?.status === 'approved' && (
            <div className="inline-flex min-h-11 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-2"><CocPdfButton request={cocRequest} /></div>
          )}
        </div>
      </div>
    </article>
  );
}
