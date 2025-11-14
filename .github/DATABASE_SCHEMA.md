# Carolina Lumpers Database Schema

This document covers all Google Sheets databases used by Carolina Lumpers systems.

## CLS_Hub_Backend (Main Database)

**Spreadsheet ID**: `1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk`  
**Spreadsheet Name**: CLS_Hub_Backend  
**Total Sheets**: 22  
**Last Updated**: October 17, 2025

---

## CLS_AppSheet_Application_Form (Job Applications)

**Spreadsheet ID**: `14dO3qB3Oa-N7eX9EcBTStydvyJaHprgi3_dQJsTvRx4`  
**Spreadsheet Name**: CLS_AppSheet_Application_Form  
**Total Sheets**: 3  
**Web App**: `https://script.google.com/macros/s/AKfycbxdD80YrBa6wa271_TtCpwWnQJbQfeRjZVe0iRkAdO36D_t3E44foSn11IdCEq1iJ6OSg/exec`  
**Frontend**: `apply.html` (6-step wizard form)  
**Last Updated**: October 17, 2025

### Applications (7 rows × 31 columns)

Job application submissions with comprehensive applicant information.

| Column | Header                     | Type     | Notes                                      |
| ------ | -------------------------- | -------- | ------------------------------------------ |
| A      | application_id             | String   | Primary key, auto-generated                |
| B      | timestamp                  | DateTime | Submission time                            |
| C      | first_name                 | String   | Applicant first name                       |
| D      | last_name                  | String   | Applicant last name                        |
| E      | email                      | String   | Contact email                              |
| F      | phone                      | String   | Contact phone                              |
| G      | city                       | String   | Applicant city                             |
| H      | state                      | String   | Applicant state                            |
| I      | role_applied               | String   | Position applying for                      |
| J      | experience_level           | String   | Entry, intermediate, experienced           |
| K      | shift_preference           | String   | Morning, afternoon, night, flexible        |
| L      | work_authorization         | String   | US citizen, work visa, etc.                |
| M      | site                       | String   | Preferred work location                    |
| N      | notes                      | String   | Applicant notes/comments                   |
| O      | ui_lang                    | String   | Form language used (en/es/pt)              |
| P      | status                     | String   | new, contacted, interview, hired, rejected |
| Q      | language_preference        | String   | Preferred work language                    |
| R      | english_proficiency        | String   | none, basic, intermediate, fluent          |
| S      | dob                        | Date     | Date of birth                              |
| T      | start_date                 | Date     | Earliest available start                   |
| U      | transportation             | Boolean  | Has reliable transportation                |
| V      | driver_license             | Boolean  | Has valid driver's license                 |
| W      | overtime_ok                | Boolean  | Willing to work overtime                   |
| X      | travel_ok                  | Boolean  | Willing to travel                          |
| Y      | equipment_experience       | String   | Forklift, pallet jack, etc.                |
| Z      | emergency_contact_name     | String   | Emergency contact                          |
| AA     | emergency_contact_relation | String   | Relationship to contact                    |
| AB     | emergency_contact_phone    | String   | Emergency phone                            |
| AC     | referral_source            | String   | How they heard about job                   |
| AD     | certifications             | String   | Relevant certifications                    |
| AE     | Send to Contacts           | Boolean  | Trigger contact sync                       |

**Used By**: JobApplication project (GoogleAppsScripts/JobApplication/)  
**Integration**: Syncs to CLS_Hub_Backend.Applications when status changes

### Status_History (19 rows × 7 columns)

---

## Database Integration

### Application Flow: Frontend → AppSheet → Hub Backend

