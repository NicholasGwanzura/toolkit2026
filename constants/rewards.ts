import type { RewardItem } from '@/types/index';

export interface VendorRewardItem {
  id: string;
  title: string;
  points: number;
  detail: string;
}

// Single source of truth for the redeemable reward catalogs — used by the UI to render the
// catalog and by the redemption API to validate rewardId/pointsCost server-side, so a client
// can never submit an arbitrary points cost for a redemption request.
export const TECHNICIAN_REWARDS: RewardItem[] = [
  {
    id: '1',
    title: 'Digital Manifold Set 10% Discount',
    points: 500,
    vendor: 'Fieldpiece',
  },
  {
    id: '2',
    title: 'Refillable Nitrogen Tank Voucher',
    points: 300,
    vendor: 'GasCo',
  },
  {
    id: '3',
    title: 'Safe Handling PPE Kit',
    points: 200,
    vendor: 'CoolSafe',
  },
  {
    id: '4',
    title: 'Transcritical CO2 Advanced Training',
    points: 1000,
    vendor: 'Global HVAC Academy',
  },
];

export const VENDOR_REWARDS: VendorRewardItem[] = [
  {
    id: 'vendor-reward-1',
    title: 'NOU Filing Fee Credit',
    points: 300,
    detail: 'Offset one compliance filing cycle after consistent reporting.',
  },
  {
    id: 'vendor-reward-2',
    title: 'Preferred Supplier Badge Renewal',
    points: 550,
    detail: 'Priority review for compliant suppliers with zero late filings.',
  },
  {
    id: 'vendor-reward-3',
    title: 'Audit Preparation Pack',
    points: 220,
    detail: 'Digital templates for NOU and client-facing reporting packs.',
  },
  {
    id: 'vendor-reward-4',
    title: 'Certificate Processing Discount',
    points: 450,
    detail: 'Discount on the next supplier certificate of compliance application.',
  },
];
