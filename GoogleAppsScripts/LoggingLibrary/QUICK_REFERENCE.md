# 🚀 Quick Reference Card - Carolina Lumpers Logging

## Library Functions (CLLogger)

### Core Function
```javascript
CLLogger.logEvent(eventType, userId, displayName, summary, options)
```

### Authentication Events
```javascript
CLLogger.logLogin(workerId, displayName, device, email, options)
CLLogger.logLoginAttempt(email, success, device, options)
```

### Time Tracking Events
```javascript
CLLogger.logClockIn(workerId, displayName, site, distance, lat, lng, options)
CLLogger.logClockOut(workerId, displayName, site, hoursWorked, options)
```

### Time Edit Events
```javascript
CLLogger.logTimeEditRequest(employeeId, employeeName, requestId, options)
CLLogger.logTimeEditApproval(employeeId, employeeName, approverName, requestId, options)
CLLogger.logTimeEditDenial(employeeId, employeeName, approverName, requestId, options)
```

### System Events
```javascript
CLLogger.logGeofenceViolation(workerId, displayName, distance, lat, lng, options)
CLLogger.logRateLimit(workerId, displayName, minutesSince, rateLimit, options)
CLLogger.logLateEmail(workerId, displayName, site, minutesLate, options)
CLLogger.logSystem(message, options)
CLLogger.logError(userId, displayName, errorMessage, options)
```

### Query Functions
```javascript
CLLogger.getLogById(logId, options)
CLLogger.getLogs(filters, options)
```

---

## EmployeeLogin Wrapper (TT_LOGGER)

### Quick Usage
```javascript
// Clock-in
TT_LOGGER.logClockIn(workerData, locationData)

// Login
TT_LOGGER.logLogin(workerData)

// Geofence violation
TT_LOGGER.logGeofenceViolation(workerData, locationData)

// Rate limit
TT_LOGGER.logRateLimit(workerId, displayName, diff, minutes)

// Late email
TT_LOGGER.logLateEmail(workerData, lateData)

// Time edits
TT_LOGGER.logTimeEditRequest(employeeId, employeeName, requestId, editData)
TT_LOGGER.logTimeEditApproval(employeeId, employeeName, approverName, requestId, editData)
TT_LOGGER.logTimeEditDenial(employeeId, employeeName, approverName, requestId, reason)

// System/Error
TT_LOGGER.logSystem(message, details)
TT_LOGGER.logError(userId, displayName, errorMessage, errorDetails)
```

---

## Configuration Constants

### Event Types (CLLogger.LOG_CONFIG.EVENTS)
```javascript
LOGIN, LOGIN_ATTEMPT, LOGOUT, SIGNUP
CLOCK_IN, CLOCK_OUT, LATE_ARRIVAL, EARLY_DEPARTURE
TIME_EDIT_REQUEST, TIME_EDIT_APPROVED, TIME_EDIT_DENIED
GEOFENCE_VIOLATION, RATE_LIMIT, LATE_EMAIL, PAYMENT_CHECK, OFFLINE_SYNC
PAYROLL_GENERATED, REPORT_GENERATED, INVOICE_CREATED
ERROR, WARNING, SYSTEM
```

### Projects (CLLogger.LOG_CONFIG.PROJECTS)
```javascript
TIME_TRACKING, PAYROLL, SCHEDULING, INVOICING
ADMIN, HR, OPERATIONS, QUICKBOOKS, WEB_FORMS
```

### Status Values (CLLogger.LOG_CONFIG.STATUS)
```javascript
SUCCESS, FAILED, WARNING, LATE, PENDING
COMPLETED, EMAIL_SENT, APPROVED, DENIED, IN_PROGRESS
```

---

## Common Patterns

### Pattern 1: Clock-In with Late Check
```javascript
const workerName = getWorkerDisplayName_(workerId);
const minutesLate = calculateMinutesLate(clockinTime);

TT_LOGGER.logClockIn(
  { workerId, displayName: workerName, device, language: 'en' },
  { siteName, distance, latitude, longitude, clockinID, minutesLate }
);
```

### Pattern 2: Error Logging in Catch Block
```javascript
try {
  // ... your code ...
} catch (err) {
  TT_LOGGER.logError(
    userId || 'SYSTEM',
    displayName || 'System',
    err.toString(),
    { function: 'functionName', stack: err.stack }
  );
}
```

