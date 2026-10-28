import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import * as schema from './schema/index';
import { hashPassword } from '../lib/server/password';

const connection = neon(process.env.DATABASE_URL!);
const db = drizzle(connection, { schema });

// Every seeded demo account shares this password so local/staging sign-in works
// without the demo-persona quick-login flag. Never used for anything real.
const SEED_PASSWORD = 'Demo1234!';

// ---------------------------------------------------------------------------
// Seed users mirroring MOCK_USERS from lib/auth.tsx
// ---------------------------------------------------------------------------
// Stable seed UUIDs - version 4 format
const U = {
  // users
  tech:    '00000000-0000-4000-8000-000000000001',
  trainer: '00000000-0000-4000-8000-000000000002',
  vendor:  '00000000-0000-4000-8000-000000000003',
  orgAdmin:'00000000-0000-4000-8000-000000000004',
  lecturer:'00000000-0000-4000-8000-000000000005',

  // second vendor
  vendor2: '00000000-0000-4000-8000-000000000007',
  // technicians
  tTendai: '00000000-0000-4000-8001-000000000001',
  tChiedza:'00000000-0000-4000-8001-000000000002',
  tBrightOn:'00000000-0000-4000-8001-000000000003',
  tCaign:  '00000000-0000-4000-8001-000000000004',
  // courses
  cRac:    '00000000-0000-4000-8002-000000000001',
  cChain:  '00000000-0000-4000-8002-000000000002',
  cLeak:   '00000000-0000-4000-8002-000000000003',
  // exams
  eTendai: '00000000-0000-4000-8003-000000000001',
  eChiedza:'00000000-0000-4000-8003-000000000002',
  eBrighton:'00000000-0000-4000-8003-000000000003',
  // reorders
  r1: '00000000-0000-4000-8004-000000000001',
  r2: '00000000-0000-4000-8004-000000000002',
  r3: '00000000-0000-4000-8004-000000000003',
  r4: '00000000-0000-4000-8004-000000000004',
  r5: '00000000-0000-4000-8004-000000000005',
  r6: '00000000-0000-4000-8004-000000000006',
  r7: '00000000-0000-4000-8004-000000000007',
  // verifications
  v1: '00000000-0000-4000-8005-000000000001',
  v2: '00000000-0000-4000-8005-000000000002',
  v3: '00000000-0000-4000-8005-000000000003',
  v4: '00000000-0000-4000-8005-000000000004',
  // supplier applications
  sa1: '00000000-0000-4000-8006-000000000001',
  sa2: '00000000-0000-4000-8006-000000000002',
  sa3: '00000000-0000-4000-8006-000000000003',
  // supplier compliance applications
  sca1: '00000000-0000-4000-8007-000000000001',
  sca2: '00000000-0000-4000-8007-000000000002',
  sca3: '00000000-0000-4000-8007-000000000003',
  // supplier ledger entries
  sl1: '00000000-0000-4000-8008-000000000001',
  sl2: '00000000-0000-4000-8008-000000000002',
  sl3: '00000000-0000-4000-8008-000000000003',
  sl4: '00000000-0000-4000-8008-000000000004',
  sl5: '00000000-0000-4000-8008-000000000005',
};

const seedUsers: (typeof schema.users.$inferInsert)[] = [
  {
    id: U.tech,
    name: 'Demo Technician',
    email: 'tech@coolpro.demo',
    role: 'technician',
    region: 'Harare',
    isDemo: true,
    status: 'active',
  },
  {
    id: U.trainer,
    name: 'Demo Trainer',
    email: 'trainer@coolpro.demo',
    role: 'trainer',
    region: 'Bulawayo',
    isDemo: true,
    status: 'active',
  },
  {
    id: U.vendor,
    name: 'Demo Vendor',
    email: 'vendor@coolpro.demo',
    role: 'vendor',
    region: 'Mutare',
    isDemo: true,
    status: 'active',
  },
  {
    id: U.orgAdmin,
    name: 'Demo Org Admin',
    email: 'org@coolpro.demo',
    role: 'org_admin',
    region: 'Gweru',
    isDemo: true,
    status: 'active',
  },
  {
    id: U.lecturer,
    name: 'Demo Lecturer',
    email: 'lecturer@coolpro.demo',
    role: 'lecturer',
    region: 'Harare',
    isDemo: true,
    status: 'active',
  },

];

