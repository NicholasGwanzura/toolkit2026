# HEVACRAZ App - Data Flows Documentation

> **Historical document (2026-03-03).** It describes the original localStorage mock architecture,
> which no longer exists: the app is now database-backed with Drizzle/PostgreSQL, real
> credential auth, live AI services, migrations, and scheduled jobs. For current architecture see
> `README.md` and `SONNET_ALIGNMENT.md`. Do not use this file as a source of truth.

## Overview

The HEVACRAZ (HVAC-R Association of Zimbabwe) application is a Next.js 16 web application that provides a digital toolkit for HVAC-R technicians. Currently, it uses a **client-side mock data architecture** with localStorage for persistence.

---

## 1. Authentication Flow

### Login Process
```
User visits /login
    ↓
Selects role (Technician, Trainer, Vendor, Org Admin, Program Admin)
    ↓
Selects region (Harare, Bulawayo, Mutare, Gweru, Masvingo, Other)
    ↓
Clicks "Demo Access" button
    ↓
login(role, region) function is called
    ↓
Creates UserSession object from MOCK_USERS
    ↓
Stores session in localStorage: 'coolpro_session'
    ↓
Sets cookies: 'coolpro_auth', 'coolpro_role'
    ↓
Redirects to /dashboard
```

### Session Management
- **Storage**: localStorage key `'coolpro_session'`
- **Session Object Structure**:
```typescript
interface UserSession {
    id: string;           // e.g., 'tech-001'
    name: string;         // e.g., 'Demo Technician'
    email: string;        // e.g., 'tech@coolpro.demo'
    role: 'technician' | 'trainer' | 'vendor' | 'org_admin' | 'program_admin';
    region: string;       // e.g., 'Harare'
    isDemo: boolean;      // true for demo accounts
}
```

### Logout Flow
```
User clicks Sign Out
    ↓
logout() function is called
    ↓
Removes 'coolpro_session' from localStorage
    ↓
Clears authentication cookies
    ↓
Redirects to /login
```

### Role-Based Access Control (RBAC)
- Each navigation item has `roles` array
- Sidebar filters items based on user's role
- Roles: technician, trainer, vendor, org_admin, program_admin, regulator

---

## 2. Data Storage

### LocalStorage Keys

| Key | Description | Data Type |
|-----|-------------|------------|
| `coolpro_session` | Current user session | UserSession JSON |
| `field_toolkit_installations` | Saved installation records | Installation[] |
| `refrigerant_logs` | Refrigerant usage logs | RefrigerantLog[] |
| `offline_queue` | Pending sync items | SyncItem[] |

### Data Models

#### Installation (Field Toolkit)
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

#### RefrigerantLog (Field Toolkit)
```typescript
interface RefrigerantLog {
    id: string;
    technicianId: string;
    technicianName: string;
    clientName: string;
    location: string;
    refrigerantType: string;
    amount: number;
    unit: 'kg' | 'lbs';
    date: string;
    isOffline?: boolean;
}
```

#### OccupationalAccident
```typescript
interface OccupationalAccident {
    id: string;
    technicianId: string;
    technicianName: string;
    date: string;
    location: string;
    description: string;
    injuries: string;
    firstAidGiven: string;
    reportedTo: string;
    witnesses: string;
}
```

---

## 3. Page Data Flows

### Dashboard (/dashboard)
```
User visits /dashboard
    ↓
getSession() retrieves user from localStorage
    ↓
Determines role (technician vs admin)
    ↓
Renders role-specific KPI cards:
    - Technician: Jobs Completed, Pending COCs, Rewards Points, Certifications
    - Admin: Total Technicians, Active Jobs, COCs Pending, Compliance Rate
    ↓
Fetches recent jobs from mock data
    ↓
Displays Occupational Accident Section
```