```
apply.html (Frontend - 6-step wizard)
  ├── Step 1: Personal Information (name, dob, email, phone)
  ├── Step 2: Location & Transportation (city, state, transport, license)
  ├── Step 3: Work Authorization & Start (authorization, start_date)
  ├── Step 4: Job Preferences & Experience (site, shift, experience, equipment)
  ├── Step 5: Emergency Contact (name, relation, phone)
  └── Step 6: Language & Privacy (language_preference, english_proficiency, consent)
        ↓ Submits via fetch() POST to...
        ↓
Job Application Web App
(https://script.google.com/macros/s/AKfycbxdD80YrBa6wa271_TtCpwWnQJbQfeRjZVe0iRkAdO36D_t3E44foSn11IdCEq1iJ6OSg/exec)
        ↓ Writes to...
        ↓
CLS_AppSheet_Application_Form (Job Applications Database)
  └── Applications sheet (status="new")
        ├── Status changes tracked in Status_History
        └── Admin reviews in AppSheet interface
              ↓ Manual status update to "hired"
              ↓
⚠️ LIMITATION: AppSheet UI changes CANNOT trigger Apps Script
              ↓
Manual Worker Creation Required:
  Option 1: Admin manually creates worker in CLS_Hub_Backend.Workers
  Option 2: Use "Send to Contacts" column → triggers sync script
  Option 3: Future: AppSheet webhook → Apps Script endpoint
              ↓
CLS_Hub_Backend (Main Database)
  └── Workers sheet (manually created from hired applicants)

⚠️ DEPRECATED: CLS_Hub_Backend.Applications (95 rows)
   - Historical sheet, no longer actively used
   - New applications go directly to CLS_AppSheet_Application_Form
   - Kept for historical data only
```

### Key Differences Between Application Sheets

| Feature              | CLS_AppSheet_Application_Form | CLS_Hub_Backend.Applications ⚠️ |
| -------------------- | ----------------------------- | ------------------------------- |
| **Status**           | ✅ Active                     | ⚠️ DEPRECATED                   |
| **Purpose**          | Active application pipeline   | Historical record only          |
| **Row Count**        | 7 (current applicants)        | 95 (historical - frozen)        |
| **Columns**          | 31 (comprehensive intake)     | 25 (subset of data)             |
| **Status Tracking**  | Status_History audit trail    | Status field only               |
| **Primary Use**      | AppSheet mobile app           | Not used (legacy)               |
| **Sync Direction**   | N/A                           | No longer syncing               |
| **New Applications** | ✅ All new apps go here       | ❌ No longer written to         |

### Field Mapping (AppSheet → Hub Backend) ⚠️ HISTORICAL

**Note**: This mapping is for historical reference only. CLS_Hub_Backend.Applications is deprecated and no longer receives new data. When hiring from CLS_AppSheet_Application_Form, data goes directly to Workers sheet.

| AppSheet Column     | Hub Backend Column          | Notes              |
| ------------------- | --------------------------- | ------------------ |
| application_id      | ApplicationID               | Primary key match  |
| timestamp           | TimeStamp                   | Submission time    |
| first_name          | First Name                  | Direct map         |
| last_name           | Last Name                   | Direct map         |
| email               | Email                       | Direct map         |
| phone               | Phone                       | Direct map         |
| role_applied        | Role                        | Position applied   |
| experience_level    | Experience                  | Skill level        |
| language_preference | Language                    | Preferred language |
| status              | Status / Application Status | Pipeline stage     |
| notes               | Notes                       | Admin notes        |
| dob                 | DOB                         | Date of birth      |

**Not Synced**: city, state, site, emergency contacts (AppSheet only)  
**Hub Backend Only**: WalkthroughDate, Processed?, Trigger Webhook, Maleale

---

# CLS_Hub_Backend Schema

### Status_History (19 rows × 7 columns)

Tracks all status changes for applications (audit trail).

| Column | Header         | Type     | Notes                               |
| ------ | -------------- | -------- | ----------------------------------- |
| A      | id             | String   | Primary key                         |
| B      | application_id | String   | References Applications             |
| C      | changed_at     | DateTime | When status changed                 |
| D      | from_status    | String   | Previous status                     |
| E      | to_status      | String   | New status                          |
| F      | reason_code    | String   | References Disqualification_Reasons |
| G      | notes          | String   | Change explanation                  |

**Purpose**: Complete audit trail of application pipeline  
**Auto-populated**: By Apps Script when Applications.status changes