// ---------------------------------------------------------------------------
// Seed technicians
// ---------------------------------------------------------------------------
const seedTechnicians: (typeof schema.technicians.$inferInsert)[] = [
  {
    id: U.tTendai,
    name: 'Tendai Moyo',
    nationalId: '63-123456A78',
    registrationNumber: 'TEC-2024-001',
    region: 'Harare',
    province: 'Harare',
    district: 'Harare Central',
    contactNumber: '+263771000001',
    email: 'tendai.moyo@coolpro.demo',
    specialization: 'Commercial Refrigeration',
    certifications: [
      {
        id: 'cert-001',
        name: 'RAC Refrigerant Handling Certificate',
        issuingBody: 'NOU Zimbabwe',
        dateIssued: '2024-01-15',
        expiryDate: '2026-01-14',
        certificateNumber: 'NOU-CERT-2024-001',
        status: 'valid',
      },
    ],
    trainingHistory: [
      {
        id: 'tr-001',
        courseName: 'RAC Refrigerant Safety Fundamentals',
        provider: 'HEVACRAZ Academy',
        dateCompleted: '2023-12-10',
        duration: '3 days',
        certificateNumber: 'HEVACRAZ-2023-001',
      },
    ],
    employmentStatus: 'employed',
    employer: 'CoolTech Harare',
    refrigerantsHandled: ['R-410A', 'R-22', 'R-32'],
    registrationDate: '2024-01-15',
    expiryDate: '2026-01-14',
    status: 'active',
    qrToken: 'qr-tendai-moyo-2024',
  },
  {
    id: U.tChiedza,
    name: 'Chiedza Nhamo',
    nationalId: '44-234567B89',
    registrationNumber: 'TEC-2024-002',
    region: 'Bulawayo',
    province: 'Bulawayo',
    district: 'Bulawayo Central',
    contactNumber: '+263771000002',
    email: 'chiedza.nhamo@coolpro.demo',
    specialization: 'Cold Chain Logistics',
    certifications: [
      {
        id: 'cert-002',
        name: 'Cold Chain Compliance Certificate',
        issuingBody: 'NOU Zimbabwe',
        dateIssued: '2024-03-01',
        expiryDate: '2026-02-28',
        certificateNumber: 'NOU-CERT-2024-002',
        status: 'valid',
      },
    ],
    trainingHistory: [],
    employmentStatus: 'self-employed',
    refrigerantsHandled: ['R-404A', 'R-134a'],
    registrationDate: '2024-03-01',
    expiryDate: '2026-02-28',
    status: 'active',
    qrToken: 'qr-chiedza-nhamo-2024',
  },
  {
    id: U.tBrightOn,
    name: 'Brighton Dube',
    nationalId: '52-345678C90',
    registrationNumber: 'TEC-2024-003',
    region: 'Matabeleland North',
    province: 'Matabeleland North',
    district: 'Hwange',
    contactNumber: '+263771000003',
    email: 'brighton.dube@coolpro.demo',
    specialization: 'Leak Detection and Repair',
    certifications: [],
    trainingHistory: [],
    employmentStatus: 'employed',
    employer: 'Industrial Cold Systems',
    refrigerantsHandled: ['R-290', 'R-744'],
    registrationDate: '2024-06-01',
    expiryDate: '2026-05-31',
    status: 'active',
    qrToken: 'qr-brighton-dube-2024',
  },
  {
    id: U.tCaign,
    name: 'Caign Manyukwa',
    nationalId: '38-2000303V15',
    registrationNumber: 'TEC-2023-001',
    region: 'Harare',
    province: 'Harare',
    district: 'Harare Central',
    contactNumber: '+263771000004',
    email: 'caign.manyukwa@hevacraz.demo',
    specialization: 'Refrigeration & Air Conditioning',
    certifications: [
      {
        id: 'cert-004',
        name: 'Refrigeration & Air Conditioning Practitioner Certificate',
        issuingBody: 'HEVACRAZ',
        dateIssued: '2023-06-28',
        expiryDate: '2025-06-27',
        certificateNumber: 'HEVACRAZ-CERT-2023-001',
        status: 'valid',
      },
    ],
    trainingHistory: [],
    employmentStatus: 'employed',
    employer: 'HEVACRAZ (Chairman)',
    refrigerantsHandled: ['R-410A', 'R-32', 'R-134a'],
    registrationDate: '2023-06-28',
    expiryDate: '2025-06-27',
    status: 'active',
    qrToken: 'qr-caign-manyukwa-2023',
  },
];

