import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { downloadGasLogPdf } from './gas-log-pdf';
import { downloadChecklistPdf } from './checklist-pdf';
import type { InstallationChecklistSnapshot, RefrigerantLog } from '@/types/index';

const log: RefrigerantLog = {
  id: 'a1b2c3d4-e5f6-4a70-8b10-c2d3e4f50617',
  technicianId: 'tech-0042',
  technicianName: 'T. Moyo',
  clientName: 'Shoprite Bulawayo',
  location: 'Lobang Ave, Bulawayo',
  jobType: 'COLD_ROOM',
  refrigerantType: 'R-290',
  amount: 1.8,
  actionType: 'Charge',
  timestamp: '2026-10-28T09:12:00.000Z',
  approvedSupplierName: 'Cold Chain Supplies',
  supplierVerified: true,
};

const snapshot: InstallationChecklistSnapshot = {
  checklistType: 'installation',
  version: '2026-10-12',
  completedItems: 24,
  totalItems: 25,
  completedAt: '2026-10-28T09:40:00.000Z',
  items: Array.from({ length: 25 }, (_, index) => ({
    id: `installation-0-${index}`,
    category: index < 20 ? 'Pressure test with dry nitrogen' : 'Charging the system',
    text: `Checklist line ${index + 1}: verify the recorded pressure, purge flow and charge figure against the manufacturer limit.`,
    checked: index < 24,
    source: index % 3 === 0 ? 'SANS 5001-1' : 'Manufacturer Spec',
  })),
};

describe('branded field pdfs', () => {
  it('writes a gas log pdf', async () => {
    await downloadGasLogPdf(log);
    const file = `hevacraz-gas-log-${log.id.slice(0, 8)}.pdf`;
    expect(existsSync(file)).toBe(true);
    const bytes = readFileSync(file);
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(4000);
    rmSync(file);
  });

  it('writes a checklist pdf', async () => {
    await downloadChecklistPdf(snapshot, { technicianName: 'T. Moyo', technicianId: 'tech-0042' });
    const file = `hevacraz-checklist-${snapshot.checklistType}-${snapshot.completedAt.slice(0, 10)}.pdf`;
    expect(existsSync(file)).toBe(true);
    const bytes = readFileSync(file);
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(4000);
    rmSync(file);
  });
});