### Disqualification_Reasons (5 rows × 2 columns)

Predefined rejection reasons for consistency.

| Column | Header      | Type   | Notes                                           |
| ------ | ----------- | ------ | ----------------------------------------------- |
| A      | reason_code | String | Primary key (e.g., "NO_SHOW")                   |
| B      | label       | String | Display text (e.g., "Did not attend interview") |

**Used By**: Status_History.reason_code lookup  
**Common Codes**: NO_SHOW, NO_AUTHORIZATION, FAILED_SCREENING, DECLINED_OFFER

---

# CLS_Hub_Backend Schema

## Quick Reference

### Core Operations Sheets

1. **ClockIn** - GPS clock-ins (411 rows)
2. **Tasks** - Work assignments (336 rows)
3. **Workers** - Employee records (37 rows)
4. **Clients** - Customer locations (3 rows)

### Financial Sheets

5. **Invoices** - Customer billing (14 rows)
6. **Invoice LineItems** - Detailed charges (340 rows)
7. **Payroll LineItems** - Employee payments (321 rows)
8. **WeeklyFinancials** - Weekly summaries (15 rows)

### Logging & Requests

9. **Activity_Logs** - Centralized logging (22 rows) ⭐ NEW
10. **TimeEditRequests** - Clock-in edit requests (2 rows)
11. **Log** - Legacy logging (673 rows) ⚠️ DEPRECATED
12. **Applications** - Job applications (95 rows) ⚠️ DEPRECATED - Use CLS_AppSheet_Application_Form

### Configuration Sheets

12. **Services** - Billable services (4 rows)
13. **ServiceGroup** - Service categories (3 rows)
14. **ServiceItem** - Task types (26 rows)

---

## Detailed Sheet Structures

### 1. Clients (3 rows × 13 columns)

Primary customer/location database with geofencing coordinates.

| Column | Header             | Type    | Notes                        |
| ------ | ------------------ | ------- | ---------------------------- |
| A      | ClientID           | String  | Primary key (e.g., "CL-001") |
| B      | Client Name        | String  | Company name                 |
| C      | Contact Name       | String  | Primary contact person       |
| D      | Contact Email      | String  | Contact email                |
| E      | Payables Email     | String  | Billing email                |
| F      | Payables Email CC  | String  | CC recipients                |
| G      | Payables Email BCC | String  | BCC recipients               |
| H      | Knickname          | String  | Short name for UI            |
| I      | QBOID              | String  | QuickBooks Online ID         |
| J      | Portal Access      | Boolean | Client portal enabled        |
| K      | JobAddress         | String  | Physical address             |
| L      | Latitude           | Number  | GPS latitude (geofencing)    |
| M      | Longitude          | Number  | GPS longitude (geofencing)   |

**Used By**: Clock-in geofencing, invoice generation, task assignment

---

### 2. Activity_Logs (22 rows × 14 columns) ⭐ NEW

Centralized logging from CLLogger library v1.2.0. Replaces legacy "Log" sheet.

| Column | Header        | Type     | Notes                                     |
| ------ | ------------- | -------- | ----------------------------------------- |
| A      | Log ID        | String   | Format: LOG-{timestamp}-{random}          |
| B      | Timestamp     | DateTime | ISO 8601 format                           |
| C      | Event Type    | String   | CLOCK_IN, LOGIN, GEOFENCE_VIOLATION, etc. |
| D      | Worker ID     | String   | References Workers.WorkerID               |
| E      | Display Name  | String   | Worker full name                          |
| F      | Event Summary | String   | Human-readable description                |
| G      | Device        | String   | Format: "DeviceType - Browser"            |
| H      | Site          | String   | Client location name                      |
| I      | Distance      | Number   | Distance from geofence (miles)            |
| J      | Latitude      | Number   | GPS latitude                              |
| K      | Longitude     | Number   | GPS longitude                             |
| L      | Status        | String   | SUCCESS, PENDING, ERROR, etc.             |
| M      | Project       | String   | TIME_TRACKING, PAYROLL, INVOICING, etc.   |
| N      | Details       | JSON     | Full event context (stringified)          |

