# Carolina Lumpers Centralized Logging Library

## Overview
This library provides a standardized, AppSheet-optimized logging system for all Carolina Lumpers Google Apps Script projects.

## Features
- ✅ Unique Log IDs for AppSheet key column
- ✅ Standardized event types and status values
- ✅ Separate latitude/longitude columns for map views
- ✅ Human-readable summaries + detailed JSON for debugging
- ✅ Timezone-aware timestamps (America/New_York)
- ✅ AppSheet-compatible data types (proper nulls, no placeholders)
- ✅ Convenience functions for common events

## Deployment Steps

### 1. Create Library Project
```bash
cd GoogleAppsScripts/LoggingLibrary
clasp create --type standalone --title "Carolina Lumpers Logging Library"
```

### 2. Push Code
```bash
clasp push
```

### 3. Test the Library
1. Open the project in Apps Script editor
2. Run `testLoggingLibrary()` function
3. Verify Activity_Logs sheet is created with sample data

### 4. Deploy as Library
1. In Apps Script editor: Deploy → New deployment
2. Select type: **Library**
3. Description: "Carolina Lumpers Centralized Logging v1.2.0"
4. Access: Anyone with link (or restrict to organization)
5. Click Deploy
6. **SAVE THE SCRIPT ID** (format: 1abc...xyz)

## Usage in Projects

### Add Library Reference
1. Open target project in Apps Script editor
2. Click Libraries (+ icon)
3. Paste Script ID: `1aAsNI4ZSFg843_MvwTUI8RgmYe-qt_njBfiPRBgOwwEjvVSS8KrBhtrv`
4. Select latest version
5. Set identifier: `CLLogger`
6. Click Add

### Basic Usage
```javascript
// Log a clock-in event
CLLogger.logClockIn(
  'CLS001',                    // Worker ID
  'John Doe',                  // Display name
  'ABC Warehouse',             // Site name
  0.15,                        // Distance (miles)
  35.7796,                     // Latitude
  -78.6382,                    // Longitude
  {
    device: 'iPhone 13',
    minutesLate: 5,
    clockinID: 'CLK-12345',
    sheetId: SHEET_ID,         // Your spreadsheet ID
    project: CLLogger.LOG_CONFIG.PROJECTS.TIME_TRACKING
  }
);

// Log a login event
CLLogger.logLogin(
  'CLS002',                    // Worker ID
  'Jane Smith',                // Display name
  'Chrome Browser',            // Device
  'jane@example.com',          // Email
  {
    ip: '192.168.1.1',
    biometric: true,
    sheetId: SHEET_ID,
    project: CLLogger.LOG_CONFIG.PROJECTS.TIME_TRACKING
  }
);

// Log a system event
CLLogger.logSystem(
  'Daily payroll check completed',
  {
    sheetId: SHEET_ID,
    project: CLLogger.LOG_CONFIG.PROJECTS.PAYROLL,
    details: { recordsProcessed: 42 }
  }
);
```

## Available Functions

### Core Function
- `logEvent(eventType, userId, displayName, summary, options)` - Main logging function

### Convenience Functions
- `logClockIn(workerId, displayName, site, distance, lat, lng, options)`
- `logClockOut(workerId, displayName, site, hoursWorked, options)`
- `logLogin(workerId, displayName, device, email, options)`
- `logLoginAttempt(email, success, device, options)`
- `logLateEmail(workerId, displayName, site, minutesLate, options)`
- `logTimeEditRequest(employeeId, employeeName, requestId, options)`
- `logTimeEditApproval(employeeId, employeeName, approverName, requestId, options)`
- `logTimeEditDenial(employeeId, employeeName, approverName, requestId, options)`
- `logGeofenceViolation(workerId, displayName, distance, lat, lng, options)`
- `logRateLimit(workerId, displayName, minutesSinceLastClockIn, rateLimit, options)`
- `logSystem(message, options)`
- `logError(userId, displayName, errorMessage, options)`

### Query Functions
- `getLogById(logId, options)` - Retrieve a specific log entry
- `getLogs(filters, options)` - Query logs with filters

### Utility Functions
- `generateLogId()` - Generate unique log ID
- `getOrCreateLogSheet(spreadsheet)` - Get or create Activity_Logs sheet
- `initializeLogSheet(sheet)` - Initialize sheet with proper structure

## Configuration Constants

### Event Types (`LOG_CONFIG.EVENTS`)
- Authentication: `LOGIN`, `LOGIN_ATTEMPT`, `LOGOUT`, `SIGNUP`
- Time tracking: `CLOCK_IN`, `CLOCK_OUT`, `LATE_ARRIVAL`, `EARLY_DEPARTURE`
- Time edits: `TIME_EDIT_REQUEST`, `TIME_EDIT_APPROVED`, `TIME_EDIT_DENIED`
- System: `GEOFENCE_VIOLATION`, `RATE_LIMIT`, `LATE_EMAIL`, `PAYMENT_CHECK`, `OFFLINE_SYNC`
- Admin: `PAYROLL_GENERATED`, `REPORT_GENERATED`, `INVOICE_CREATED`
- Errors: `ERROR`, `WARNING`, `SYSTEM`

### Project Types (`LOG_CONFIG.PROJECTS`)
- `TIME_TRACKING`, `PAYROLL`, `SCHEDULING`, `INVOICING`, `ADMIN`, `HR`, `OPERATIONS`, `QUICKBOOKS`, `WEB_FORMS`

### Status Values (`LOG_CONFIG.STATUS`)
- `SUCCESS`, `FAILED`, `WARNING`, `LATE`, `PENDING`, `COMPLETED`, `EMAIL_SENT`, `APPROVED`, `DENIED`, `IN_PROGRESS`

## Sheet Structure

| Column | Name | Type | Purpose |
|--------|------|------|---------|
| A | Log ID | Text | Unique identifier (Key) |
| B | Timestamp | DateTime | When event occurred |
| C | Event Type | Enum | Type of event |
| D | Worker ID | Ref | Employee identifier |
| E | Display Name | Text | Employee name |
| F | Event Summary | LongText | Human-readable description |
| G | Device | Text | Device/browser |
| H | Site | Ref | Work location |
| I | Distance | Number | Distance from site (miles) |
| J | Latitude | Number | GPS latitude |
| K | Longitude | Number | GPS longitude |
| L | Status | Enum | Event status |
| M | Project | Enum | System/project |
| N | Details | LongText | JSON details |

## AppSheet Integration

1. Connect spreadsheet to AppSheet
2. Set "Log ID" as Key column
3. Configure column types (Enum, Ref, Number)
4. Create views: All Logs, Map View, Timeline, By Worker, By Site
5. Add filters and actions as needed

## Migration from Old Logging

See MIGRATION_GUIDE.md for detailed instructions on migrating existing projects.

## Version History

- **v1.2.0** (2025-10-17)
  - Initial release
  - AppSheet-optimized structure
  - 12+ convenience functions
  - Query capabilities

## Support

For issues or questions, contact the development team.