// ---------------------------------------------------------------------------
// Seed courses from lib/platformStore.ts SEED_COURSES
// ---------------------------------------------------------------------------
const seedCourses: (typeof schema.courses.$inferInsert)[] = [
  {
    id: U.cRac,
    lecturerId: U.lecturer,
    lecturerName: 'Demo Lecturer',
    title: 'RAC Refrigerant Safety Fundamentals',
    description:
      'Core safety principles for handling refrigerants in commercial RAC systems, covering ODP, GWP, and PPE requirements.',
    modules: [
      {
        title: 'Introduction to Refrigerants',
        content:
          'Overview of common refrigerants (R-22, R-410A, R-32), their properties and safety classifications per ASHRAE.',
        minutes: 45,
      },
      {
        title: 'PPE and Handling Protocols',
        content:
          'Mandatory personal protective equipment, safe handling procedures, and leak detection techniques.',
        minutes: 60,
      },
      {
        title: 'Emergency Response',
        content:
          'Steps to take during refrigerant release incidents, evacuation procedures, and regulatory notification requirements.',
        minutes: 30,
      },
    ],
    status: 'approved',
    createdAt: new Date('2026-02-10T08:00:00.000Z'),
    updatedAt: new Date('2026-02-15T10:30:00.000Z'),
  },
  {
    id: U.cChain,
    lecturerId: U.lecturer,
    lecturerName: 'Demo Lecturer',
    title: 'Cold Chain Compliance for Food Storage',
    description:
      'Regulatory and technical requirements for maintaining food-safe cold chains in Zimbabwe, including NOU reporting obligations.',
    modules: [
      {
        title: 'Regulatory Framework',
        content:
          'Zimbabwe cold chain regulations, NOU reporting obligations, and compliance calendar.',
        minutes: 40,
      },
      {
        title: 'Temperature Monitoring Systems',
        content:
          'Installing and calibrating temperature loggers, interpreting data, and corrective action procedures.',
        minutes: 50,
      },
    ],
    status: 'pending_nou',
    createdAt: new Date('2026-03-01T09:00:00.000Z'),
    updatedAt: new Date('2026-03-20T14:00:00.000Z'),
  },
  {
    id: U.cLeak,
    lecturerId: U.trainer,
    lecturerName: 'Demo Trainer',
    title: 'Leak Detection and Repair Techniques',
    description:
      'Practical course on identifying, diagnosing, and repairing refrigerant leaks in field conditions.',
    modules: [
      {
        title: 'Electronic Leak Detection',
        content:
          'Using electronic detectors, UV dye methods, and soap bubble testing when to use each technique.',
        minutes: 55,
      },
      {
        title: 'Repair Procedures',
        content:
          'Safe repair workflows, pressure testing after repair, and documentation requirements for NOU records.',
        minutes: 65,
      },
    ],
    status: 'draft',
    createdAt: new Date('2026-04-05T07:00:00.000Z'),
    updatedAt: new Date('2026-04-10T11:00:00.000Z'),
  },
];

// ---------------------------------------------------------------------------
// Seed exam submissions from lib/platformStore.ts SEED_EXAM_SUBMISSIONS
// ---------------------------------------------------------------------------
const seedExamSubmissions: (typeof schema.examSubmissions.$inferInsert)[] = [
  {
    id: U.eTendai,
    courseId: U.cRac,
    courseTitle: 'RAC Refrigerant Safety Fundamentals',
    studentId: U.tTendai,
    studentName: 'Tendai Moyo',
    answers: [
      { question: 'What ASHRAE safety class is R-410A?', answer: 'A1 non-toxic, non-flammable.' },
      {
        question: 'List two mandatory PPE items when handling refrigerants.',
        answer: 'Safety goggles and insulated gloves.',
      },
    ],
    status: 'pending',
    submittedAt: new Date('2026-04-12T10:15:00.000Z'),
  },
  {
    id: U.eChiedza,
    courseId: U.cRac,
    courseTitle: 'RAC Refrigerant Safety Fundamentals',
    studentId: U.tChiedza,
    studentName: 'Chiedza Nhamo',
    answers: [
      { question: 'What ASHRAE safety class is R-410A?', answer: 'A2L mildly flammable.' },
      {
        question: 'List two mandatory PPE items when handling refrigerants.',
        answer: 'Gloves and a face shield.',
      },
    ],
    score: '72.00',
    passed: true,
    feedback:
      'Good overall understanding. Review ASHRAE classification for R-410A it is A1, not A2L.',
    status: 'graded',
    submittedAt: new Date('2026-04-11T08:40:00.000Z'),
    gradedAt: new Date('2026-04-13T09:00:00.000Z'),
  },
  {
    id: U.eBrighton,
    courseId: U.cLeak,
    courseTitle: 'Leak Detection and Repair Techniques',
    studentId: U.tBrightOn,
    studentName: 'Brighton Dube',
    answers: [
      {
        question: 'Name three leak detection methods.',
        answer: 'Electronic detector, UV dye, soap bubbles.',
      },
    ],
    status: 'pending',
    submittedAt: new Date('2026-04-14T13:30:00.000Z'),
  },
];