**Logged By**: TT_LOGGER wrapper (CLS_EmployeeLogin_Logger.js)  
**Key Events**: Clock-ins, logins, geofence violations, time edits, rate limits, late arrivals

---

### 3. TimeEditRequests (2 rows × 10 columns)

Stores employee requests to modify clock-in times.

| Column | Header            | Type     | Notes                        |
| ------ | ----------------- | -------- | ---------------------------- |
| A      | RequestID         | String   | Auto-generated unique ID     |
| B      | EmployeeID        | String   | References Workers.WorkerID  |
| C      | RecordID          | String   | References ClockIn.ClockinID |
| D      | OriginalTime      | DateTime | Current clock-in time        |
| E      | RequestedTime     | DateTime | Desired clock-in time        |
| F      | RequestedDateTime | DateTime | Parsed from RequestedTime    |
| G      | Reason            | String   | Employee explanation         |
| H      | Status            | String   | pending, approved, denied    |
| I      | SubmittedAt       | DateTime | Request submission time      |
| J      | ReviewedAt        | DateTime | Admin review time            |

**Workflow**: Employee submits → Admin reviews → ClockIn.EditStatus updated  
**Logged In**: Activity_Logs (TIME_EDIT_REQUEST events)

---

### 4. Services (4 rows × 11 columns)

Billable services with rates and client associations.

| Column | Header               | Type    | Notes                       |
| ------ | -------------------- | ------- | --------------------------- |
| A      | Service ID           | String  | Primary key                 |
| B      | Service Name         | String  | Display name                |
| C      | ClientID             | String  | References Clients.ClientID |
| D      | Rate Type            | String  | hourly, flat, per_unit      |
| E      | Service Invoice Rate | Number  | Customer billing rate       |
| F      | Service Payout Rate  | Number  | Employee payment rate       |
| G      | ServiceGroupID       | String  | References ServiceGroup     |
| H      | Sorting Order        | Number  | Display order               |
| I      | Description          | String  | Service details             |
| J      | Image                | URL     | Service icon/photo          |
| K      | Active               | Boolean | Enabled for billing         |

---

### 5. Invoices (14 rows × 9 columns)

Customer invoice headers.

| Column | Header      | Type     | Notes                |
| ------ | ----------- | -------- | -------------------- |
| A      | Invoice#    | String   | Primary key          |
| B      | Customer    | String   | Client name          |
| C      | Date        | Date     | Invoice date         |
| D      | Due Date    | Date     | Payment due date     |
| E      | Amount      | Number   | Total invoice amount |
| F      | Status      | String   | draft, sent, paid    |
| G      | Synced?     | Boolean  | Pushed to QuickBooks |
| H      | Push to QBO | Boolean  | Trigger sync         |
| I      | LastUpdated | DateTime | Last modification    |

**Related**: Invoice LineItems (details)

---

### 6. Log (673 rows × 5 columns) ⚠️ DEPRECATED

Legacy logging system. Being replaced by Activity_Logs.

| Column | Header     | Type   | Notes                       |
| ------ | ---------- | ------ | --------------------------- |
| A      | Timestamp  | String | Unstructured timestamp      |
| B      | Event Type | String | LoginAttempt, ClockIn, etc. |
| C      | Data       | JSON   | Event details (stringified) |
| D      | (Empty)    | -      | Unused                      |
| E      | (Empty)    | -      | Unused                      |

**Migration Status**: All new logging goes to Activity_Logs via TT_LOGGER  
**Retention**: Keep for historical data only

---

### 7. ServiceGroup (3 rows × 4 columns)

Service category groupings.

| Column | Header                  | Type   | Notes                |
| ------ | ----------------------- | ------ | -------------------- |
| A      | ServiceGroupID          | String | Primary key          |
| B      | ServiceGroupName        | String | Category name        |
| C      | ServiceGroupDescription | String | Category description |
| D      | ClientID                | String | Client association   |

---

### 8. Invoice LineItems (340 rows × 17 columns)

