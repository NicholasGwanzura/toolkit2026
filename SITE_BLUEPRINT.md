# HEVACRAZ - Site Blueprint

> **Historical design document.** Several claims here (Vercel deployment, mock services, module
> list, data layer) are out of date. The app is deployed on Railway, uses Drizzle/PostgreSQL,
> and the cylinder/permit/reclamation/recycling modules have been removed. See `README.md` and
> `SONNET_ALIGNMENT.md` for the current architecture.

## 1. Project Overview

**Project Name:** HEVACRAZ (HVAC-R Association of Zimbabwe)  
**Type:** Web Application (Next.js 16 + React + TypeScript + Tailwind CSS)  
**Deployment:** Vercel (https://coolpro2026.vercel.app)  
**Repository:** github.com/NickGwanzura/coolpro2026

### Core Purpose
A comprehensive digital toolkit for HVAC-R professionals in Zimbabwe, providing:
- Technician certification and registry management
- Field operations support (installations, COC certificates)
- Cooling load calculations and sizing tools
- Training and LMS for professional development
- Safety and accident reporting
- Rewards and compliance tracking

---

## 2. Technical Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.1.6 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| PDF Generation | jsPDF |
| State | React Context + localStorage |
| Auth | Mock (localStorage-based) |
| AI Services | DeepSeek + Gemini |

---

## 3. Architecture

### Directory Structure
```
coolpro2026/
├── app/                          # Next.js App Router pages
│   ├── (app)/                   # Authenticated routes group
│   │   ├── dashboard/           # Dashboard page
│   │   ├── learn/               # LMS Academy
│   │   ├── sizing-tool/         # Cooling load calculator
│   │   ├── field-toolkit/       # Field operations
│   │   ├── jobs/                # Job postings & COC requests
│   │   ├── certifications/      # Certification management
│   │   ├── rewards/             # Points & rewards
│   │   ├── safety/              # Safety & accidents
│   │   ├── technician-registry/ # Technician directory
│   │   └── admin/               # Admin panel
│   ├── (auth)/                  # Authentication routes
│   │   └── login/               # Login page
│   ├── verify-technician/       # Public verification
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Landing page
├── components/                   # Reusable UI components
│   ├── layout/                  # Layout components
│   │   ├── Sidebar.tsx          # Main sidebar navigation
│   │   └── Topbar.tsx           # Top navigation bar
│   ├── FieldToolkit.tsx         # Field operations component
│   ├── SizingTool.tsx           # Cooling load calculator
│   ├── LMS.tsx                  # Learning management system
│   ├── OccupationalAccidentSection.tsx  # Safety reporting
│   ├── FloatingVoiceButton.tsx  # Voice AI button
│   ├── RewardsHub.tsx            # Rewards dashboard
│   └── ComplianceDashboard.tsx  # Compliance tracking
├── lib/                         # Core utilities
│   ├── auth.tsx                 # Authentication (mock)
│   ├── nav.ts                   # Navigation configuration
│   ├── roles.ts                 # Role definitions
│   ├── pwa.ts                   # PWA configuration
│   └── utils.ts                 # Utility functions
├── types/                       # TypeScript type definitions
│   └── index.ts                 # All type definitions
├── constants/                   # App constants
│   ├── jobs.ts                  # Job-related constants
│   └── registry.ts              # Registry constants
├── services/                    # External service integrations
│   ├── deepseek.ts              # DeepSeek AI service
│   └── gemini.ts                # Gemini AI service (mock)
└── public/                      # Static assets
```

---

## 4. Page Structure

### Public Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Landing Page | Public marketing page with 10+ sections |
| `/login` | Login Page | Demo login with role selection |

### Authenticated Pages (Dashboard Group)

| Route | Component | Features |
|-------|-----------|-----------|
| `/dashboard` | Dashboard | KPI cards, recent jobs, accident section |
| `/learn` | LMS Academy | Course listing, progress tracking |
| `/sizing-tool` | Sizing Tool | 4-step wizard, calculations, PDF export |
| `/field-toolkit` | Field Toolkit | Installation management, COC generation |
| `/jobs` | Job Postings | Browse and manage jobs |
| `/jobs/request-coc` | COC Request | Request Certificate of Conformity |
| `/certifications` | Certifications | View and manage certifications |
| `/rewards` | Rewards | Points balance, redemption |
| `/safety` | Safety | Occupational accident reporting |
| `/technician-registry` | Registry | Technician directory |
| `/technician-registry/[id]` | Technician Detail | Individual technician profile |
| `/technician-registry/add` | Add Technician | Add new technician |
| `/technician-registry/manage` | Manage | Admin management |
| `/admin` | Admin Panel | Program administration |

---

## 5. Component Architecture

### Layout Components

#### Sidebar (components/layout/Sidebar.tsx)
- Responsive navigation sidebar
- Role-based menu filtering
- Collapsible on mobile
- Logo and branding

#### Topbar (components/layout/Topbar.tsx)
- Sticky header
- Sync status indicator
- User menu dropdown

### Core Feature Components

#### FieldToolkit (components/FieldToolkit.tsx) - 39KB
- Tabbed interface (Jobs, COC, Logs)
- Installation CRUD operations
- COC Certificate PDF generation
- Refrigerant log management
- Offline data handling

#### SizingTool (components/SizingTool.tsx) - 27KB
- 4-step wizard (Job Type → Dimensions → Temperatures → Results)
- Cooling load calculations
- AI verification (mock)
- PDF technical report generation

#### LMS (components/LMS.tsx)
- Course grid display
- Progress tracking
- Module count display

#### OccupationalAccidentSection (components/OccupationalAccidentSection.tsx) - 27KB
- Accident reporting form
- PDF report generation
- Witness information

#### FloatingVoiceButton (components/FloatingVoiceButton.tsx)
- Voice AI interaction button
- Mock implementation

---

## 6. Data Models

### UserSession
```typescript
interface UserSession {
    id: string;
    name: string;
    email: string;
    role: 'technician' | 'trainer' | 'vendor' | 'org_admin' | 'program_admin';
    region: string;
    isDemo: boolean;
}
```

### Installation (Field Toolkit)
```typescript
interface Installation {
    id: string;
    clientName: string;
    location: string;
    jobType: JobType;
    floorSpace?: number;
    jobDetails: string;
    technicianId: string;
    technicianName: string;
    installationDate: string;
    cocApproved?: boolean;
    cocApprovalDate?: string;
}
```

### Course (LMS)
```typescript
interface Course {
    id: string;
    title: string;
    description: string;
    modules: number;
    progress: number;
    level: 'BASIC' | 'ADVANCED' | 'GWP_SPECIALIST';
    isDownloaded: boolean;
}
```

### JobType
```typescript
type JobType = 'C40_FREEZER' | 'C60_FREEZER' | 'C90_FREEZER' | 'COLD_ROOM' | 'FREEZER_ROOM';
```

---

## 7. Color Scheme (HEVACRAZ Brand)

| Color | Hex | Usage |
|-------|-----|-------|
| Primary | #2C2420 | Rich charcoal - main text, headers |
| Secondary | #D4A574 | Warm terracotta - accents |
| Accent | #5A7D5A | Sage green - success states, CTAs |
| Highlight | #FF6B35 | Electric orange - primary CTAs |
| Background | #FDF8F3 | Warm off-white - page background |

---

## 8. Navigation Structure

### Main Navigation Items
| Label | Path | Icon | Roles |
|-------|------|------|-------|
| Dashboard | /dashboard | LayoutDashboard | All |
| Learn | /learn | BookOpen | technician, trainer, program_admin |
| Sizing Tool | /sizing-tool | Calculator | technician, program_admin |
| Field Toolkit | /field-toolkit | Wrench | technician, org_admin, program_admin |
| Jobs & Logs | /jobs | ClipboardList | technician, org_admin, program_admin |
| Certifications | /certifications | Award | technician, trainer, program_admin |
| Request COC | /jobs/request-coc | ShieldCheck | technician |
| Rewards | /rewards | Gift | technician, vendor, program_admin |
| Technician Registry | /technician-registry | Users | program_admin, org_admin, trainer |
| Harare Techs | /technician-registry?province=Harare | MapPin | All |
| Admin | /admin | ShieldCheck | program_admin |

---

## 9. Features Summary

### ✅ Implemented
1. Landing page with 10+ sections
2. Authentication with role selection (demo)
3. Dashboard with KPIs
4. Field Toolkit (installations, COC, logs)
5. Sizing Tool with calculations
6. LMS with course listings
7. Technician Registry
8. Safety/Occupational Accident reporting
9. Rewards system
10. Certifications page
11. PDF generation for COC and reports
12. Responsive design
13. Offline banner
14. Voice AI button (mock)

### 🚧 Partial/Mock
1. AI verification (mock responses)
2. Voice AI (mock)
3. Real authentication (demo only)
4. Database (localStorage only)

---

## 10. Deployment

### Vercel Configuration
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Node Version: 18.x+

### Environment Variables Needed (Future)
```
NEXTAUTH_SECRET=
NEXTAUTH_URL=
DATABASE_URL=
DEEPSEEK_API_KEY=
GEMINI_API_KEY=
```

---

## 11. Future Enhancements

### Phase 2
- [ ] Real authentication (NextAuth.js)
- [ ] PostgreSQL database
- [ ] API routes for CRUD
- [ ] Email notifications

### Phase 3
- [ ] Real AI integration
- [ ] Mobile app (React Native)
- [ ] Offline sync
- [ ] Push notifications

---

*Generated: 2026-03-03*
*Version: 1.0.0*
*Project: HEVACRAZ - HVAC-R Association Zimbabwe*