// ---------------------------------------------------------------------------
// Seed supplier reorders from lib/platformStore.ts SEED_REORDERS
// ---------------------------------------------------------------------------
const seedReorders: (typeof schema.supplierReorders.$inferInsert)[] = [
  {
    id: U.r1,
    vendorId: U.vendor,
    vendorName: 'Demo Vendor',
    gasType: 'R-410A',
    quantityKg: '50',
    purpose: 'Restocking commercial refrigeration supply for Harare region',
    supplierNotes: 'Urgent low on stock before peak season',
    status: 'pending_hevacraz',
    createdAt: new Date('2026-04-10T08:00:00.000Z'),
  },
  {
    id: U.r2,
    vendorId: U.vendor,
    vendorName: 'Demo Vendor',
    gasType: 'R-32',
    quantityKg: '30',
    purpose: 'Split system installations for new residential complex',
    supplierNotes: '',
    status: 'pending_nou',
    hevacrazReviewerId: U.orgAdmin,
    hevacrazReviewedAt: new Date('2026-04-12T10:00:00.000Z'),
    createdAt: new Date('2026-04-08T09:30:00.000Z'),
  },
  {
    id: U.r3,
    vendorId: U.vendor,
    vendorName: 'Demo Vendor',
    gasType: 'R-22',
    quantityKg: '20',
    purpose: 'Servicing legacy equipment for existing clients',
    supplierNotes: 'R-22 still required for older units pending upgrade',
    status: 'approved',
    hevacrazReviewerId: U.orgAdmin,
    hevacrazReviewedAt: new Date('2026-04-01T11:00:00.000Z'),
    nouReviewerId: U.orgAdmin,
    nouReviewedAt: new Date('2026-04-03T14:00:00.000Z'),
    createdAt: new Date('2026-03-28T07:00:00.000Z'),
  },
  {
    id: U.r4,
    vendorId: U.vendor,
    vendorName: 'Demo Vendor',
    gasType: 'R-290',
    quantityKg: '10',
    purpose: 'Natural refrigerant trial for eco-conscious clients',
    supplierNotes: '',
    status: 'rejected',
    hevacrazReviewerId: U.orgAdmin,
    hevacrazReviewedAt: new Date('2026-04-05T09:00:00.000Z'),
    rejectionReason:
      'Insufficient safety documentation for A3 class refrigerant. Resubmit with site safety plan.',
    rejectedBy: 'hevacraz',
    createdAt: new Date('2026-04-02T12:00:00.000Z'),
  },
  {
    id: U.r5,
    vendorId: U.vendor2,
    vendorName: 'CoolSupply Harare',
    gasType: 'R-134a',
    quantityKg: '40',
    purpose: 'Automotive refrigeration supply',
    supplierNotes: '',
    status: 'pending_hevacraz',
    createdAt: new Date('2026-04-15T06:00:00.000Z'),
  },
  {
    id: U.r6,
    vendorId: U.vendor2,
    vendorName: 'CoolSupply Harare',
    gasType: 'R-404A',
    quantityKg: '25',
    purpose: 'Cold storage facility maintenance',
    supplierNotes: 'Time-sensitive order',
    status: 'pending_nou',
    hevacrazReviewerId: U.orgAdmin,
    hevacrazReviewedAt: new Date('2026-04-14T08:00:00.000Z'),
    createdAt: new Date('2026-04-11T10:00:00.000Z'),
  },
  {
    id: U.r7,
    vendorId: U.vendor2,
    vendorName: 'CoolSupply Harare',
    gasType: 'R-744',
    quantityKg: '60',
    purpose: 'CO2 cascade systems for industrial cold rooms',
    supplierNotes: '',
    status: 'rejected',
    hevacrazReviewerId: U.orgAdmin,
    hevacrazReviewedAt: new Date('2026-04-09T15:00:00.000Z'),
    nouReviewerId: U.orgAdmin,
    nouReviewedAt: new Date('2026-04-10T11:00:00.000Z'),
    rejectionReason: 'Quota exceeded for Q2. Resubmit in Q3.',
    rejectedBy: 'nou',
    createdAt: new Date('2026-04-06T08:00:00.000Z'),
  },
];

// ---------------------------------------------------------------------------
// Seed technician verifications
// ---------------------------------------------------------------------------
const seedVerifications: (typeof schema.technicianVerifications.$inferInsert)[] = [
  {
    id: U.v1,
    vendorId: U.vendor,
    vendorName: 'Demo Vendor',
    method: 'reg_number',
    query: 'TEC-2024-001',
    technicianId: U.tTendai,
    result: 'valid',
    createdAt: new Date('2026-04-13T09:00:00.000Z'),
  },
  {
    id: U.v2,
    vendorId: U.vendor,
    vendorName: 'Demo Vendor',
    method: 'qr',
    query: 'qr-chiedza-nhamo-2024',
    technicianId: U.tChiedza,
    result: 'valid',
    createdAt: new Date('2026-04-14T10:00:00.000Z'),
  },
  {
    id: U.v3,
    vendorId: U.vendor,
    vendorName: 'Demo Vendor',
    method: 'name',
    query: 'John Unknown',
    result: 'not_found',
    createdAt: new Date('2026-04-15T11:00:00.000Z'),
  },
  {
    id: U.v4,
    vendorId: U.vendor,
    vendorName: 'Demo Vendor',
    method: 'reg_number',
    query: 'TEC-2023-001',
    technicianId: U.tCaign,
    result: 'valid',
    createdAt: new Date('2026-04-16T08:30:00.000Z'),
  },
];