Detailed billing line items for invoices.

| Column | Header               | Type     | Notes               |
| ------ | -------------------- | -------- | ------------------- |
| A      | LineItemID           | String   | Primary key         |
| B      | Invoice#             | String   | References Invoices |
| C      | Customer             | String   | Client name         |
| D      | Week Period          | String   | Date range          |
| E      | DueDate              | Date     | Payment due         |
| F      | Date                 | Date     | Service date        |
| G      | Item                 | String   | Service name        |
| H      | LineItemDetail       | String   | Description         |
| I      | Qty                  | Number   | Quantity/hours      |
| J      | Invoice Amount       | Number   | Line total          |
| K      | ClientID             | String   | References Clients  |
| L      | ServiceID            | String   | References Services |
| M      | TaskID               | String   | References Tasks    |
| N      | Worker Name          | String   | Employee assigned   |
| O      | Last Update          | DateTime | Last modified       |
| P      | Start Time (Sorting) | DateTime | For ordering        |
| Q      | Synced?              | Boolean  | Pushed to QBO       |

---

### 9. Tasks (336 rows × 27 columns)

Work assignments and time tracking.

| Column | Header                | Type     | Notes                      |
| ------ | --------------------- | -------- | -------------------------- |
| A      | TaskID                | String   | Primary key                |
| B      | Task Label            | String   | Display name               |
| C      | Date                  | Date     | Work date                  |
| D      | Client ID             | String   | References Clients         |
| E      | Service ID            | String   | References Services        |
| F      | Container # / Project | String   | Job identifier             |
| G      | Units (Qty)           | Number   | Items processed            |
| H      | Unit Type             | String   | pallets, boxes, etc.       |
| I      | Categories            | String   | Task tags                  |
| J      | Start Time            | DateTime | Shift start                |
| K      | End Time              | DateTime | Shift end                  |
| L      | Break (Minutes)       | Number   | Unpaid break time          |
| M      | Status                | String   | scheduled, completed, etc. |
| N      | Billable              | Boolean  | Invoice this task          |
| O      | Worker                | String   | Employee assigned          |
| P      | ServiceItemsID        | String   | References ServiceItem     |
| Q      | WorkerIndex           | Number   | Multi-worker order         |
| R      | Bonus                 | Number   | Additional pay             |
| S      | LastUpdated           | DateTime | Last modified              |
| T      | Image                 | URL      | Job photo                  |
| U      | Week Period           | String   | Date range                 |
| V      | BatchClockinID        | String   | Bulk clock-in ref          |
| W      | ChangeTimestamp       | DateTime | Modification time          |
| X      | RegularHours          | Number   | Non-OT hours               |
| Y      | OvertimeHours         | Number   | OT hours                   |
| Z      | Total Week Hours      | Number   | Cumulative hours           |
| AA     | Task Duration (Hours) | Number   | This task hours            |

**Key Calculations**: Overtime calculated based on Total Week Hours  
**Integration**: Linked to ClockIn via approval workflow

---

### 10. Payroll LineItems (321 rows × 15 columns)

Employee payment records.

| Column | Header         | Type     | Notes               |
| ------ | -------------- | -------- | ------------------- |
| A      | LineItemID     | String   | Primary key         |
| B      | Date           | Date     | Work date           |
| C      | WorkerID       | String   | References Workers  |
| D      | ClientID       | String   | References Clients  |
| E      | ServiceID      | String   | References Services |
| F      | TaskID         | String   | References Tasks    |
| G      | Worker Name    | String   | Employee name       |
| H      | LineItemDetail | String   | Description         |
| I      | Qty            | Number   | Hours/units         |
| J      | Check Amount   | Number   | Payment amount      |
| K      | Check #        | String   | Check number        |
| L      | Week Period    | String   | Date range          |
| M      | Last Update    | DateTime | Last modified       |
| N      | Start Time     | DateTime | Shift start         |
| O      | Run Payroll    | Boolean  | Include in payroll  |

---

### 11. WeeklyFinancials (15 rows × 5 columns)