### Pattern 3: Geofence Check
```javascript
if (distance > GEOFENCE_RADIUS_MI) {
  const workerName = getWorkerDisplayName_(workerId);
  
  TT_LOGGER.logGeofenceViolation(
    { workerId, displayName: workerName, device },
    { latitude, longitude, nearestClient, distance }
  );
  
  return { success: false, message: 'Outside authorized area' };
}
```

### Pattern 4: Rate Limit Check
```javascript
if (minutesSinceLastClockin < RATE_LIMIT_MINUTES) {
  const workerName = getWorkerDisplayName_(workerId);
  
  TT_LOGGER.logRateLimit(
    workerId,
    workerName,
    minutesSinceLastClockin,
    RATE_LIMIT_MINUTES,
    { lastClockinTime: formattedTime }
  );
  
  return { success: false, message: 'Please wait...' };
}
```

---

## Deployment Commands

```powershell
# Deploy Library
cd GoogleAppsScripts\LoggingLibrary
clasp create --type standalone --title "Carolina Lumpers Logging Library"
clasp push
clasp open  # Then deploy as library in editor

# Add to EmployeeLogin
cd GoogleAppsScripts\EmployeeLogin
# Add library in Apps Script editor with Script ID
clasp push

# Push updates
clasp push
```

---

## Testing Commands

```javascript
// Test library
testLoggingLibrary()

// Test wrapper
testLoggingWrapper()

// Test migration
testAllLoggingMigration()
```

---

## Activity_Logs Sheet Structure

| Col | Name | Type | Description |
|-----|------|------|-------------|
| A | Log ID | Text | Unique key (LOG-...) |
| B | Timestamp | DateTime | Event time |
| C | Event Type | Enum | Event category |
| D | Worker ID | Ref | Employee ID |
| E | Display Name | Text | Employee name |
| F | Event Summary | LongText | Human-readable |
| G | Device | Text | Device/browser |
| H | Site | Ref | Work location |
| I | Distance | Number | Distance (mi) |
| J | Latitude | Number | GPS lat |
| K | Longitude | Number | GPS lng |
| L | Status | Enum | Event status |
| M | Project | Enum | System ID |
| N | Details | LongText | JSON details |

---

## Troubleshooting Quick Fixes

### Library not found
```javascript
// Verify in Apps Script editor:
Logger.log(CLLogger.LOG_CONFIG.SHEET_NAME);
// Should output: "Activity_Logs"
```

### No display names
```javascript
// Check helper function
const name = getWorkerDisplayName_(workerId);
Logger.log(`Worker: ${name}`);
```

### Logs not appearing
```javascript
// Test with simple system log
TT_LOGGER.logSystem('Test message');
// Check Activity_Logs sheet
```

---

## Migration Checklist

- [ ] Library deployed with Script ID saved
- [ ] Library added to project (Libraries section)
- [ ] Wrapper file pushed
- [ ] Test function runs successfully
- [ ] All logging calls identified
- [ ] Worker names added to calls
- [ ] All logging calls updated
- [ ] Code pushed to Google
- [ ] Production test successful
- [ ] Activity_Logs verified
- [ ] 24-hour monitoring complete

---

## Remember!

✅ **Always** get worker name before logging  
✅ **Always** pass distance as number (not string)  
✅ **Always** include sheetId in options  
✅ **Always** use wrapper functions (TT_LOGGER)  
✅ **Always** log errors in catch blocks  
✅ **Always** test after making changes  
✅ **Always** monitor Activity_Logs sheet  

❌ **Never** use old `logEvent_()` after migration  
❌ **Never** pass "-" placeholders (use null/empty)  
❌ **Never** forget to generate unique IDs  
❌ **Never** deploy without testing  
❌ **Never** lose the Script ID  

---

## Quick Links

- **Library Code**: `GoogleAppsScripts/LoggingLibrary/CLS_Logging_Library.js`
- **Wrapper Code**: `GoogleAppsScripts/EmployeeLogin/CLS_EmployeeLogin_Logger.js`
- **Deployment Guide**: `GoogleAppsScripts/LoggingLibrary/DEPLOYMENT_GUIDE.md`
- **Code Examples**: `GoogleAppsScripts/LoggingLibrary/CODE_EXAMPLES.md`
- **Migration Guide**: `GoogleAppsScripts/LoggingLibrary/MIGRATION_GUIDE.md`

---

**Version**: 1.2.0  
**Last Updated**: October 17, 2025  
**Status**: Production Ready 🚀
