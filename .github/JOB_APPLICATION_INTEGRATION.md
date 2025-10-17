# Job Application Database Integration

## Overview
Added complete documentation for the Job Application system, which uses a separate Google Sheets database (CLS_AppSheet_Application_Form) for the active application pipeline.

## What Was Added

### 1. CLS_AppSheet_Application_Form Schema
**Location**: `.github/DATABASE_SCHEMA.md`

#### Applications Sheet (7 rows × 31 columns)
Complete applicant intake with comprehensive fields:
- **Personal**: first_name, last_name, email, phone, city, state, dob
- **Position**: role_applied, experience_level, shift_preference, site
- **Authorization**: work_authorization, driver_license
- **Preferences**: language_preference, english_proficiency, ui_lang
- **Logistics**: transportation, overtime_ok, travel_ok, start_date
- **Safety**: emergency_contact_name, emergency_contact_relation, emergency_contact_phone
- **Background**: equipment_experience, certifications, referral_source
- **Workflow**: status (new/contacted/interview/hired/rejected), notes, Send to Contacts

#### Status_History Sheet (19 rows × 7 columns)
Complete audit trail of application status changes:
- Tracks who changed what and when
- Links to disqualification reasons
- Maintains compliance records

#### Disqualification_Reasons Sheet (5 rows × 2 columns)
Standardized rejection reason codes:
- NO_SHOW - Did not attend interview
- NO_AUTHORIZATION - No work authorization
- FAILED_SCREENING - Failed background check
- DECLINED_OFFER - Applicant declined offer

### 2. Database Integration Documentation
**Location**: `.github/DATABASE_SCHEMA.md` (new section)

#### Application Flow Diagram
```
AppSheet Form → CLS_AppSheet_Application_Form (7 active)
                        ↓
              JobApplication Apps Script
                        ↓
        CLS_Hub_Backend.Applications (95 historical)
                        ↓
              Workers sheet (if hired)
```

#### Key Differences Table
- **AppSheet**: Active pipeline (7 rows), full intake (31 columns), audit trail
- **Hub Backend**: Historical archive (95 rows), subset data (25 columns), processing flags

#### Field Mapping
Complete mapping between the two systems showing:
- Direct field mappings (application_id → ApplicationID)
- AppSheet-only fields (city, state, emergency contacts)
- Hub Backend-only fields (WalkthroughDate, Processed?, Trigger Webhook)

### 3. Updated Copilot Instructions
**Location**: `.github/copilot-instructions.md`

#### External Dependencies Section
Added:
- **Job Application Web App URL**: `https://script.google.com/macros/s/AKfycbxdD80YrBa6wa271_TtCpwWnQJbQfeRjZVe0iRkAdO36D_t3E44foSn11IdCEq1iJ6OSg/exec`
- **CLS_AppSheet_Application_Form Spreadsheet**: `14dO3qB3Oa-N7eX9EcBTStydvyJaHprgi3_dQJsTvRx4` (3 sheets)

#### Multi-Repository Structure
Updated JobApplication project description:
- Added "(deployed web app, uses CLS_AppSheet_Application_Form)"
- Clarifies it's a separate deployed web app with its own database

## Key Insights

### Architecture Pattern: Single Active Database

Carolina Lumpers uses **CLS_AppSheet_Application_Form** as the single source of truth for job applications:

1. **Active Pipeline** (CLS_AppSheet_Application_Form)
   - Small, focused dataset (7 active applicants)
   - Rich intake form (31 fields)
   - AppSheet mobile interface for admins
   - Status history audit trail
   - Real-time applicant tracking
   - Direct hire to Workers sheet

2. **Historical Archive** (CLS_Hub_Backend.Applications) ⚠️ **DEPRECATED**
   - Large historical dataset (95 total applications)
   - No longer receiving new data
   - Kept for historical reference only
   - Use CLS_AppSheet_Application_Form for all new applications

### Why Single Database Now?
1. **Simplification**: One database to manage applications
2. **Performance**: AppSheet optimized for smaller, active datasets
3. **Compliance**: Complete audit trail in Status_History
4. **Direct Integration**: Hired applicants go straight to Workers sheet
5. **No Sync Needed**: Eliminates sync complexity and potential data loss

### Integration Points
- **Trigger**: Status = "hired"
- **Direction**: CLS_AppSheet_Application_Form → CLS_Hub_Backend.Workers (direct)
- **Processor**: JobApplication Apps Script project
- **Frequency**: Event-driven (status change to "hired")
- **Note**: CLS_Hub_Backend.Applications is deprecated and no longer part of the flow

## Files Modified

1. **`.github/DATABASE_SCHEMA.md`**
   - Added CLS_AppSheet_Application_Form section (3 sheets documented)
   - Added Database Integration section
   - Added Application Flow diagram
   - Added Field Mapping table

2. **`.github/copilot-instructions.md`**
   - Updated External Dependencies with Job Application web app URL
   - Updated Multi-Repository Structure with deployment details
   - Added CLS_AppSheet_Application_Form spreadsheet ID

## Statistics

### CLS_AppSheet_Application_Form
- **Total Sheets**: 3
- **Total Rows**: 31 (7 + 19 + 5)
- **Total Columns**: 40 (31 + 7 + 2)
- **Purpose**: Active application pipeline with audit trail

### Integration Points
- **2 Application Sheets**: AppSheet (source) → Hub Backend (target)
- **31 → 25 Fields**: AppSheet has 6 more fields than Hub Backend
- **Field Mapping**: 12 direct mappings documented
- **Sync Direction**: One-way (AppSheet → Hub Backend)

## Next Steps (Future Work)

1. ✅ Document both application databases
2. ✅ Map field relationships
3. ⏸️ Document JobApplication Apps Script sync logic
4. ⏸️ Add Status_History logging to centralized logging system
5. ⏸️ Create applicant status change webhooks documentation
6. ⏸️ Document AppSheet mobile app configuration

---

**Created**: October 17, 2025  
**Purpose**: Document Job Application dual-database architecture  
**Impact**: AI agents now understand complete application workflow and data flow