Weekly profit/loss summaries.

| Column | Header             | Type   | Notes         |
| ------ | ------------------ | ------ | ------------- |
| A      | WeeklyFinancialsID | String | Primary key   |
| B      | Week Period        | String | Date range    |
| C      | Income             | Number | Total revenue |
| D      | Expenses           | Number | Total costs   |
| E      | Net Income         | Number | Profit/loss   |

---

### 12. ClockIn (411 rows × 12 columns)

GPS-based employee clock-ins.

| Column | Header           | Type     | Notes                                |
| ------ | ---------------- | -------- | ------------------------------------ |
| A      | ClockinID        | String   | Primary key                          |
| B      | WorkerID         | String   | References Workers                   |
| C      | Date             | Date     | Clock-in date                        |
| D      | Time             | DateTime | Clock-in time                        |
| E      | Notes            | String   | Employee notes                       |
| F      | TaskID           | String   | Approved task ref                    |
| G      | Approve to Tasks | Boolean  | Convert to task                      |
| H      | Latitude         | Number   | GPS latitude                         |
| I      | Longitude        | Number   | GPS longitude (note space in header) |
| J      | Needs Processing | Boolean  | Admin review needed                  |
| K      | Nearest Client   | String   | Matched client                       |
| L      | Distance (mi)    | Number   | Distance from client                 |

**Geofencing**: GEOFENCE_RADIUS_MI = 0.3 miles (CLS_EmployeeLogin_Config.js)  
**Logged In**: Activity_Logs (CLOCK_IN events with device info)

---

### 13. Batch Clockin (24 rows × 8 columns)

Bulk clock-in entries for multiple workers.

| Column | Header         | Type     | Notes                   |
| ------ | -------------- | -------- | ----------------------- |
| A      | batchClockInID | String   | Primary key             |
| B      | Names          | String   | Comma-separated workers |
| C      | Date           | Date     | Work date               |
| D      | Start Time     | DateTime | Shift start             |
| E      | End Time       | DateTime | Shift end               |
| F      | Lunch          | Number   | Break minutes           |
| G      | WorkerIndex    | String   | Worker IDs              |
| H      | Send to Task   | Boolean  | Create tasks            |

---

### 14. Workers (37 rows × 22 columns)

Employee master records.

| Column | Header           | Type    | Notes                        |
| ------ | ---------------- | ------- | ---------------------------- |
| A      | WorkerID         | String  | Primary key (e.g., "CLS001") |
| B      | Employee ID      | String  | External employee ID         |
| C      | First Name       | String  | Given name                   |
| D      | Last Name        | String  | Surname                      |
| E      | Email            | String  | Login email                  |
| F      | Phone            | String  | Contact number               |
| G      | Role             | String  | Admin, Supervisor, Worker    |
| H      | ServiceItem      | String  | Skill set                    |
| I      | Hourly Rate      | Number  | Base pay rate                |
| J      | Flat Rate Bonus  | Number  | Fixed bonus                  |
| K      | Availability     | String  | Schedule preferences         |
| L      | App Access       | Boolean | Mobile login enabled         |
| M      | ApplicationID    | String  | References Applications      |
| N      | Primary Language | String  | en, es, pt                   |
| O      | Work History     | String  | Employment notes             |
| P      | Photo            | URL     | Profile photo                |
| Q      | Docs             | URL     | Document storage             |
| R      | Column 1         | -       | Unused                       |
| S      | Display Name     | String  | Full name for UI             |
| T      | QBOID            | String  | QuickBooks ID                |
| U      | Send Report      | Boolean | Email reports                |
| V      | PasswordHash     | String  | bcrypt hash (10 rounds)      |

**Authentication**: Email + PasswordHash (bcrypt)  
**Roles**: Admin (full access), Lead (view others), Worker (own data only)

---

### 15. Quote Requests (4 rows × 36 columns)

New customer quote submissions.

| Column | Header    | Notes                                             |
| ------ | --------- | ------------------------------------------------- |
| A-AJ   | 36 fields | Company info, services, billing, facility details |

