# Carolina Lumpers Service - AI Coding Agent Instructions

## Development Workflow Rules

### Before Making Changes (CRITICAL)
**ALWAYS explain the implementation plan in detail and wait for user confirmation before proceeding with any code modifications.**

This includes:
- Describing what will be changed and why
- Explaining technical approach (if requested as non-technical, simplify)
- Listing files that will be modified
- Outlining expected behavior and user experience
- Waiting for explicit approval ("yes", "let's go", "proceed", etc.)

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
This workspace contains **two distinct systems** that communicate via API:
1. **carolina-lumpers-web/** - Static frontend (HTML/CSS/JS) hosted on GCP
2. **GoogleAppsScripts/** - Backend services (Google Apps Script) with multiple projects
   - **EmployeeLogin/** - Core time tracking system (deployed web app)
   - **LoggingLibrary/** - Centralized logging (v1.2.0, deployed as library)
   - **PayrollProject/** - Payroll generation
   - **InvoiceProject/** - Invoice management
   - **ContactSync/** - Contact synchronization
   - **VendorSync/** - Vendor data sync
   - **ClockinFlow/** - Batch clock-in operations
   - **JobApplication/** - Application processing (deployed web app, uses CLS_AppSheet_Application_Form)

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
- **Role-based UI**: Show/hide panels based on `USER_ROLE` (Admin/Lead/Worker)

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
// Returns: { ok: true, role: 'Admin' | 'Lead' | 'Worker' }
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

## Documentation Locations

- **Frontend**: `carolina-lumpers-web/README.md`
- **Backend EmployeeLogin**: `GoogleAppsScripts/EmployeeLogin/README.md`
- **Database Schema**: `.github/DATABASE_SCHEMA.md` (22 sheets, complete structure)
- **Centralized Logging**: `GoogleAppsScripts/LoggingLibrary/START_HERE.md`
- **Migration Complete**: `GoogleAppsScripts/LoggingLibrary/EMPLOYEELOGIN_MIGRATION_COMPLETE.md`
- **Device Detection**: `GoogleAppsScripts/LoggingLibrary/DEVICE_DETECTION_IMPLEMENTATION.md`
- **This File**: `.github/copilot-instructions.md`
