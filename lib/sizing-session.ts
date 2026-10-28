"use client";

import type { SizingInputs } from '@/types/index';

export type SizingCalculator = 'wizard' | 'superheat' | 'pt-chart' | 'leak-rate' | 'converter';

export interface SuperheatInputs {
  suctionPressure: number;
  suctionTemp: number;
  liquidTemp: number;
  liquidPressure: number;
}

export interface LeakInputs {
  leakRate: number;
  refrigerantCode: string;
}

export interface ConverterInputs {
  type: string;
  value: number;
  from: string;
  to: string;
}

/** Everything needed to put a technician back exactly where they stopped. */
export interface SizingSession {
  id: string;
  label: string;
  savedAt: string;
  technicianId?: string;
  technicianName?: string;
  step: number;
  calculator: SizingCalculator;
  inputs: SizingInputs;
  superheatInputs: SuperheatInputs;
  leakInputs: LeakInputs;
  converter: ConverterInputs;
  refrigerant: string;
  loadKw: number;
}

/** A session that was never named, kept so a reload or a lost signal does not cost the work. */
export interface SizingDraft {
  savedAt: string;
  step: number;
  calculator: SizingCalculator;
  inputs: SizingInputs;
  superheatInputs: SuperheatInputs;
  leakInputs: LeakInputs;
  converter: ConverterInputs;
  refrigerant: string;
  loadKw: number;
}

const MAX_SESSIONS = 20;
/** Cases saved before sessions were named, and before they were kept per technician. */
const LEGACY_KEY = 'hevacraz-sizing-cases';

const sessionsKey = (technicianId: string) => `hevacraz-sizing-sessions:${technicianId}`;
const draftKey = (technicianId: string) => `hevacraz-sizing-draft:${technicianId}`;

const read = <T,>(key: string): T | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : null;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
};

const write = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage full or blocked: the work stays in memory only */ }
};

const DEFAULT_SUPERHEAT: SuperheatInputs = { suctionPressure: 3.2, suctionTemp: 8, liquidTemp: 28, liquidPressure: 7.7 };
const DEFAULT_LEAK: LeakInputs = { leakRate: 12, refrigerantCode: 'R-32' };
const DEFAULT_CONVERTER: ConverterInputs = { type: 'temperature', value: 25, from: 'C', to: 'F' };

// Older saves only carried the wizard inputs, so the rest of the session falls back to defaults.
function upgradeLegacy(raw: { id?: string; savedAt?: string; inputs?: SizingInputs; calculatedLoadKw?: number }): SizingSession | null {
  if (!raw.inputs || typeof raw.inputs.roomWidth !== 'number') return null;
  return {
    id: raw.id ?? crypto.randomUUID(),
    label: 'Untitled sizing case',
    savedAt: raw.savedAt ?? new Date().toISOString(),
    step: raw.inputs.step || 1,
    calculator: 'wizard',
    inputs: raw.inputs,
    superheatInputs: DEFAULT_SUPERHEAT,
    leakInputs: DEFAULT_LEAK,
    converter: DEFAULT_CONVERTER,
    refrigerant: 'R-290',
    loadKw: raw.calculatedLoadKw ?? 0,
  };
}

export function readSizingSessions(technicianId: string): SizingSession[] {
  const stored = read<SizingSession[]>(sessionsKey(technicianId)) ?? [];
  const newestFirst = (a: SizingSession, b: SizingSession) => b.savedAt.localeCompare(a.savedAt);
  const valid = stored.filter(session => session?.inputs && session?.savedAt).sort(newestFirst);

  const legacy = read<Array<{ id?: string; savedAt?: string; inputs?: SizingInputs; calculatedLoadKw?: number }>>(LEGACY_KEY);
  if (legacy && legacy.length > 0) {
    const upgraded = legacy.map(upgradeLegacy).filter((session): session is SizingSession => session !== null);
    const merged = [...upgraded, ...valid].sort(newestFirst).slice(0, MAX_SESSIONS);
    write(sessionsKey(technicianId), merged);
    if (typeof window !== 'undefined') window.localStorage.removeItem(LEGACY_KEY);
    return merged;
  }

  return valid;
}

export function saveSizingSession(technicianId: string, session: SizingSession): SizingSession[] {
  const next = [session, ...readSizingSessions(technicianId).filter(item => item.id !== session.id)].slice(0, MAX_SESSIONS);
  write(sessionsKey(technicianId), next);
  clearSizingDraft(technicianId);
  return next;
}

export function deleteSizingSession(technicianId: string, id: string): SizingSession[] {
  const next = readSizingSessions(technicianId).filter(item => item.id !== id);
  write(sessionsKey(technicianId), next);
  return next;
}

export function readSizingDraft(technicianId: string): SizingDraft | null {
  const draft = read<SizingDraft>(draftKey(technicianId));
  return draft?.inputs ? draft : null;
}

export function writeSizingDraft(technicianId: string, draft: SizingDraft) {
  write(draftKey(technicianId), draft);
}

export function clearSizingDraft(technicianId: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(draftKey(technicianId));
}
