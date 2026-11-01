'use client';

import { useState, type FormEvent } from 'react';
import { Dialog } from '@/components/course-management/Dialog';
import { RefrigerantAutocomplete, refrigerantLabel } from '@/components/RefrigerantAutocomplete';
import { ZIMBABWE_PROVINCES } from '@/constants/registry';
import { createEquipmentRecord, updateEquipmentRecord } from '@/lib/api';
import { SAFETY_CLASSES } from '@/lib/equipment-record';
import type { EquipmentRecord, Refrigerant } from '@/types/index';

const field = 'mt-1 min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-normal text-gray-900 outline-none focus:border-[#B45309] focus:ring-2 focus:ring-[#B45309]/20';
const labelClass = 'block text-sm font-semibold text-gray-700';

/** Adds equipment to the register, or edits it when given a record. */
export function AddEquipmentDialog({ record, onClose, onSaved }: { record?: EquipmentRecord; onClose: () => void; onSaved: (equipmentId: string) => void }) {
  const [form, setForm] = useState({
    equipmentId: record?.equipmentId ?? '',
    clientName: record?.clientName ?? '',
    province: record?.province ?? '',
    manufacturer: record?.manufacturer ?? '',
    model: record?.model ?? '',
    serialNumber: record?.serialNumber ?? '',
    ashraeSafetyClass: record?.ashraeSafetyClass ?? '',
    lastServiceDate: record?.lastServiceDate ?? '',
    nextServiceDue: record?.nextServiceDue ?? '',
  });
  const [refrigerant, setRefrigerant] = useState<Refrigerant | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      // Editing keeps the current gas unless a new one was chosen.
      const body = {
        ...form,
        refrigerantId: refrigerant ? refrigerant.id : record?.refrigerantId,
        refrigerantType: refrigerant ? refrigerantLabel(refrigerant) : record?.refrigerantType ?? '',
      };
      const saved = record ? await updateEquipmentRecord(record.id, body) : await createEquipmentRecord(body);
      onSaved(saved.equipmentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the equipment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog isOpen onOpenChange={(open) => { if (!open && !busy) onClose(); }} size="lg" title={record ? `Edit ${record.equipmentId}` : 'Add equipment'} description="Service alerts come from the dates you enter.">
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>Equipment ID (required)<input required value={form.equipmentId} onChange={set('equipmentId')} placeholder="e.g. CR-014" className={field} /></label>
          <label className={labelClass}>Client (required)<input required value={form.clientName} onChange={set('clientName')} className={field} /></label>
          <label className={labelClass}>Province (required)
            <select required value={form.province} onChange={set('province')} className={field}>
              <option value="">Choose a province</option>
              {ZIMBABWE_PROVINCES.map((province) => <option key={province.id} value={province.name}>{province.name}</option>)}
            </select>
          </label>
          <label className={labelClass}>Refrigerant safety class (required)
            <select required value={form.ashraeSafetyClass} onChange={set('ashraeSafetyClass')} className={field}>
              <option value="">Choose a class</option>
              {SAFETY_CLASSES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <div className="sm:col-span-2">
            <p className={`${labelClass} mb-1`}>Refrigerant (required)</p>
            <RefrigerantAutocomplete value={refrigerant} onSelect={setRefrigerant} placeholder={record ? `Current: ${record.refrigerantType}. Search to change` : 'Search gas, e.g. R290, R-32'} />
          </div>
          <label className={labelClass}>Last service (required)<input required type="date" value={form.lastServiceDate} onChange={set('lastServiceDate')} className={field} /></label>
          <label className={labelClass}>Next service due (required)<input required type="date" value={form.nextServiceDue} onChange={set('nextServiceDue')} className={field} /></label>
          <label className={labelClass}>Manufacturer<input value={form.manufacturer} onChange={set('manufacturer')} className={field} /></label>
          <label className={labelClass}>Model<input value={form.model} onChange={set('model')} className={field} /></label>
          <label className={labelClass}>Serial number<input value={form.serialNumber} onChange={set('serialNumber')} className={field} /></label>
        </div>
        {error && <p role="alert" className="text-sm font-medium text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
          <button type="button" onClick={onClose} disabled={busy} className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={busy} className="min-h-11 rounded-lg bg-[#B45309] px-4 text-sm font-semibold text-white hover:bg-[#92400E] disabled:opacity-60">{busy ? 'Saving…' : record ? 'Save changes' : 'Add equipment'}</button>
        </div>
      </form>
    </Dialog>
  );
}
