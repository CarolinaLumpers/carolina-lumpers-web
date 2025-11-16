# Carolina Lumpers Service - AI Coding Agent Instructions

## 📋 Table of Contents
- [Development Workflow Rules](#development-workflow-rules)
- [System Architecture](#system-architecture)
- [Backend Development](#backend-development-googleappsscriptsemployeelogin)
- [Frontend Development](#frontend-development-carolina-lumpers-web)
- [React Portal](#react-portal-quick-reference)
- [Common Pitfalls & Solutions](#common-pitfalls--solutions)
- [Testing & Debugging](#testing--debugging)
- [Quick Reference](#quick-reference)
- [Documentation Locations](#documentation-locations)

---

## 📊 Project Overview

### Current State
- **Workers**: 18 migrated to Supabase (Phase 1 ✅)
- **W9 Records**: 4 approved W9s in Supabase (Phase 2 ✅)
- **Migration**: 40% complete (Phases 3-5 planned)
- **Dual Backend**: Supabase (new) + Google Sheets (legacy)
- **Feature Flag**: `VITE_USE_SUPABASE=true`

### Key Systems
| System | Technology | Status | Purpose |
|--------|-----------|--------|---------|
| carolina-lumpers-web | HTML/CSS/JS | ✅ Production | Public website, employee portal |
| react-portal | React + Supabase | 🔄 Migrating | Internal admin dashboard |
| GoogleAppsScripts | Apps Script | ✅ Production | Time tracking, payroll backend |
| Cloudflare Worker | Edge proxy | ✅ Production | CORS proxy for Apps Script |

---

## Development Workflow Rules

### Before Making Changes (CRITICAL)
**ALWAYS explain the implementation plan in detail and wait for user confirmation before proceeding with any code modifications.**

This includes:
- Describing what will be changed and why
- Explaining technical approach (if requested as non-technical, simplify)
- Listing files that will be modified
- Outlining expected behavior and user experience
- Waiting for explicit approval ("yes", "let's go", "proceed", etc.)

### Best Practice Guidelines (CRITICAL)
**ALWAYS recommend industry best practices and identify anti-patterns across ALL development decisions.**

**User Context**: Limited development experience, migrating from legacy system that didn't follow best practices. User needs education and guidance, not just implementation.

#### When Suggesting ANY Implementation:

1. **Present Best Practice First**
   - Explain the industry-standard approach
   - Why it's the standard (not just "do this")
   - Real-world benefits (performance, security, maintainability, scalability)

2. **Identify Anti-patterns**
   - Call out problematic approaches in existing code
   - Explain why they're problematic
   - Show consequences (technical debt, bugs, security risks)

3. **Use Clear Comparisons**
   ```
   ❌ Anti-pattern: [Bad approach]
      Problems: [Specific issues]
      
   ✅ Best Practice: [Correct approach]
      Benefits: [Specific advantages]
      Trade-offs: [Time/complexity cost]
   ```

4. **Provide Learning Context**
   - Explain the "why" behind decisions
   - Reference industry standards (React patterns, SQL best practices, security principles)
   - Show how it scales/maintains long-term

5. **Wait for Informed Confirmation**
   - Present options with full context
   - Let user choose based on understanding
   - Confirm before implementing

#### Applies To ALL Development Areas:

- **Architecture**: Component design, state management, API structure
- **Database**: Schema design, indexing, foreign keys, normalization
- **Security**: Authentication, authorization, RLS, input validation, secrets management
- **Code Organization**: File structure, separation of concerns, reusability
- **Performance**: Optimization, caching, lazy loading, query efficiency
- **Error Handling**: Try-catch, user feedback, logging, fallbacks
- **Testing**: Unit tests, integration tests, E2E tests
- **Deployment**: CI/CD, environment variables, rollback strategies

#### Communication Style:

**Instead of**: "Add this code..."

**Always use**:
```
I see [X] approaches:

❌ Quick Fix: [Simple but problematic approach]
   Why it's tempting: [Faster now]
   Problems: [Tech debt, security, performance issues]
   
✅ Best Practice: [Industry standard approach]
   Why it's standard: [Industry reasons]
   Benefits: [Long-term value]
   Trade-off: [Extra effort now, huge savings later]
   
✨ Alternative: [If there's a middle ground]
   
Recommendation: [Best practice] because [reasoning based on project context]

Want me to implement the best practice approach?
```

**Rationale**: User is building to **replace** legacy system precisely because best practices weren't followed. This is the opportunity to build it right. Always educate and recommend the correct path first, discuss shortcuts only if explicitly requested.

**Example Scenarios:**

```
User: "How do I store the auth token?"
Agent: 
  ❌ localStorage without encryption - XSS vulnerable
  ✅ httpOnly cookies or secure token management - Industry standard
  [Detailed explanation of why]
  Proceed with best practice?

User: "Should I add validation?"
Agent:
  ❌ Client-side only - Can be bypassed
  ✅ Client + Server validation - Defense in depth
  [Explanation of validation layers]
  Want me to implement both?

User: "How to structure this component?"
Agent:
  ❌ 500-line component with mixed concerns
  ✅ Small, focused components with single responsibility
  [Explanation of React component patterns]
  Let me refactor into proper structure?
```

### Migration Progress Documentation (CRITICAL)
**ALWAYS update `react-portal/docs/migration/MIGRATION_PROGRESS.md` when making Supabase migration changes.**

Update the document when:
- Completing a migration phase (Phase 1-5)
- Implementing new Supabase schemas or tables
- Adding new API methods to `supabase.js`
- Migrating React components from Google Sheets to Supabase
- Discovering issues or limitations during migration
- Making breaking changes to legacy code
- Updating migration priorities or timelines

Keep these sections current:
- **Migration Progress** - Check off completed items, update status
- **Database Schema** - Add new tables, indexes, RLS policies
- **API Methods Implemented** - Document new Supabase methods
- **Files Updated** - Track component migrations
- **Current Status** - Update "What Works" and "What's Disabled" lists
- **Statistics** - Update code changes, database progress, feature availability
- **Known Issues** - Add newly discovered limitations
- **Next Steps** - Revise based on current progress

**Example workflow:**
1. Complete W9 schema creation → Update Phase 2 status to "Complete"
2. Implement `supabaseApi.getPendingW9s()` → Add to "API Methods Implemented"
3. Enable W9Management.jsx queries → Update "Files Updated" and "Feature Availability"
4. Test and find issue → Add to "Known Issues & Limitations"
5. Document in `docs/migration/MIGRATION_PROGRESS.md` with full details

**Example:**
```
User: "Add cache busting"
Agent: [Explains 3 options, recommends one, waits]
User: "Option B sounds good"
Agent: [Details implementation plan, files, impact, waits]
User: "Let's go!"
Agent: [NOW proceeds with code changes]
```

---

## System Architecture

### Multi-Repository Structure
This workspace contains **three distinct systems**:
1. **carolina-lumpers-web/** - Static frontend (HTML/CSS/JS) hosted on GCP
2. **react-portal/** - React SPA migrating from Google Sheets to Supabase PostgreSQL
3. **GoogleAppsScripts/** - Backend services (Google Apps Script) with multiple projects
   - **EmployeeLogin/** - Core time tracking system (deployed web app)
   - **LoggingLibrary/** - Centralized logging (v1.2.0, deployed as library)
   - **PayrollProject/** - Payroll generation
   - **InvoiceProject/** - Invoice management
   - **ContactSync/** - Contact synchronization
   - **VendorSync/** - Vendor data sync
   - **ClockinFlow/** - Batch clock-in operations
   - **JobApplication/** - Application processing (deployed web app, uses CLS_AppSheet_Application_Form)

### React Portal Architecture (ACTIVE MIGRATION)
```
React Portal (localhost:5173)
    ↓ Feature flag: VITE_USE_SUPABASE=true
    ├── Supabase PostgreSQL (PRIMARY)
    │   ├── workers table (✅ Phase 1 COMPLETE - 18 workers)
    │   ├── w9_submissions table (✅ Phase 2 COMPLETE - 4 W9s)
    │   ├── time_edit_requests table (⏳ Phase 3 - Planned)
    │   ├── clock_ins table (⏳ Phase 4 - Planned)
    │   └── payroll_line_items table (⏳ Phase 5 - Planned)
    │
    └── Google Sheets via Proxy (LEGACY - Being Deprecated)
        ↓ http://localhost:3001/api/sheets
        └── CLS_Hub_Backend spreadsheet
```

**Migration Status**: 
- ✅ **Phase 1 Complete**: Workers table (18 workers, Supabase Auth integrated)
- ✅ **Phase 2 Complete**: W9 submissions table (4 approved W9s migrated)
- ⏳ **Phase 3-5**: Time edits, clock-ins, payroll (planned)

**Documentation**: All migration changes MUST be documented in `react-portal/docs/migration/MIGRATION_PROGRESS.md`

### React Portal Directory Structure
```
react-portal/
├── docs/                        # All documentation organized by purpose
│   ├── guides/                  # User guides and how-tos
│   │   ├── DIRECT_SHEETS_ACCESS.md
│   │   ├── USER_SWITCHER.md
│   │   ├── SYNC_WORKERS_README.md
│   │   ├── COLOR_DEMO_GUIDE.md
│   │   └── LOGIN_COLOR_GUIDE.md
│   ├── migration/               # Migration tracking and progress
│   │   ├── MIGRATION_PROGRESS.md  ⭐ UPDATE FREQUENTLY
│   │   ├── PHASE_1_COMPLETE.md
│   │   ├── PHASE_2_COMPLETE.md
│   │   ├── SUPABASE_MIGRATION_PLAN.md
│   │   └── SESSION_*.md
│   ├── completed/               # Completed implementation docs
│   │   ├── DASHBOARD_REFACTOR_COMPLETE.md
│   │   ├── TIME_DISPLAY_BUG_FIX.md
│   │   └── IMPLEMENTATION_DOCS.md
│   ├── deprecated/              # Deprecated documentation
│   ├── archived/                # Archived documentation
│   ├── QUICKSTART.md
│   └── SETUP.md
│
├── scripts/                     # All executable scripts organized by purpose
│   ├── migration/               # Migration utilities
│   │   ├── sync-workers-from-sheets.js   # Sync workers from Google Sheets
│   │   ├── import-w9-submissions.js      # Import W9 records
│   │   ├── fetch-w9-records.js           # Fetch W9 data from Sheets
│   │   ├── inspect-workers-sheet.js      # Debug tool for Sheets structure
│   │   └── add-nataly-worker.js          # One-off worker addition
│   ├── setup/                   # Database and environment setup
│   │   ├── setup-database-v2.js          # Main setup script
│   │   ├── create-admin-auth.js          # Create admin accounts
│   │   └── create-all-worker-auth.js     # Bulk auth creation
│   ├── test/                    # Test and validation scripts
│   │   ├── test-supabase-workers.js
│   │   ├── test-proper-auth.js
│   │   ├── test-login.js
│   │   └── test-uuid-structure.js
│   └── deprecated/              # Old scripts (Python, deprecated JS)
│
├── sql/                         # SQL schemas and migrations
│   ├── migrations/              # Numbered sequential migrations
│   │   ├── 001-create-w9-table.sql
│   │   ├── 002-migrate-to-uuid.sql
│   │   └── 003-add-auth-column.sql
│   └── schemas/                 # Complete schema definitions
│       ├── supabase-schema.sql
│       └── supabase-ready.sql
│
├── data/                        # Exported data and backups
│   └── exports/
│       ├── w9-records-export.json
│       ├── CLS_Hub_Backend - Workers (2).csv
│       └── CLS_Hub_Backend.xlsx
│
├── src/                         # React application source
├── public/                      # Static assets
├── server/                      # Proxy server for Google Sheets API
└── [config files]               # package.json, vite.config.js, etc.
```

**Key Locations:**
- **Migration Docs**: `docs/migration/MIGRATION_PROGRESS.md` - Primary migration tracking (update frequently!)
- **Worker Sync**: `scripts/migration/sync-workers-from-sheets.js` - Tool to sync from Google Sheets
- **Database Setup**: `scripts/setup/setup-database-v2.js` - Initialize Supabase schema
- **SQL Migrations**: `sql/migrations/` - Numbered files (001, 002, 003) run sequentially
- **User Guides**: `docs/guides/` - Component and feature documentation
- **Deprecated Files**: `scripts/deprecated/` and `docs/deprecated/` - Archived legacy code

### Critical API Flow
```
Frontend (employeeDashboard.html)
    ↓ JSONP/fetch + device detection
Cloudflare Proxy (cls-proxy.s-garay.workers.dev)
    ↓ forwards with CORS headers to
Google Apps Script Web App
(https://script.google.com/macros/s/AKfycbwHBLEQ5QHuhD-O4uI4hRN_5_yS9YsFgtn_dMAdoAO2C7zHLoi3qfHO82vas3Uv0wXXpg/exec)
    ↓ logs via TT_LOGGER wrapper
Centralized Logging Library (CLLogger v1.2.0)
    ↓ writes structured logs
Activity_Logs Sheet (SHEET_ID: 1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk)
```

**ALL frontend API calls MUST route through the proxy endpoint**: `https://cls-proxy.s-garay.workers.dev`
- Cloudflare Worker proxies to: `https://script.google.com/macros/s/AKfycbwHBLEQ5QHuhD-O4uI4hRN_5_yS9YsFgtn_dMAdoAO2C7zHLoi3qfHO82vas3Uv0wXXpg/exec`
- Never use direct `script.google.com` URLs in frontend (except signup form)
- Backend expects JSONP callback parameter for GET requests
- POST requests used for offline sync payloads

## Backend Development (GoogleAppsScripts/EmployeeLogin/)

### Module Architecture
```
CLS_EmployeeLogin_Main.js      → Entry point (doGet/doPost routing)
CLS_EmployeeLogin_Config.js    → All constants (SHEET_ID, geofence, emails)
CLS_EmployeeLogin_ClockIn.js   → Clock-in logic, geofencing, time edits
CLS_EmployeeLogin_Workers.js   → Authentication, user lookup
CLS_EmployeeLogin_Admin.js     → Admin reports, payroll generation
CLS_EmployeeLogin_Utils.js     → Shared utilities (distance, translations)
CLS_EmployeeLogin_Logger.js    → TT_LOGGER wrapper for centralized logging
```

### Centralized Logging System (CRITICAL)
**Library**: Script ID `1aAsNI4ZSFg843_MvwTUI8RgmYe-qt_njBfiPRBgOwwEjvVSS8KrBhtrv`, identifier `CLLogger`

**Pattern**: Use TT_LOGGER wrapper (never call CLLogger directly)
```javascript
// ✅ CORRECT: Use wrapper functions
TT_LOGGER.logClockIn(workerData, locationData);
TT_LOGGER.logLogin(workerData);
TT_LOGGER.logGeofenceViolation(workerData, locationData);

// ❌ WRONG: Don't call library directly or use old function
logEvent_('ClockIn', data);  // Deprecated - only in TestTools
CLLogger.logEvent(...);       // Wrong - use wrapper
```

**All logging must:**
- Use TT_LOGGER wrapper functions (16 available in CLS_EmployeeLogin_Logger.js)
- Pass sheetId: SHEET_ID explicitly in wrapper
- Use string literals for enums: `'TIME_TRACKING'`, `'SUCCESS'`, `'PENDING'`
- Include device parameter from frontend (e.g., "iPhone - Safari")

**Activity_Logs Sheet Structure (14 columns):**
```
A: Log ID (key)          B: Timestamp           C: Event Type
D: Worker ID             E: Display Name        F: Event Summary
G: Device                H: Site                I: Distance (miles)
J: Latitude              K: Longitude           L: Status
M: Project               N: Details (JSON)
```

### Deployment Workflow
```powershell
# From GoogleAppsScripts/ root
.\push-all.ps1              # Push all projects to Google
# OR for single project
cd EmployeeLogin
clasp push                  # Push to Google Apps Script
clasp pull                  # Pull from Google (if needed)
```

**After deployment**:
1. Google Apps Script auto-updates the web app (no republish needed with latest settings)
2. Web App URL: `https://script.google.com/macros/s/AKfycbwHBLEQ5QHuhD-O4uI4hRN_5_yS9YsFgtn_dMAdoAO2C7zHLoi3qfHO82vas3Uv0wXXpg/exec`
3. Cloudflare Worker proxy: `https://cls-proxy.s-garay.workers.dev` (configured in Cloudflare dashboard)
4. Frontend uses proxy URL only (CORS enabled)

### Key Backend Patterns
- **Action Routing**: All API calls use `?action=<actionName>` parameter
- **JSONP Support**: Wrap responses in callback for cross-origin requests
- **Device Tracking**: Extract `device` parameter from `params.device` (passed from frontend)
- **Email Notifications**: Use `GmailApp.sendEmail()` for notifications (not MailApp for quota limits)
- **Geofencing**: Clock-ins validated against Clients sheet (GEOFENCE_RADIUS_MI = 0.3 mi)
- **Time Edits**: TimeEditRequests sheet stores edit requests; match by WorkerID + ClockinID
- **Function Signatures**: Clock-in now requires device: `handleClockIn(workerId, lat, lng, device)`

### Backend API Actions (CLS_EmployeeLogin_Main.js)
```javascript
// Auth
?action=login              // Email/password authentication + device tracking
?action=signup             // New user registration
?action=whoami             // Get user role (Admin/Lead/Worker)

// Clock-in
?action=clockin            // GPS clock-in with geofence + device tracking
?action=report             // Get worker's clock-in records
?action=reportAs           // Admin view another worker's records

// Time Edits
?action=submitTimeEdit     // Submit edit request (needs employeeId, recordId)
?action=approveTimeEdit    // Admin approve edit
?action=denyTimeEdit       // Admin deny edit
?action=getTimeEditRequests // Get pending edit requests
?action=getTimeEntryStatus  // Check if entry has pending edit

// Payroll
?action=payroll            // Get worker payroll summary
?action=payrollAs          // Admin view another worker's payroll
?action=payrollPdf         // Generate and email PDF report

// Admin
?action=reportAll          // Load all workers' clock-ins (with optional filter)
```

## Frontend Development (carolina-lumpers-web/)

### CSS Architecture (Modular System)
```
css/
├── variables.css     → Design tokens (--cls-amber, --cls-charcoal, spacing)
├── base.css          → Global resets, typography
├── components.css    → Reusable UI (.btn, .card, .status-badge)
├── layout.css        → Site structure, navigation, responsive
├── forms.css         → Form-specific styling
└── style.css         → Import coordinator + legacy support
```

**Cache-busting**: Always use `?v=2024-<feature-name>` on CSS/JS includes

### Device Detection (CRITICAL - New Pattern)
**Location**: `js/script.js` (lines 1-60)

**Always use device detection for API calls:**
```javascript
// Get device info
const deviceInfo = getDeviceInfo();
// Returns: { displayString: 'iPhone - Safari', type: 'iPhone', browser: 'Safari', ... }

// Login with device
fetch(`${API_BASE}?action=login&device=${encodeURIComponent(deviceInfo.displayString)}`)

// Clock-in with device
const clockData = {
  device: deviceInfo.displayString,  // e.g., "Android - Chrome"
  workerId, lat, lng, ...
};
```

**Functions available:**
- `getDeviceType()` → 'iPhone' | 'iPad' | 'Android' | 'Windows' | 'macOS' | 'Linux'
- `getBrowserType()` → 'Chrome' | 'Safari' | 'Edge' | 'Firefox' | 'Opera'
- `getDeviceInfo()` → Full object with displayString, isMobile, userAgent, screenSize

### Key Frontend Patterns
- **Multilingual Support**: All UI text uses `data-en`, `data-es`, `data-pt` attributes
- **PWA Architecture**: Service worker (`service-worker-employee.js`) for offline clock-ins
- **Session Management**: Store in localStorage: `CLS_WorkerID`, `CLS_WorkerName`, `CLS_Email`, `CLS_Role`
- **Biometric Login**: WebAuthn API for Face ID/Touch ID (stored locally, not transmitted)
- **JSONP Helper**: Use `jsonp(url)` function for cross-origin GET requests with callback
- **Offline Sync**: Failed clock-ins queued in IndexedDB, synced when online
- **Device Detection**: Always include device info in API calls for tracking/analytics

### Time Edit Request Flow (Critical)
```javascript
// Frontend (employeeDashboard.html)
submitTimeEditRequest() {
  const editData = {
    employeeId: workerId,           // ← Must be workerId
    recordId: currentEditEntry,     // ← Must be ClockinID
    originalTime: '...',
    requestedTime: '...',
    reason: '...'
  };
  // Submit via fetch to proxy
  fetch(`${API_URL}?action=submitTimeEdit&employeeId=...&recordId=...`)
}

// Backend (CLS_EmployeeLogin_ClockIn.js)
handleTimeEditRequest_() {
  // Writes to TimeEditRequests sheet with WorkerID + ClockinID
  // Matches against ClockIn sheet to update EditStatus
  // Uses TT_LOGGER.logTimeEditRequest() for centralized logging
  // Sends email notification with GmailApp
}
```

### Admin Tools (employeeDashboard.html)
- **View As Mode**: Admin-only feature to view/manage other workers' data
- **Bulk Reports**: Load all clock-ins with optional worker filter (serverside CSV filter)
- **Role-based UI**: Show/hide panels based on `USER_ROLE` (Admin/Supervisor/Worker)

### Job Application Form (apply.html)
- **6-Step Wizard**: Multi-step form with progress bar and validation
- **Multilingual**: English, Spanish, Portuguese support
- **Steps**: Personal Info → Location/Transport → Work Auth → Job Prefs → Emergency Contact → Language/Privacy
- **Submission**: Direct POST to Job Application web app (not proxied)
- **Endpoint**: `https://script.google.com/macros/s/AKfycbxdD80YrBa6wa271_TtCpwWnQJbQfeRjZVe0iRkAdO36D_t3E44foSn11IdCEq1iJ6OSg/exec`
- **Target**: CLS_AppSheet_Application_Form spreadsheet
- **Validation**: Client-side validation with 18+ age check, required fields per step
- **Features**: Work authorization documentation helper, honeypot spam protection, form timing tracking

## Common Pitfalls & Solutions

### ❌ Wrong: Direct Google Apps Script URL
```javascript
const url = "https://script.google.com/macros/s/.../exec";
```
### ✅ Correct: Use Proxy
```javascript
const API_URL = "https://cls-proxy.s-garay.workers.dev";
const url = `${API_URL}?action=clockin&workerId=...`;
```

### ❌ Wrong: Old Logging Pattern
```javascript
logEvent_('ClockIn', { workerId, site });  // Deprecated
```
### ✅ Correct: Use TT_LOGGER Wrapper
```javascript
TT_LOGGER.logClockIn(
  { workerId, displayName, device, language },
  { siteName, distance, latitude, longitude, clockinID, minutesLate }
);
```

### ❌ Wrong: Missing Device Parameter
```javascript
fetch(`${API_URL}?action=login&email=${email}&password=${pw}`)
```
### ✅ Correct: Include Device Info
```javascript
const deviceInfo = getDeviceInfo();
fetch(`${API_URL}?action=login&email=${email}&password=${pw}&device=${encodeURIComponent(deviceInfo.displayString)}`)
```

### ❌ Wrong: Calling Library Directly
```javascript
CLLogger.logEvent('CLOCK_IN', ...)  // Wrong - library not in scope
CLLogger.LOG_CONFIG.PROJECTS.TIME_TRACKING  // Wrong - not exposed
```
### ✅ Correct: Use Wrapper with String Literals
```javascript
TT_LOGGER.logClockIn(...)  // Wrapper handles library calls
// Wrapper uses: project: 'TIME_TRACKING', status: 'SUCCESS'
```

### ❌ Wrong: Missing Parameters for Time Edits
```javascript
// Backend email shows "undefined"
employeeId: editData.entryId  // Wrong field name
```
### ✅ Correct: Use Correct Parameter Names
```javascript
employeeId: workerId,         // Worker ID from session
recordId: currentEditEntry     // ClockinID from report
```

### ❌ Wrong: Hardcoded English Text
```html
<button>Submit Request</button>
```
### ✅ Correct: Multilingual Attributes
```html
<button data-en="Submit Request" data-es="Enviar Solicitud" data-pt="Enviar Solicitação">
  Submit Request
</button>
```

## Testing & Debugging

### Local Frontend Testing
```powershell
cd carolina-lumpers-web
python -m http.server 8010
# Open http://localhost:8010/employeelogin.html
```

### Backend Testing (Apps Script Editor)
```javascript
// Run from CLS_EmployeeLogin_TestTools.js
testSystemConfig()              // Verify all config values
testClockInFlow('W001', 35.77, -78.63)  // Test clock-in logic
testDateTimeFormats()           // Verify timezone handling

// Run from CLS_EmployeeLogin_ClockIn.js
testClockInLogging()            // Test centralized logging (4 tests)
// Expected: 4/4 pass, creates entries in Activity_Logs
```

### Debugging Centralized Logging
1. Check Activity_Logs sheet for new entries (all 14 columns populated)
2. Verify Log ID format: `LOG-{timestamp}-{random}` (e.g., LOG-20251017123134-TQUD)
3. Confirm Device column shows actual device (not "Unknown Device")
4. Check Details column for JSON with full event context
5. Apps Script execution logs show `[TIME_TRACKING]` prefix

### Debugging Time Edits
1. Check TimeEditRequests sheet for new rows
2. Verify WorkerID and ClockinID match ClockIn sheet
3. Check Activity_Logs for TIME_EDIT_REQUEST events
4. Confirm email sent (check GmailApp quota)

## Project-Specific Conventions

- **IDs are Strings**: WorkerIDs like "CLS001" stored as text, not numbers
- **Timezone**: All dates/times use `America/New_York` (EST/EDT)
- **Distance Units**: Always miles (not km) for geofencing
- **Email Hierarchy**: `GmailApp` preferred over `MailApp` (better quota)
- **Status Values**: Clock-in EditStatus = `confirmed|pending|editing|denied`
- **Sheet Names**: Case-sensitive - "ClockIn" not "clockin", "Activity_Logs" not "activity_logs"
- **Library Version**: CLLogger v1.2.0 - always use latest version in project settings
- **Wrapper Pattern**: One wrapper per project (TT_LOGGER for TIME_TRACKING)
- **Device Strings**: Format is "DeviceType - BrowserType" (e.g., "iPhone - Safari")

## External Dependencies

- **Cloudflare Workers**: Proxy at `https://cls-proxy.s-garay.workers.dev` (CORS handling)
  - Forwards to: `https://script.google.com/macros/s/AKfycbwHBLEQ5QHuhD-O4uI4hRN_5_yS9YsFgtn_dMAdoAO2C7zHLoi3qfHO82vas3Uv0wXXpg/exec`
- **Google Apps Script Web Apps**:
  - **EmployeeLogin**: `https://script.google.com/macros/s/AKfycbwHBLEQ5QHuhD-O4uI4hRN_5_yS9YsFgtn_dMAdoAO2C7zHLoi3qfHO82vas3Uv0wXXpg/exec`
  - **Job Application**: `https://script.google.com/macros/s/AKfycbxdD80YrBa6wa271_TtCpwWnQJbQfeRjZVe0iRkAdO36D_t3E44foSn11IdCEq1iJ6OSg/exec` (used by apply.html)
- **Google Sheets Databases**:
  - **CLS_Hub_Backend** (main): `1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk` (22 sheets)
  - **CLS_AppSheet_Application_Form**: `14dO3qB3Oa-N7eX9EcBTStydvyJaHprgi3_dQJsTvRx4` (3 sheets)
- **Google Maps API**: Geocoding for client addresses
- **WebAuthn**: Browser biometric authentication (no server component)
- **IndexedDB**: Frontend offline storage for failed clock-ins
- **CLLogger Library**: Centralized logging (Script ID: `1aAsNI4ZSFg843_MvwTUI8RgmYe-qt_njBfiPRBgOwwEjvVSS8KrBhtrv`)

## Quick Reference

### Find Worker Role
```javascript
const role = await jsonp(`${API_URL}?action=whoami&workerId=${workerId}`);
// Returns: { ok: true, role: 'Admin' | 'Supervisor' | 'Worker' }
```

### Get Edit Status for Clock-in Entry
```javascript
const status = await jsonp(`${API_URL}?action=getTimeEntryStatus&workerId=${workerId}&recordId=${clockinId}`);
// Returns: { editStatus: 'confirmed' | 'pending' | 'editing' }
```

### Add New Action to Backend
1. Add case to `handleRequest()` in CLS_EmployeeLogin_Main.js
2. Implement logic in appropriate module file
3. Add centralized logging with TT_LOGGER if needed
4. Extract device parameter if relevant: `const device = params.device || 'Unknown Device'`
5. Update this documentation with API signature
6. Run `clasp push` from EmployeeLogin/ directory

### Log Any Event (Backend)
```javascript
// Use appropriate TT_LOGGER function for event type
TT_LOGGER.logClockIn(workerData, locationData);
TT_LOGGER.logLogin(workerData);
TT_LOGGER.logTimeEditRequest(employeeId, employeeName, requestId, editData);
TT_LOGGER.logError(userId, displayName, errorMessage, errorDetails);
// See CLS_EmployeeLogin_Logger.js for all 16 functions
```

### Add Device Detection to New Frontend Feature
```javascript
// Always get device info for API calls
const deviceInfo = getDeviceInfo();

// Include in API request
const url = `${API_URL}?action=newAction&device=${encodeURIComponent(deviceInfo.displayString)}`;

// Backend extracts and logs
const device = params.device || 'Unknown Device';
TT_LOGGER.logCustomEvent({ device, ...otherData });
```

### Cloudflare Proxy Configuration
**Proxy URL**: `https://cls-proxy.s-garay.workers.dev`
**Target**: `https://script.google.com/macros/s/AKfycbwHBLEQ5QHuhD-O4uI4hRN_5_yS9YsFgtn_dMAdoAO2C7zHLoi3qfHO82vas3Uv0wXXpg/exec`

**Worker Script** (Cloudflare):
```javascript
export default {
  async fetch(request) {
    const target = "https://script.google.com/macros/s/AKfycbwHBLEQ5QHuhD-O4uI4hRN_5_yS9YsFgtn_dMAdoAO2C7zHLoi3qfHO82vas3Uv0wXXpg/exec";
    const url = new URL(request.url);
    const proxyUrl = url.search ? `${target}${url.search}` : target;
    const res = await fetch(proxyUrl, { method: "GET" });
    const body = await res.text();
    return new Response(body, {
      status: 500,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }
};
```

## Google Cloud CLI Access

**✅ IMPORTANT: Google Cloud CLI (`gcloud`) is installed and configured**

- **CLI Version**: Google Cloud SDK 504.0.1
- **Active Account**: `s.garay@carolinalumpers.com`
- **Current Project**: `cls-operations-hub`
- **Available Commands**: Use `gcloud` for all GCP operations

**Common Operations:**
```powershell
# Check project
gcloud config get core/project

# List service accounts
gcloud iam service-accounts list

# Enable APIs
gcloud services enable sheets.googleapis.com

# Create API keys
gcloud alpha services api-keys create --display-name="Name" --api-target=service=sheets.googleapis.com

# Create service accounts
gcloud iam service-accounts create account-name --display-name="Display Name"

# Generate service account keys
gcloud iam service-accounts keys create key.json --iam-account=account@project.iam.gserviceaccount.com
```

## React Portal Quick Reference

### UserSwitcher Component (Dev Tool)
**Location**: `react-portal/src/components/UserSwitcher.jsx`
**Purpose**: Switch between users to test different roles without logging out

```javascript
// Already integrated in Dashboard.jsx
import UserSwitcher from '../components/UserSwitcher';

// Features:
// - Fetches real workers from backend via api.getReportAll()
// - Shows purple floating button in bottom-right
// - Highlights current user with purple border
// - Uses login() method from AuthContext (NOT setUser)
// - Auto-hidden in production (checks import.meta.env.PROD)
```

**Usage Pattern:**
```javascript
const { user: currentUser, login } = useAuth(); // ✅ Correct
// const { user, setUser } = useAuth(); // ❌ Wrong - setUser doesn't exist

const switchToUser = async (worker) => {
  const roleData = await api.whoami(worker.id);
  const newUser = { workerId, displayName, email, role, w9Status };
  login(newUser); // ✅ Use login() method
  window.location.reload();
};
```

### Direct Google Sheets API Access
**Location**: `react-portal/src/services/sheets.js` + `react-portal/server/sheets-proxy.js`
**Purpose**: Fast read-only access to spreadsheet, bypassing Apps Script

**Architecture:**
```
React Frontend (localhost:5174)
    ↓ fetch to proxy
Proxy Server (localhost:3001)
    ↓ OAuth Service Account
Google Sheets API v4
    ↓ reads from
CLS_Hub_Backend (private spreadsheet)
```

**Service Account:**
- Email: `react-portal-sheets@cls-operations-hub.iam.gserviceaccount.com`
- Key File: `react-portal/server/service-account-key.json` (DO NOT COMMIT)
- Permissions: Read-only (Viewer role on spreadsheet)

**Running Both Servers:**
```powershell
# Terminal 1: Proxy server (port 3001)
cd react-portal/server
npm start

# Terminal 2: React dev server (port 5174)
cd react-portal
npm run dev
```

**Usage in Components:**
```javascript
import { sheetsApi } from '../services/sheets';

// Fetch workers directly from Workers sheet
const workers = await sheetsApi.getWorkersDirect();
// Returns: [{ id: 'SG-001', name: 'Steve Garay', role: 'Admin' }, ...]

// Fetch payroll from Payroll LineItems sheet
const payroll = await sheetsApi.getPayrollDirect('SG-001', '2025-01-15');
// Returns: { success: true, rows: [...], totals: {...} }

// Fetch clock-ins from ClockIn sheet
const clockIns = await sheetsApi.getClockInsDirect('SG-001', '2025-01-15');
// Returns: [{ date, time, site, distance, status, ... }]
```

**When to Use:**
- ✅ Fast reads for reports/dashboards
- ✅ Exporting large datasets
- ✅ Data already formatted in sheets
- ❌ Writing data (use Apps Script instead)
- ❌ Backend validation needed (use Apps Script)
- ❌ Complex calculations (use Apps Script)

**Test Proxy Server:**
```powershell
# Health check
Invoke-RestMethod -Uri "http://localhost:3001/health"

# Fetch Workers data
$result = Invoke-RestMethod -Uri "http://localhost:3001/api/sheets/1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk/values/Workers!A1:E10"
$result.data.values
```

## Documentation Locations

- **Frontend**: `carolina-lumpers-web/README.md`
- **React Portal**: `react-portal/README.md`
- **React Portal Migration**: `react-portal/docs/migration/MIGRATION_PROGRESS.md` ⭐ **UPDATE FREQUENTLY**
- **Backend EmployeeLogin**: `GoogleAppsScripts/EmployeeLogin/README.md`
- **Database Schema**: `.github/DATABASE_SCHEMA.md` (22 sheets, complete structure)
- **Centralized Logging**: `GoogleAppsScripts/LoggingLibrary/START_HERE.md`
- **Migration Complete**: `GoogleAppsScripts/LoggingLibrary/EMPLOYEELOGIN_MIGRATION_COMPLETE.md`
- **Device Detection**: `GoogleAppsScripts/LoggingLibrary/DEVICE_DETECTION_IMPLEMENTATION.md`
- **Direct Sheets Access**: `react-portal/docs/guides/DIRECT_SHEETS_ACCESS.md` (proxy server, OAuth setup)
- **UserSwitcher Component**: `react-portal/docs/guides/USER_SWITCHER.md` (dev tool for testing roles)
- **Worker Sync Tools**: `react-portal/docs/guides/SYNC_WORKERS_README.md` (Google Sheets → Supabase sync)
- **This File**: `.github/copilot-instructions.md`