// ---------------------------------------------------------------------------
// Seed supplier applications
// ---------------------------------------------------------------------------
const seedSupplierApplications: (typeof schema.supplierApplications.$inferInsert)[] = [
  {
    id: U.sa1,
    companyName: 'Mutare Cooling Gas Traders',
    tradingName: 'CoolGas Mutare',
    registrationNumber: 'ZW-2024-REG-001',
    supplierType: 'distributor',
    contactName: 'Farai Chikwanda',
    email: 'vendor@coolpro.demo',
    phone: '+263771100001',
    province: 'Manicaland',
    city: 'Mutare',
    address: '14 Commerce Street, Mutare',
    refrigerantsSupplied: ['R-290', 'R-32', 'R-744'],
    taxNumber: 'BP-0012345',
    status: 'approved',
    reviewedBy: 'Demo Org Admin',
    reviewedAt: new Date('2026-03-15T10:00:00.000Z'),
    reviewNote: 'Documents verified. Approved for distribution.',
    submittedAt: new Date('2026-03-10T08:00:00.000Z'),
    createdAt: new Date('2026-03-10T08:00:00.000Z'),
  },
  {
    id: U.sa2,
    companyName: 'CoolSupply Harare',
    registrationNumber: 'ZW-2024-REG-002',
    supplierType: 'wholesaler',
    contactName: 'Tinashe Moyo',
    email: 'tinashe@coolsupply.demo',
    phone: '+263771200002',
    province: 'Harare',
    city: 'Harare',
    address: '5 Industrial Road, Harare',
    refrigerantsSupplied: ['R-134a', 'R-404A'],
    status: 'under-review',
    submittedAt: new Date('2026-04-01T09:00:00.000Z'),
    createdAt: new Date('2026-04-01T09:00:00.000Z'),
  },
  {
    id: U.sa3,
    companyName: 'Southern HVAC Solutions',
    registrationNumber: 'ZW-2024-REG-003',
    supplierType: 'importer',
    contactName: 'Blessing Nkosi',
    email: 'blessing@southernhvac.demo',
    phone: '+263773300003',
    province: 'Bulawayo',
    city: 'Bulawayo',
    address: '88 Nketa Drive, Bulawayo',
    refrigerantsSupplied: ['R-410A', 'R-22'],
    status: 'submitted',
    submittedAt: new Date('2026-04-14T11:00:00.000Z'),
    createdAt: new Date('2026-04-14T11:00:00.000Z'),
  },
];

// ---------------------------------------------------------------------------
// Seed supplier compliance applications
// ---------------------------------------------------------------------------
const seedSupplierComplianceApplications: (typeof schema.supplierComplianceApplications.$inferInsert)[] = [
  {
    id: U.sca1,
    supplierEmail: 'vendor@coolpro.demo',
    supplierName: 'Mutare Cooling Gas Traders',
    certificateType: 'distribution-compliance',
    monthCoverage: '2026-03',
    sitesCovered: '3',
    contactPerson: 'Farai Chikwanda',
    supportingSummary: 'March distribution records filed. All deliveries linked to registered technicians.',
    status: 'approved',
    notes: 'Approved after document verification.',
    submittedAt: new Date('2026-04-02T08:00:00.000Z'),
    createdAt: new Date('2026-04-02T08:00:00.000Z'),
  },
  {
    id: U.sca2,
    supplierEmail: 'vendor@coolpro.demo',
    supplierName: 'Mutare Cooling Gas Traders',
    certificateType: 'nou-reporting',
    monthCoverage: '2026-04',
    sitesCovered: '3',
    contactPerson: 'Farai Chikwanda',
    supportingSummary: 'April NOU reporting pack. Pending two outstanding client sign-offs.',
    status: 'submitted',
    submittedAt: new Date('2026-04-15T09:00:00.000Z'),
    createdAt: new Date('2026-04-15T09:00:00.000Z'),
  },
  {
    id: U.sca3,
    supplierEmail: 'tinashe@coolsupply.demo',
    supplierName: 'CoolSupply Harare',
    certificateType: 'traceability-audit',
    monthCoverage: '2026-03',
    sitesCovered: '2',
    contactPerson: 'Tinashe Moyo',
    supportingSummary: 'Traceability audit documentation for Q1 cycle.',
    status: 'under-review',
    submittedAt: new Date('2026-04-05T10:00:00.000Z'),
    createdAt: new Date('2026-04-05T10:00:00.000Z'),
  },
];

