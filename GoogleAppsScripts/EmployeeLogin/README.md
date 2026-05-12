# CLS Employee Login System - Modular Architecture

## 📂 Project Structure

```
📂 CLS_Employee_Login_System
 ┣ 📄 CLS_EmployeeLogin_Main.js      - Main entry point (doGet, routing)
 ┣ 📄 CLS_EmployeeLogin_ClockIn.js   - Clock-in, lateness, geofencing
 ┣ 📄 CLS_EmployeeLogin_Admin.js     - Admin utilities & report access
 ┣ 📄 CLS_EmployeeLogin_Workers.js   - Worker lookup & authentication
 ┣ 📄 CLS_EmployeeLogin_Utils.js     - Utilities (translation, logging, dates)
 ┣ 📄 CLS_EmployeeLogin_Config.js    - Global configuration constants
 ┗ 📄 CLS_EmployeeLogin_TestTools.js - Test & diagnostic tools
```

## 🧩 Module Breakdown

### CLS_EmployeeLogin_Main.js
- **Purpose**: Main API entry point
- **Functions**: `doGet()` - Routes all incoming requests
- **Dependencies**: All other modules

### CLS_EmployeeLogin_Config.js
- **Purpose**: Centralized configuration
- **Contains**: Sheet IDs, email addresses, geofence settings, timing constants
- **No Dependencies**: Pure configuration

### CLS_EmployeeLogin_Utils.js
- **Purpose**: Shared utility functions
- **Functions**: Date formatting, distance calculations, password hashing, logging, translations
- **Dependencies**: Config module

### CLS_EmployeeLogin_Workers.js
- **Purpose**: Worker authentication and lookup
- **Functions**: `loginUser()`, `signUpUser()`, `getWorkerIdByEmail()`, `lookupWorkerMeta_()`, `getRole_()`
- **Dependencies**: Config, Utils

### CLS_EmployeeLogin_ClockIn.js
- **Purpose**: Clock-in processing and notifications
- **Functions**: `handleClockIn()`, `maybeNotifyLateClockIn_()`, `ensureMinIntervalMinutes_()`, `getWeeklyReportObj()`
- **Dependencies**: Config, Utils, Workers

### CLS_EmployeeLogin_Admin.js
- **Purpose**: Admin functions and payroll
- **Functions**: `handleReportAll_()`, `getPayrollSummary_()`, `generatePayrollPdf_()`
- **Dependencies**: Config, Utils, Workers

### CLS_EmployeeLogin_TestTools.js
- **Purpose**: Diagnostic and testing functions
- **Functions**: `testDateTimeFormats()`, `testSystemConfig()`, `testClockInFlow()`
- **Dependencies**: All modules

## 🔄 Migration Notes

1. **Original Code**: The monolithic `Code.js` has been broken into logical modules
2. **Backwards Compatibility**: All existing API endpoints remain unchanged
3. **Configuration**: All constants moved to Config module for easy management
4. **Testing**: New diagnostic tools available for troubleshooting

## 🚀 Deployment

1. Delete the old `Code.js` file
2. Deploy all new `.js` files to Apps Script
3. Test using the diagnostic functions in TestTools

## 🛠️ Maintenance Benefits

- **Easier Debugging**: Each module handles specific functionality
- **Faster Development**: Changes isolated to relevant modules
- **Better Organization**: Related functions grouped together
- **Reusable Components**: Utils can be shared across projects
- **Clear Dependencies**: Easy to understand module relationships

## 📊 Module Dependencies Chart

```
CLS_EmployeeLogin_Main.js
├── CLS_EmployeeLogin_Config.js
├── CLS_EmployeeLogin_Utils.js
├── CLS_EmployeeLogin_Workers.js
├── CLS_EmployeeLogin_ClockIn.js
├── CLS_EmployeeLogin_Admin.js
└── CLS_EmployeeLogin_TestTools.js
```

## ⚡ Quick Start Testing

After deployment, test the system:

```javascript
// Test system configuration
testSystemConfig()

// Test date/time formats
testDateTimeFormats()

// Test clock-in flow
testClockInFlow('WORKER001', 35.7796, -78.6382)
```

## Security Contract (May 2026)

Sensitive read actions now require an explicit `requesterId` and enforce
server-side access checks.

### Required Request Parameters

- `report`: requires `requesterId` and `workerId`
- `whoami`: requires `requesterId` and `workerId`
- `whois`: requires `requesterId` and `workerId`
- `reportAll`: requires `requesterId`
- `payroll`: requires `requesterId` and `workerId`
- `payrollWeekPeriods`: requires `requesterId` and `workerId`
- `payrollPdf`: requires `requesterId` and `workerId`
- `reportAs` / `payrollAs`: require `requesterId` and `targetId` and admin role

### Authorization Rules

- Self-access: requester can access their own records (`requesterId === workerId`)
- Cross-user access: admin-only
- Denied requests are logged with action/requester/target context

### Error Format

Apps Script web apps return HTTP 200 for JSON responses; therefore auth and
validation failures include structured fields in the body:

- `message`: human-readable reason
- `errorCode`: semantic status code (for example `400`, `403`)
- `ok:false` or `success:false` depending on endpoint schema

Example unauthorized payload:

```json
{
	"ok": false,
	"message": "Unauthorized",
	"errorCode": 403
}
```