**Key Fields**: Company, Contact, Email, Services, Frequency, Start Date, Address

---

### 16. Appointments (4 rows × 12 columns)

Calendar scheduling integration.

| Column | Header              | Type     | Notes             |
| ------ | ------------------- | -------- | ----------------- |
| A      | AppointmentID       | String   | Primary key       |
| B      | Summary             | String   | Event title       |
| C      | Location            | String   | Meeting location  |
| D      | Description         | String   | Event details     |
| E      | Start DateTime      | DateTime | Start time        |
| F      | End DateTime        | DateTime | End time          |
| G      | Attendees           | String   | Email list        |
| H      | Reminders (Default) | Boolean  | Use default       |
| I      | Custom Reminders    | String   | Custom settings   |
| J      | Recurrence          | String   | Repeat rules      |
| K      | Color ID            | String   | References Colors |
| L      | Visibility          | String   | public, private   |

---

### 17. Colors (12 rows × 3 columns)

Calendar color scheme.

| Column | Header            | Type   |
| ------ | ----------------- | ------ |
| A      | Color ID          | String |
| B      | Color Description | String |
| C      | Hex Code          | String |

---

### 18. Reminders (4 rows × 6 columns)

Appointment notification settings.

| Column | Header                  | Type   | Notes                   |
| ------ | ----------------------- | ------ | ----------------------- |
| A      | ReminderID              | String | Primary key             |
| B      | Event                   | String | Event name              |
| C      | AppointmentID           | String | References Appointments |
| D      | Method                  | String | email, sms, popup       |
| E      | Reminder Time (Minutes) | Number | Minutes before          |
| F      | Reminder Label          | String | Description             |

---

### 19. Compliance (2 rows × 36 columns)

Employee documentation and I-9 verification.

**Key Sections**:

- Employee Info (Name, ID, Position, Hire Date, Status)
- Document Types (Type A, B, C with numbers, expiration, uploads)
- Tax Forms (W-4, W-9, I-9)
- E-Verify Status
- Training & Handbook Acknowledgment
- Missing Documents Tracking

---

### 20. Applications (95 rows × 25 columns) ⚠️ DEPRECATED

Job applications from website. **This sheet is deprecated - all new applications go to CLS_AppSheet_Application_Form.**

| Column | Header                       | Type         | Notes                        |
| ------ | ---------------------------- | ------------ | ---------------------------- |
| A      | ApplicationID                | String       | Primary key                  |
| B      | TimeStamp                    | DateTime     | Submission time              |
| C-F    | Name, Email, Phone           | Contact info |
| G      | Role                         | String       | Position applied for         |
| H      | Experience                   | String       | Work history                 |
| I      | Walkthrough                  | Boolean      | Tour scheduled               |
| J      | Status                       | String       | new, contacted, hired        |
| K      | Language                     | String       | Preferred language           |
| L      | Work Status                  | String       | Authorization status         |
| M      | Notes                        | String       | Admin notes                  |
| N-P    | Language Proficiency         | Scale        | English, Spanish, Portuguese |
| Q      | WalkthroughDate              | Date         | Tour date                    |
| R      | Processed?                   | Boolean      | Reviewed by admin            |
| S      | DOB                          | Date         | Date of birth                |
| T      | Trigger Webhook              | Boolean      | Automation flag              |
| U      | Application Status           | String       | Pipeline stage               |
| V      | Applicant Notes              | String       | Applicant comments           |
| W      | Disqualification Reason      | String       | Rejection reason             |
| X      | Multilingual Application Key | String       | Links to multilingual form   |
| Y      | Maleale                      | -            | Unknown field                |

**Workflow**: ⚠️ DEPRECATED - Applications now go directly to CLS_AppSheet_Application_Form → Workers sheet (if hired). This sheet kept for historical data only.

---

### 21. Multilingual Application (74 rows × 20 columns)

Multilingual job application submissions (English/Spanish/Portuguese).

**Key Fields**: Name, Email, Phone, DOB, Work Experience, Language Proficiency, Work Authorization

---