### Field Toolkit (/field-toolkit)
```
User visits /field-toolkit
    ↓
Loads installations from localStorage
    ↓
Allows CRUD operations:
    - Create: Add new installation → localStorage
    - Read: Display saved installations
    - Update: Edit installation → localStorage
    - Delete: Remove installation
    ↓
Generate COC Certificate → jsPDF download
    ↓
Refrigerant Log management → localStorage
```

### Sizing Tool (/sizing-tool)
```
User visits /sizing-tool
    ↓
Wizard Step 1: Select job type (C40/C60/C90 Freezer, Cold Room, Freezer Room)
    ↓
Wizard Step 2: Enter dimensions & insulation
    ↓
Wizard Step 3: Enter ambient & target temps
    ↓
Wizard Step 4: Calculate cooling load
    ↓
Display Results:
    - Total cooling load (kW)
    - Product load
    - Infiltration load
    - Wall/ceiling/floor loads
    ↓
AI Verification: Calls DeepSeek service
    ↓
Download Technical Sheet → jsPDF
```

### Technician Registry (/technician-registry)
```
User visits /technician-registry
    ↓
Filter by:
    - Province/Region
    - Certification Status
    - Rating
    ↓
Search by name or ID
    ↓
View technician details:
    - Contact info
    - Certifications
    - Job history
    - Ratings
    ↓
Add/Edit technician (admin only)
```

### Safety Page (/safety)
```
User visits /safety
    ↓
Occupational Accident Reporting Form
    ↓
Fields:
    - Date & Location
    - Incident description
    - Injuries sustained
    - First aid given
    - Supervisor notified
    - Witness information
    ↓
Submit → Generate PDF Report
    ↓
Save to localStorage (optional)
```

---

## 4. External Services

### AI Services (Mock Implementation)

#### DeepSeek Service
- Endpoint: `/services/deepseek.ts`
- Purpose: AI-powered sizing verification
- Status: **Live** when `DEEPSEEK_API_KEY` is configured

#### Gemini Service  
- Endpoint: `/services/gemini.ts`
- Purpose: Voice AI integration
- Status: **Mock response** (not connected to actual Gemini API)

### PDF Generation
- Library: jsPDF
- Used in:
  - COC Certificate (Field Toolkit)
  - Technical Sizing Report (Sizing Tool)
  - Occupational Accident Report (Safety)

---

## 5. State Management

### React Context
- **AuthContext**: User session & authentication state
- Wraps entire application in `app/layout.tsx`

### Local Component State
- useState for form inputs
- useState for UI toggles (sidebar, modals)
- useState for wizard steps

### Persistence
- All data stored in localStorage
- No backend database
- Offline-first approach with sync queue concept

---

## 6. Future Backend Architecture (Recommended)

When implementing a real backend, the data flow would change to:

```
Client (React)
    ↓ HTTP/REST
API Gateway / Next.js API Routes
    ↓
Database (PostgreSQL/MongoDB)
    ↓
Authentication (NextAuth.js/Clerk)
    ↓
File Storage (S3 for PDFs)
    ↓
Email Service (for notifications)
```

### Recommended API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Authenticate user |
| POST | /api/auth/logout | End session |
| GET | /api/users/:id | Get user profile |
| PUT | /api/users/:id | Update profile |
| GET | /api/installations | List installations |
| POST | /api/installations | Create installation |
| PUT | /api/installations/:id | Update installation |
| DELETE | /api/installations/:id | Delete installation |
| GET | /api/technicians | List technicians |
| POST | /api/technicians | Add technician |
| GET | /api/certifications | List certifications |
| POST | /api/sizing/calculate | Calculate cooling load |
| POST | /api/ai/verify | AI verification |

---

## 7. Current Limitations

1. **No Real Authentication**: Uses mock users from localStorage
2. **No Database**: All data lost on browser cache clear
3. **No Real AI**: Mock responses only
4. **No Email**: Notifications not implemented
5. **No Payment Processing**: Rewards system is simulation only
6. **Offline Limitations**: Sync queue concept not fully implemented

---

*Last Updated: 2026-03-03*
*Version: 1.0.0*