// ---------------------------------------------------------------------------
// Seed supplier ledger entries
// ---------------------------------------------------------------------------
const seedSupplierLedger: (typeof schema.supplierLedger.$inferInsert)[] = [
  {
    id: U.sl1,
    supplierEmail: 'vendor@coolpro.demo',
    supplierName: 'Mutare Cooling Gas Traders',
    direction: 'purchase',
    counterpartyName: 'Zimbabwe Refrigeration Supplies',
    counterpartyType: 'importer',
    province: 'Harare',
    refrigerant: 'R-290',
    quantityKg: '240',
    unitPriceUsd: '18.50',
    totalValueUsd: '4440.00',
    invoiceNumber: 'INV-260301',
    transactionDate: new Date('2026-03-01T09:20:00.000Z'),
    referenceMonth: '2026-03',
    reportedToNou: true,
    clientReported: true,
    notes: 'March opening stock replenishment.',
    createdAt: new Date('2026-03-01T09:20:00.000Z'),
  },
  {
    id: U.sl2,
    supplierEmail: 'vendor@coolpro.demo',
    supplierName: 'Mutare Cooling Gas Traders',
    direction: 'sale',
    counterpartyName: 'Eastern Cold Chain Logistics',
    counterpartyType: 'cold-chain-client',
    province: 'Manicaland',
    refrigerant: 'R-290',
    quantityKg: '58',
    unitPriceUsd: '26.00',
    totalValueUsd: '1508.00',
    invoiceNumber: 'SL-260304',
    transactionDate: new Date('2026-03-04T12:40:00.000Z'),
    referenceMonth: '2026-03',
    reportedToNou: true,
    clientReported: true,
    notes: 'Quarterly delivery to depot.',
    createdAt: new Date('2026-03-04T12:40:00.000Z'),
  },
  {
    id: U.sl3,
    supplierEmail: 'vendor@coolpro.demo',
    supplierName: 'Mutare Cooling Gas Traders',
    direction: 'sale',
    counterpartyName: 'Nyanga Fresh Produce',
    counterpartyType: 'retailer',
    province: 'Manicaland',
    refrigerant: 'R-32',
    quantityKg: '36',
    unitPriceUsd: '29.00',
    totalValueUsd: '1044.00',
    invoiceNumber: 'SL-260309',
    transactionDate: new Date('2026-03-09T10:15:00.000Z'),
    referenceMonth: '2026-03',
    reportedToNou: false,
    clientReported: true,
    notes: 'Pending NOU filing batch.',
    createdAt: new Date('2026-03-09T10:15:00.000Z'),
  },
  {
    id: U.sl4,
    supplierEmail: 'tinashe@coolsupply.demo',
    supplierName: 'CoolSupply Harare',
    direction: 'purchase',
    counterpartyName: 'African HVAC Distributors',
    counterpartyType: 'importer',
    province: 'Midlands',
    refrigerant: 'R-134a',
    quantityKg: '180',
    unitPriceUsd: '21.00',
    totalValueUsd: '3780.00',
    invoiceNumber: 'INV-260311',
    transactionDate: new Date('2026-03-11T08:55:00.000Z'),
    referenceMonth: '2026-03',
    reportedToNou: true,
    clientReported: true,
    createdAt: new Date('2026-03-11T08:55:00.000Z'),
  },
  {
    id: U.sl5,
    supplierEmail: 'tinashe@coolsupply.demo',
    supplierName: 'CoolSupply Harare',
    direction: 'sale',
    counterpartyName: 'PrimeCool Services',
    counterpartyType: 'technician',
    province: 'Harare',
    refrigerant: 'R-404A',
    quantityKg: '28',
    unitPriceUsd: '30.00',
    totalValueUsd: '840.00',
    invoiceNumber: 'SL-260315',
    transactionDate: new Date('2026-03-15T15:05:00.000Z'),
    referenceMonth: '2026-03',
    reportedToNou: true,
    clientReported: false,
    notes: 'Client delivery note awaiting confirmation.',
    createdAt: new Date('2026-03-15T15:05:00.000Z'),
  },
];

const SAFETY_CHECKLIST = [
  { id: 'pcl-1', label: 'PPE confirmed', required: true, completed: true, appliesTo: 'all' as const },
  { id: 'pcl-2', label: 'Ventilation verified', required: true, completed: true, appliesTo: ['A2L', 'A3'] },
  { id: 'pcl-3', label: 'Leak detector available', required: true, completed: true, appliesTo: 'all' as const },
];

