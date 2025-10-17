# Carolina Lumpers Service - AI Coding Agent Instructions

## System Architecture

### Multi-Repository Structure
This workspace contains **two distinct systems** that communicate via API:
1. **carolina-lumpers-web/** - Static frontend (HTML/CSS/JS) hosted on GCP
2. **GoogleAppsScripts/** - Backend services (Google Apps Script) with multiple projects

### Critical API Flow
```
Frontend (employeeDashboard.html)
    ↓ JSONP/fetch
Cloudflare Proxy (cls-proxy.s-garay.workers.dev)
    ↓ forwards to
Google Apps Script (EmployeeLogin API)
    ↓ reads/writes
Google Sheets Database (SHEET_ID: 1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk)
```

**ALL frontend API calls MUST route through the proxy endpoint**: `https://cls-proxy.s-garay.workers.dev`
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
CLS_EmployeeLogin_Utils.js     → Shared utilities (distance, logging, translations)
```

### Deployment Workflow
```powershell
# From GoogleAppsScripts/ root
.\push-all.ps1              # Push all projects to Google
# OR for single project
cd EmployeeLogin
clasp push                  # Push to Google Apps Script
```

### Key Backend Patterns
- **Action Routing**: All API calls use `?action=<actionName>` parameter
- **JSONP Support**: Wrap responses in callback for cross-origin requests
- **Logging**: Use `logEvent_(eventType, dataObj)` from Utils for structured logs to "Log" sheet
- **Email Notifications**: Use `GmailApp.sendEmail()` for notifications (not MailApp for quota limits)
- **Geofencing**: Clock-ins validated against Clients sheet (GEOFENCE_RADIUS_MI = 0.3 mi)
- **Time Edits**: TimeEditRequests sheet stores edit requests; match by WorkerID + ClockinID

### Backend API Actions (CLS_EmployeeLogin_Main.js)
```javascript
// Auth
?action=login              // Email/password authentication
?action=signup             // New user registration
?action=whoami             // Get user role (Admin/Lead/Worker)

// Clock-in
?action=clockin            // GPS clock-in with geofence validation
?action=report             // Get worker's clock-in records
?action=reportAs           // Admin view another worker's records

// Time Edits (NEW)
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

### Key Frontend Patterns
- **Multilingual Support**: All UI text uses `data-en`, `data-es`, `data-pt` attributes
- **PWA Architecture**: Service worker (`service-worker-employee.js`) for offline clock-ins
- **Session Management**: Store in localStorage: `CLS_WorkerID`, `CLS_WorkerName`, `CLS_Email`, `CLS_Role`
- **Biometric Login**: WebAuthn API for Face ID/Touch ID (stored locally, not transmitted)
- **JSONP Helper**: Use `jsonp(url)` function for cross-origin GET requests with callback
- **Offline Sync**: Failed clock-ins queued in IndexedDB, synced when online

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
  // Sends email notification with GmailApp
}
```

### Admin Tools (employeeDashboard.html)
- **View As Mode**: Admin-only feature to view/manage other workers' data
- **Bulk Reports**: Load all clock-ins with optional worker filter (serverside CSV filter)
- **Role-based UI**: Show/hide panels based on `USER_ROLE` (Admin/Lead/Worker)

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
```

### Debugging Time Edits
1. Check TimeEditRequests sheet for new rows
2. Verify WorkerID and ClockinID match ClockIn sheet
3. Check Log sheet for `handleTimeEditRequest` entries
4. Confirm email sent (check GmailApp quota)

## Project-Specific Conventions

- **IDs are Strings**: WorkerIDs like "CLS001" stored as text, not numbers
- **Timezone**: All dates/times use `America/New_York` (EST/EDT)
- **Distance Units**: Always miles (not km) for geofencing
- **Email Hierarchy**: `GmailApp` preferred over `MailApp` (better quota)
- **Status Values**: Clock-in EditStatus = `confirmed|pending|editing|denied`
- **Sheet Names**: Case-sensitive - "ClockIn" not "clockin"

## External Dependencies

- **Cloudflare Workers**: Proxy at cls-proxy.s-garay.workers.dev (CORS handling)
- **Google Sheets**: Database (ClockIn, Clients, TimeEditRequests, Workers, Log)
- **Google Maps API**: Geocoding for client addresses
- **WebAuthn**: Browser biometric authentication (no server component)
- **IndexedDB**: Frontend offline storage for failed clock-ins

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
3. Update this documentation with API signature
4. Run `clasp push` from EmployeeLogin/ directory
