# COOLPRO Systems Capabilities

## Overview
COOLPRO is a comprehensive digital toolkit specifically for **Refrigeration and Air Conditioning (HVAC-R)** technicians in Zimbabwe. The platform provides field service management, sizing calculations, compliance tracking, technician verification, and certification management - all tailored for HVAC-R professionals.

---

## 1. Sizing Tool

### Job Types Supported
- **C40 Freezer** - Standard commercial freezer (-20°C)
- **C60 Freezer** - Deep freeze (-25°C)
- **C90 Freezer** - Blast freezer (-35°C)
- **Freezer Room** - Cold room for frozen storage (-18°C)
- **Cold Room** - Ambient cold storage (+2°C)

### Features
- Room dimension input (Width, Length, Height)
- Insulation type selection:
  - Polyurethane
  - Polystyrene
  - Mineral Wool
- Adjustable insulation thickness (50mm - 300mm)
- Operating conditions:
  - **Ambient Temperature** - External temperature (°C)
  - **Target Temperature** - Desired internal temperature (°C)
  - **Product Temperature** - Starting temperature of products (°C)
  - **Pull-down Time** - Time to reach target temperature (hours)
- Product load calculations

### Calculations
- Transmission load (heat gain through walls)
- Product load (cooling products)
- Infiltration load (air changes)
- Job type-specific multipliers for accurate sizing
- Safety margins (15-25% based on job type)

### Outputs
- Total system load (kW)
- Individual load breakdown
- Recommended refrigerants (R-290, R-744 CO2)
- AI-powered engineering verification
- PDF technical report generation

---

## 2. Field Toolkit

### Installation Management
- New installation tracking
- Client name and job details capture
- Floor space recording (m²)
- Job type classification
- Image upload for documentation

### Commissioning Checklist
- Nitrogen inert gas brazing verification
- Pressure testing with dry nitrogen
- Evacuation procedures
- System charging verification

### Refrigerant Logbook
- Gas usage tracking (kg)
- Refrigerant type selection:
  - R-410A
  - R-290 (Propane)
  - R-744 (CO2)
  - R-32
  - R-134a
  - R-404A
- Action types:
  - Charge
  - Recovery
  - Leak Repair
- Client and location tracking
- Job type classification
- PDF log generation

### Certificate of Conformity (COC)
- Request COC after installation
- Supervisor approval workflow
- Certificate generation with:
  - Client details
  - Job type
  - Floor space
  - Installation date
  - Technician information

---

## 3. Technician Registry

### Registration
- Personal information (Name, National ID)
- Contact details (Phone, Email)
- Region and province selection
- District allocation
- Employer information
- Specialization in HVAC-R fields only

### Specializations (Refrigeration & AC Only)
- Refrigeration & Air Conditioning
- HVAC
- Cold Room Installation
- Commercial Refrigeration
- Domestic Refrigeration
- Air Conditioning
- Split System Installation
- Central Air Conditioning
- Refrigerant Handling
- Heat Pump Systems
- Chiller Systems
- Industrial Refrigeration

### Certifications
- Multiple certification tracking
- Issuing body documentation
- Certificate numbers
- Expiry date monitoring
- Status tracking (Valid/Expired/Pending)

### Training Records
- Course completion history
- Training provider tracking
- Duration and dates
- Certificate numbers

### Status Management
- Active, Inactive, Suspended, Pending statuses
- Registration expiry tracking
- Renewal date monitoring

---

## 4. Public Technician Verification

### Verify Technician Page
- Public access page for customers to verify technicians
- Search by registration number
- Shows verified technician details:
  - Name and registration number
  - Region and province
  - Contact information
  - Specialization
  - Certification status
  - Certificate details
- Demo codes for testing

---

## 5. Dashboard (My Stats)

### Role-Based KPIs
**Technician Dashboard:**
- Jobs Completed (Today/Week/Month)
- Pending COCs
- Rewards Points
- Certifications status

**Admin Dashboard:**
- Active Technicians
- Total Jobs (Today/Week/Month)
- Pending Certifications
- Regions Covered
- Top Performers table

### Date Filtering
- Today
- This Week
- This Month

---

## 6. Job Management

### Job Types
- New installations
- Maintenance
- Repair
- COC requests

### Request COC Workflow
- Technician submits job details
- Client information capture
- System specifications
- Image attachments
- Approval workflow
- Certificate generation

---

## 7. Certifications

### Learning Management System (LMS)
- Course modules
- Progress tracking
- Level classification:
  - Basic
  - Advanced
  - GWP Specialist
- Offline download capability

### Compliance Dashboard
- Certification status overview
- Expiry alerts
- Renewal tracking

---

## 8. Rewards & Recognition

### Points System
- Training completion rewards
- Job completion incentives
- Compliance bonuses

### Vendor Partnerships
- Points redemption
- Vendor catalog

---

## 9. Technical Features

### Offline Capability
- Local data storage
- Sync queue management
- Offline banner indicator

### PDF Generation
- Sizing reports
- Refrigerant logs
- COC certificates

### AI Integration
- DeepSeek-powered technical advice
- Compressor sizing recommendations
- Refrigerant alternatives guidance

---

## Supported Refrigerants

| Refrigerant | Type | GWP | Safety Class |
|-------------|------|-----|--------------|
| R-290 | Natural (Propane) | 3 | A3 |
| R-744 | Natural (CO2) | 1 | A1 |
| R-32 | HFC | 675 | A2L |

**Note:** R-410A, R-134a, and R-404A have been removed per SI 49 of 2023 and Kigali Amendment compliance.
| R-404A | HFC | 3922 | A1 |

---

## User Roles

- **Technician** - Field service provider (HVAC-R professional)
- **Admin** - Program/Organization administrator

*(Simplified RBAC - only Technician and Admin roles)*

---

## Technology Stack

- **Frontend**: Next.js 16, React, TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **PDF**: jsPDF
- **AI**: DeepSeek, Gemini
- **Auth**: Custom implementation
- **Database**: Local storage with sync

---

## Data Export

All major features support PDF export:
- Sizing calculations
- Refrigerant logs
- COC certificates
- Technical reports