const seedPlannerJobs: (typeof schema.plannerJobs.$inferInsert)[] = [
  {
    clientId: 'client-1', clientName: 'Meikles Hotel', location: '3 Jason Moyo Ave, Harare', province: 'Harare',
    technicianId: U.tech, technicianName: 'Demo Technician',
    jobType: 'COLD_ROOM', refrigerantClass: 'A1', refrigerantType: 'R-744', amount: '18.5',
    scheduledDate: '2026-04-04', status: 'scheduled', preJobChecklistComplete: true,
    checklistItems: SAFETY_CHECKLIST, notes: 'Quarterly cold room inspection.',
  },
  {
    clientId: 'client-2', clientName: 'Pick n Pay Highlands', location: 'Enterprise Road, Harare', province: 'Harare',
    technicianId: U.tech, technicianName: 'Demo Technician',
    jobType: 'C60_FREEZER', refrigerantClass: 'A2L', refrigerantType: 'R-32', amount: '6.2',
    scheduledDate: '2026-04-08', status: 'in-progress', preJobChecklistComplete: true,
    checklistItems: SAFETY_CHECKLIST, notes: 'CO2 rack compressor service.',
  },
  {
    clientId: 'client-3', clientName: 'Spar Bulawayo', location: 'Fife Street, Bulawayo', province: 'Bulawayo',
    technicianId: U.tech, technicianName: 'Demo Technician',
    jobType: 'FREEZER_ROOM', refrigerantClass: 'A3', refrigerantType: 'R-290', amount: '9.0',
    scheduledDate: '2026-04-12', status: 'follow-up', preJobChecklistComplete: false,
    checklistItems: SAFETY_CHECKLIST.map((i) => ({ ...i, completed: false })), notes: 'Door seal inspection follow-up.',
  },
];

const seedEquipmentRecords: (typeof schema.equipmentRecords.$inferInsert)[] = [
  {
    equipmentId: 'EQ-HTR-001', clientName: 'Meikles Hotel', province: 'Harare',
    refrigerantType: 'R-290', ashraeSafetyClass: 'A3',
    lastServiceDate: '2026-01-15', nextServiceDue: '2026-04-15', status: 'due-soon',
    technicianName: 'Tapiwa Moyo',
    serviceHistory: [{ id: 'srv-1', date: '2026-01-15', notes: 'Quarterly maintenance completed', technicianName: 'Tapiwa Moyo', status: 'completed' }],
    predictedFailureReason: 'Compressor vibration rising above baseline.',
    recommendedAction: 'Schedule service before peak occupancy weekend.',
  },
  {
    equipmentId: 'EQ-SPR-002', clientName: 'Spar Bulawayo', province: 'Bulawayo',
    refrigerantType: 'R-744', ashraeSafetyClass: 'A1',
    lastServiceDate: '2026-01-28', nextServiceDue: '2026-04-28', status: 'normal',
    technicianName: 'Nyasha Chikomo',
    serviceHistory: [{ id: 'srv-2', date: '2026-01-28', notes: 'Temperature calibration performed', technicianName: 'Nyasha Chikomo', status: 'completed' }],
  },
  {
    equipmentId: 'EQ-DEL-003', clientName: 'Delta Beverages', province: 'Harare',
    refrigerantType: 'R-32', ashraeSafetyClass: 'A2L',
    lastServiceDate: '2025-12-20', nextServiceDue: '2026-03-20', status: 'overdue',
    technicianName: 'Munyaradzi Dube',
    serviceHistory: [{ id: 'srv-3', date: '2025-12-20', notes: 'Leak test and recharge completed', technicianName: 'Munyaradzi Dube', status: 'completed' }],
    predictedFailureReason: 'Evaporator coil frosting and reduced airflow.',
    recommendedAction: 'Create urgent service job and inspect airflow path.',
  },
  {
    equipmentId: 'EQ-OKZ-004', clientName: 'Ok Zimbabwe - Harare', province: 'Harare',
    refrigerantType: 'R-290', ashraeSafetyClass: 'A3',
    lastServiceDate: '2026-02-03', nextServiceDue: '2026-05-03', status: 'normal',
    technicianName: 'Tapiwa Moyo',
    serviceHistory: [{ id: 'srv-4', date: '2026-02-03', notes: 'Cabinet seals replaced', technicianName: 'Tapiwa Moyo', status: 'completed' }],
  },
  {
    equipmentId: 'EQ-GWE-006', clientName: 'Gweru Fresh Foods', province: 'Midlands',
    refrigerantType: 'R-744', ashraeSafetyClass: 'A1',
    lastServiceDate: '2025-11-30', nextServiceDue: '2026-02-28', status: 'overdue',
    technicianName: 'Nyasha Chikomo',
    serviceHistory: [{ id: 'srv-6', date: '2025-11-30', notes: 'Pressure sensor replaced', technicianName: 'Nyasha Chikomo', status: 'completed' }],
    predictedFailureReason: 'Pressure instability observed in trend logs.',
    recommendedAction: 'Dispatch technician and capture differential pressure readings.',
  },
];