### 22. ServiceItem (26 rows × 4 columns)

Task type definitions.

| Column | Header               | Type   | Notes          |
| ------ | -------------------- | ------ | -------------- |
| A      | ServiceItemID        | String | Primary key    |
| B      | TaskItemName         | String | Task type name |
| C      | TaskItem Description | String | Task details   |
| D      | ServiceGroup         | String | Category       |

---

## Key Relationships

### Primary Keys

- **Workers.WorkerID** → ClockIn, Tasks, Payroll LineItems, Activity_Logs
- **Clients.ClientID** → Services, Tasks, Invoice LineItems, ClockIn (Nearest Client)
- **Tasks.TaskID** → Invoice LineItems, Payroll LineItems, ClockIn (approved)
- **Services.ServiceID** → Tasks, Invoice LineItems, Payroll LineItems
- **Invoices.Invoice#** → Invoice LineItems

### Foreign Key Patterns

```
Workers (37 rows)
  ├── ClockIn (411 rows) - via WorkerID
  ├── Tasks (336 rows) - via Worker field
  ├── Payroll LineItems (321 rows) - via WorkerID
  └── Activity_Logs (22 rows) - via Worker ID

Clients (3 rows)
  ├── Services (4 rows) - via ClientID
  ├── Tasks (336 rows) - via Client ID
  └── ClockIn (411 rows) - via Nearest Client

Tasks (336 rows)
  ├── Invoice LineItems (340 rows) - via TaskID
  └── Payroll LineItems (321 rows) - via TaskID
```

## Data Flow

### Clock-in Approval Workflow

```
1. Employee clocks in (mobile app)
   → ClockIn sheet (Needs Processing = TRUE)
   → Activity_Logs (CLOCK_IN event)

2. Admin reviews ClockIn sheet
   → Sets Approve to Tasks = TRUE
   → Assigns TaskID

3. Task created in Tasks sheet
   → Billable = TRUE for invoicing
   → Links to Invoice LineItems
   → Links to Payroll LineItems
```

### Time Edit Workflow

```
1. Employee submits edit request (dashboard)
   → TimeEditRequests sheet (Status = pending)
   → Activity_Logs (TIME_EDIT_REQUEST event)
   → Email notification sent to admin

2. Admin reviews request
   → Approves: ClockIn.Time updated, Activity_Logs (TIME_EDIT_APPROVAL)
   → Denies: No change, Activity_Logs (TIME_EDIT_DENIAL)
```

### Invoice Generation Workflow

```
1. Tasks marked Billable = TRUE
   → Invoice LineItems created
   → Grouped by Customer + Week Period

2. Invoice header created
   → Invoices sheet (Status = draft)
   → Amount = SUM(Invoice LineItems.Invoice Amount)

3. Push to QuickBooks
   → Synced? = TRUE
   → Push to QBO = FALSE (reset trigger)
```

## Important Notes

### ⚠️ Column Header Quirks

- **ClockIn.Longitude**: Has trailing space in header ("Longitude ")
- **Workers.Column 1**: Empty placeholder column (R)
- **Log**: First row contains actual data, not headers

### 📊 Row Counts (as of Oct 17, 2025)

- **Largest**: Log (673 rows - deprecated)
- **Active Operations**: ClockIn (411), Tasks (336), Invoice LineItems (340)
- **Small Reference**: Clients (3), Services (4), ServiceGroup (3)

### 🔄 Migration Status

- **Activity_Logs** (NEW): Centralized logging via CLLogger v1.2.0
- **Log** (DEPRECATED): Legacy logging, keep for historical data only
- All new events logged via TT_LOGGER wrapper in EmployeeLogin

### 🔒 Security

- **PasswordHash**: bcrypt (10 rounds) in Workers.PasswordHash
- **Sensitive Data**: Compliance sheet contains SSN (last 4), I-9 documents
- **Access Control**: Based on Workers.Role (Admin/Lead/Worker)

---

**Generated**: October 17, 2025  
**Source**: TEMP_SheetInspector.js  
**Maintainer**: GitHub Copilot
