// Adding equipment to the register. Pure and shared by the form and the server.
import type { EquipmentStatus, PlannerServiceRecord, RefrigerantSafetyClass } from '@/types/index';

export const SAFETY_CLASSES: RefrigerantSafetyClass[] = ['A1', 'A2L', 'A2', 'A3', 'B1', 'B2L', 'B2', 'B3'];
export const DUE_SOON_DAYS = 30;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const dayNumber = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;

/** Status always comes from the service date, so the register cannot say something the dates do not. */
export function equipmentStatus(nextServiceDue: string, today: string): EquipmentStatus {
  const days = dayNumber(nextServiceDue) - dayNumber(today);
  if (days < 0) return 'overdue';
  return days <= DUE_SOON_DAYS ? 'due-soon' : 'normal';
}

export interface NewEquipment {
  equipmentId: string;
  clientName: string;
  province: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  refrigerantId?: number;
  refrigerantType: string;
  ashraeSafetyClass: RefrigerantSafetyClass;
  lastServiceDate: string;
  nextServiceDue: string;
}

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
export const isIsoDate = (value: string) => ISO_DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

/** Cleans what the form sent. Returns the record, or the first problem in plain words. */
export function validateNewEquipment(value: unknown): { ok: true; equipment: NewEquipment } | { ok: false; error: string } {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const equipmentId = text(raw.equipmentId, 80);
  const clientName = text(raw.clientName, 200);
  const province = text(raw.province, 80);
  const refrigerantType = text(raw.refrigerantType, 120);
  const lastServiceDate = text(raw.lastServiceDate, 10);
  const nextServiceDue = text(raw.nextServiceDue, 10);
  if (!equipmentId) return { ok: false, error: 'Enter an equipment ID.' };
  if (!clientName) return { ok: false, error: 'Enter the client name.' };
  if (!province) return { ok: false, error: 'Choose the province.' };
  if (!refrigerantType) return { ok: false, error: 'Choose the refrigerant.' };
  if (!SAFETY_CLASSES.includes(raw.ashraeSafetyClass as RefrigerantSafetyClass)) return { ok: false, error: 'Choose the refrigerant safety class.' };
  if (!isIsoDate(lastServiceDate)) return { ok: false, error: 'Enter the last service date.' };
  if (!isIsoDate(nextServiceDue)) return { ok: false, error: 'Enter the next service date.' };
  if (nextServiceDue < lastServiceDate) return { ok: false, error: 'The next service date cannot be before the last one.' };
  return {
    ok: true,
    equipment: {
      equipmentId,
      clientName,
      province,
      refrigerantType,
      lastServiceDate,
      nextServiceDue,
      ashraeSafetyClass: raw.ashraeSafetyClass as RefrigerantSafetyClass,
      manufacturer: text(raw.manufacturer, 120) || undefined,
      model: text(raw.model, 120) || undefined,
      serialNumber: text(raw.serialNumber, 120) || undefined,
      refrigerantId: Number.isInteger(raw.refrigerantId) ? (raw.refrigerantId as number) : undefined,
    },
  };
}

/** Used when a record's own dates give no usable interval. */
export const DEFAULT_SERVICE_INTERVAL_DAYS = 180;

/** The next service after one done today keeps the interval the record already had. */
export function nextServiceAfter(lastServiceDate: string, nextServiceDue: string, serviced: string): string {
  const interval = isIsoDate(lastServiceDate) && isIsoDate(nextServiceDue) ? dayNumber(nextServiceDue) - dayNumber(lastServiceDate) : 0;
  const days = interval > 0 ? interval : DEFAULT_SERVICE_INTERVAL_DAYS;
  return new Date((dayNumber(serviced) + days) * 86_400_000).toISOString().slice(0, 10);
}

/** Newest first, one entry per job, so re-completing a job after follow-up does not add a second. */
export function addServiceRecord(history: PlannerServiceRecord[] | null | undefined, entry: PlannerServiceRecord): PlannerServiceRecord[] {
  return [entry, ...(history ?? []).filter((item) => item.id !== entry.id)];
}