const seedCertificateRequests: (typeof schema.trainerCertificateRequests.$inferInsert)[] = [
  {
    technicianId: U.tTendai, technicianName: 'Tendai Moyo', technicianRegistrationNumber: 'TEC-2024-001',
    technicianCompany: 'Independent technician', trainerName: 'Demo Trainer', trainerEmail: 'trainer@coolpro.demo',
    courseTitle: 'Low GWP Refrigerants Safety', examDate: '2026-03-10', theoryScore: 88, practicalScore: 92,
    overallScore: 90, status: 'issued', certificateNumber: 'HEV-240318',
    verificationToken: 'verify-demo2403', cpdCredits: 12,
    submittedAt: new Date('2026-03-10T10:00:00.000Z'), issuedAt: new Date('2026-03-18T09:00:00.000Z'),
    reviewedAt: new Date('2026-03-12T09:00:00.000Z'), adminReviewer: 'Demo Org Admin',
  },
  {
    technicianId: U.tChiedza, technicianName: 'Chiedza Nhamo', technicianRegistrationNumber: 'TEC-2024-002',
    technicianCompany: 'Independent technician', trainerName: 'Demo Trainer', trainerEmail: 'trainer@coolpro.demo',
    courseTitle: 'Hydrocarbon Refrigerant Handling', examDate: '2026-03-20', theoryScore: 81, practicalScore: 79,
    overallScore: 80, status: 'submitted-for-admin-approval',
    submittedAt: new Date('2026-03-20T10:00:00.000Z'),
  },
];

async function seed() {
  if (process.env.ALLOW_SEED_TRUNCATE !== 'true') {
    console.error(
      '\n✖ Refusing to run: this script TRUNCATEs users, technicians, courses, exams, and all supplier data.\n' +
      '  Set ALLOW_SEED_TRUNCATE=true only when DATABASE_URL points at a database you intend to wipe\n' +
      '  (local/dev/staging). Never set this against production.\n',
    );
    process.exit(1);
  }

  console.log('Seeding database...\n');

  // Truncate in dependency order (exam_submissions refs courses, so courses last to drop)
  await db.execute(sql`TRUNCATE TABLE supplier_ledger, supplier_compliance_applications, supplier_applications, technician_verifications, supplier_reorders, exam_submissions, courses, technicians, users, planner_jobs, equipment_records, training_sessions, trainer_certificate_requests, student_applications, technician_applications, gas_usage_logs RESTART IDENTITY CASCADE`);
  console.log('Tables truncated.\n');

  // Users
  const seedPasswordHash = await hashPassword(SEED_PASSWORD);
  await db.insert(schema.users).values(seedUsers.map((u) => ({ ...u, passwordHash: seedPasswordHash })));
  const userCount = await db.select({ count: sql<number>`count(*)` }).from(schema.users);
  console.log(`users: ${userCount[0].count} rows (password: ${SEED_PASSWORD})`);

  // Technicians
  await db.insert(schema.technicians).values(seedTechnicians);
  const techCount = await db.select({ count: sql<number>`count(*)` }).from(schema.technicians);
  console.log(`technicians: ${techCount[0].count} rows`);

  // Courses
  await db.insert(schema.courses).values(seedCourses);
  const courseCount = await db.select({ count: sql<number>`count(*)` }).from(schema.courses);
  console.log(`courses: ${courseCount[0].count} rows`);

  // Exam submissions
  await db.insert(schema.examSubmissions).values(seedExamSubmissions);
  const examCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.examSubmissions);
  console.log(`exam_submissions: ${examCount[0].count} rows`);

  // Supplier reorders
  await db.insert(schema.supplierReorders).values(seedReorders);
  const reorderCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.supplierReorders);
  console.log(`supplier_reorders: ${reorderCount[0].count} rows`);

  // Technician verifications
  await db.insert(schema.technicianVerifications).values(seedVerifications);
  const verifCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.technicianVerifications);
  console.log(`technician_verifications: ${verifCount[0].count} rows`);

  // Supplier applications
  await db.insert(schema.supplierApplications).values(seedSupplierApplications);
  const saCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.supplierApplications);
  console.log(`supplier_applications: ${saCount[0].count} rows`);

  // Supplier compliance applications
  await db.insert(schema.supplierComplianceApplications).values(seedSupplierComplianceApplications);
  const scaCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.supplierComplianceApplications);
  console.log(`supplier_compliance_applications: ${scaCount[0].count} rows`);

  // Supplier ledger
  await db.insert(schema.supplierLedger).values(seedSupplierLedger);
  const slCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.supplierLedger);
  console.log(`supplier_ledger: ${slCount[0].count} rows`);

  // Planner jobs
  await db.insert(schema.plannerJobs).values(seedPlannerJobs);
  const pjCount = await db.select({ count: sql<number>`count(*)` }).from(schema.plannerJobs);
  console.log(`planner_jobs: ${pjCount[0].count} rows`);

  // Equipment records
  await db.insert(schema.equipmentRecords).values(seedEquipmentRecords);
  const eqCount = await db.select({ count: sql<number>`count(*)` }).from(schema.equipmentRecords);
  console.log(`equipment_records: ${eqCount[0].count} rows`);

  // Training sessions
  // Trainer certificate requests
  await db.insert(schema.trainerCertificateRequests).values(seedCertificateRequests);
  const tcrCount = await db.select({ count: sql<number>`count(*)` }).from(schema.trainerCertificateRequests);
  console.log(`trainer_certificate_requests: ${tcrCount[0].count} rows`);

  console.log('\nSeed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
