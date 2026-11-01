import { describe, expect, it } from 'vitest';
import { isSameCharge, plannerChargeLogId, repeatsJobCharge } from './planner-charge';

const when = new Date('2026-11-01T10:00:00Z');
const charge = { clientName: 'Simbisa Brands', refrigerantType: 'R-32', amount: '4.500', timestamp: when, plannerJobId: 'job-1' };
const log = { clientName: ' simbisa brands ', refrigerantType: 'r32', amount: 4.5, timestamp: new Date('2026-11-03T08:00:00Z'), actionType: 'Charge', plannerJobId: null };

describe('plannerChargeLogId', () => {
  it('is the same every time for a job', () => {
    expect(plannerChargeLogId('job-1')).toBe(plannerChargeLogId('job-1'));
    expect(plannerChargeLogId('job-1')).not.toBe(plannerChargeLogId('job-2'));
  });
});

describe('isSameCharge', () => {
  it('ignores case, spacing and how the gas is written', () => {
    expect(isSameCharge(log, charge)).toBe(true);
  });
  it('treats a different client, gas or weight as a different charge', () => {
    expect(isSameCharge({ ...log, clientName: 'Other' }, charge)).toBe(false);
    expect(isSameCharge({ ...log, refrigerantType: 'R-410A' }, charge)).toBe(false);
    expect(isSameCharge({ ...log, amount: 4.6 }, charge)).toBe(false);
  });
  it('treats the same charge weeks later as a new one', () => {
    expect(isSameCharge({ ...log, timestamp: new Date('2026-11-09T10:00:01Z') }, charge)).toBe(false);
    expect(isSameCharge({ ...log, timestamp: new Date('2026-11-08T10:00:00Z') }, charge)).toBe(true);
  });
});

describe('repeatsJobCharge', () => {
  it('catches an unlinked log that matches a job charge', () => {
    expect(repeatsJobCharge(log, [charge])).toBe(true);
  });
  it('catches any charge linked to a job that already has one, whatever its amount', () => {
    expect(repeatsJobCharge({ ...log, amount: 9, plannerJobId: 'job-1' }, [charge])).toBe(true);
  });
  it('lets through a charge linked to a different job', () => {
    expect(repeatsJobCharge({ ...log, plannerJobId: 'job-2' }, [charge])).toBe(false);
  });
  it('never touches recovery or leak repair logs', () => {
    expect(repeatsJobCharge({ ...log, actionType: 'Recovery' }, [charge])).toBe(false);
    expect(repeatsJobCharge({ ...log, actionType: 'Leak Repair' }, [charge])).toBe(false);
  });
});
