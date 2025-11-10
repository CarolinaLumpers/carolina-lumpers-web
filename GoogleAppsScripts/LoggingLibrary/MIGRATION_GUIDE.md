# Migration Guide: Centralized Logging System

## Overview
This guide walks through migrating existing Google Apps Script projects to use the centralized Carolina Lumpers Logging Library.

## Prerequisites
- ✅ Logging library deployed with Script ID saved
- ✅ Backup of current project code
- ✅ Test spreadsheet for validation

## Migration Process

### Phase 1: Add Library to Project

1. **Open Project in Apps Script Editor**
   ```bash
   cd GoogleAppsScripts/[ProjectName]
   clasp open
   ```

2. **Add Library Reference**
   - Click Libraries (+ icon in left sidebar)
   - Paste the Script ID
   - Select latest version
   - Set identifier: `CLLogger`
   - Click Add

3. **Verify Library Access**
   Test in Apps Script console:
   ```javascript
   function testLibrary() {
     Logger.log(CLLogger.LOG_CONFIG.SHEET_NAME);
     Logger.log(CLLogger.LOG_CONFIG.EVENTS.CLOCK_IN);
   }
   ```

### Phase 2: Create Project Wrapper

Create a new file in your project (e.g., `ProjectName_Logger.js`) with wrapper functions:

```javascript
// ======================================================
// Project-Specific Logging Wrapper
// ======================================================

const PROJECT_LOGGER = {
  PROJECT_NAME: CLLogger.LOG_CONFIG.PROJECTS.TIME_TRACKING,
  
  // Wrapper for clock-in events
  logClockIn: function(workerData, locationData) {
    return CLLogger.logClockIn(
      workerData.workerId,
      workerData.displayName,
      locationData.siteName,
      locationData.distance,
      locationData.latitude,
      locationData.longitude,
      {
        device: workerData.device || '',
        clockinID: locationData.clockinID || '',
        minutesLate: locationData.minutesLate || 0,
        sheetId: SHEET_ID,  // Your project's SHEET_ID
        project: this.PROJECT_NAME,
        details: {
          geofenceRadius: GEOFENCE_RADIUS_MI,
          language: workerData.language
        }
      }
    );
  },
  
  // Wrapper for login events
  logLogin: function(workerData) {
    return CLLogger.logLogin(
      workerData.workerId,
      workerData.displayName,
      workerData.device || 'Web Browser',
      workerData.email,
      {
        sheetId: SHEET_ID,
        project: this.PROJECT_NAME,
        details: {
          role: workerData.role,
          biometric: workerData.biometric || false
        }
      }
    );
  },
  
  // Wrapper for geofence violations
  logGeofenceViolation: function(workerData, locationData) {
    return CLLogger.logGeofenceViolation(
      workerData.workerId,
      workerData.displayName || 'Unknown',
      locationData.distance,
      locationData.latitude,
      locationData.longitude,
      {
        device: workerData.device || '',
        nearestSite: locationData.nearestClient || 'Unknown',
        geofenceRadius: GEOFENCE_RADIUS_MI,
        sheetId: SHEET_ID,
        project: this.PROJECT_NAME
      }
    );
  },
  
  // Wrapper for rate limit warnings
  logRateLimit: function(workerId, displayName, diff, minutes) {
    return CLLogger.logRateLimit(
      workerId,
      displayName || workerId,
      diff,
      minutes,
      {
        sheetId: SHEET_ID,
        project: this.PROJECT_NAME
      }
    );
  },
  
  // Wrapper for late arrival emails
  logLateEmail: function(workerData, lateData) {
    return CLLogger.logLateEmail(
      workerData.workerId,
      workerData.displayName,
      lateData.siteName,
      lateData.minutesLate,
      {
        sheetId: SHEET_ID,
        project: this.PROJECT_NAME,
        details: {
          recipients: [INFO_EMAIL, CC_EMAIL],
          clockinTime: lateData.clockinTime,
          expectedTime: lateData.expectedTime
        }
      }
    );
  },
  
  // Wrapper for time edit requests
  logTimeEditRequest: function(employeeId, employeeName, requestId, editData) {
    return CLLogger.logTimeEditRequest(
      employeeId,
      employeeName,
      requestId,
      {
        recordId: editData.recordId,
        originalTime: editData.originalTime,
        requestedTime: editData.requestedTime,
        reason: editData.reason,
        sheetId: SHEET_ID,
        project: this.PROJECT_NAME
      }
    );
  },
  
  // Wrapper for time edit approvals
  logTimeEditApproval: function(employeeId, employeeName, approverName, requestId, editData) {
    return CLLogger.logTimeEditApproval(
      employeeId,
      employeeName,
      approverName,
      requestId,
      {
        originalTime: editData.originalTime,
        newTime: editData.newTime,
        sheetId: SHEET_ID,
        project: this.PROJECT_NAME
      }
    );
  },
  
  // Wrapper for time edit denials
  logTimeEditDenial: function(employeeId, employeeName, approverName, requestId, reason) {
    return CLLogger.logTimeEditDenial(
      employeeId,
      employeeName,
      approverName,
      requestId,
      {
        reason: reason,
        sheetId: SHEET_ID,
        project: this.PROJECT_NAME
      }
    );
  },
  
  // Wrapper for system events
  logSystem: function(message, details) {
    return CLLogger.logSystem(
      message,
      {
        sheetId: SHEET_ID,
        project: this.PROJECT_NAME,
        details: details
      }
    );
  },
  
  // Wrapper for errors
  logError: function(userId, displayName, errorMessage, errorDetails) {
    return CLLogger.logError(
      userId || 'SYSTEM',
      displayName || 'System',
      errorMessage,
      {
        sheetId: SHEET_ID,
        project: this.PROJECT_NAME,
        function: errorDetails?.function,
        stack: errorDetails?.stack,
        details: errorDetails
      }
    );
  }
};
```

### Phase 3: Replace Old Logging Calls

#### Example 1: Clock-In Event

**OLD CODE:**
```javascript
logEvent_('ClockIn', {
  workerId: workerId,
  site: nearestClient,
  distance: nearestDist.toFixed(2),
  latitude: workerLat,
  longitude: workerLng,
  minutesLate: minutesLate
});
```

**NEW CODE:**
```javascript
PROJECT_LOGGER.logClockIn(
  {
    workerId: workerId,
    displayName: workerName,  // Add this
    device: userDevice        // Add this
  },
  {
    siteName: nearestClient,
    distance: nearestDist,
    latitude: workerLat,
    longitude: workerLng,
    clockinID: clockinId,     // Add this
    minutesLate: minutesLate
  }
);
```

#### Example 2: Geofence Violation

**OLD CODE:**
```javascript
logEvent_('GeofenceViolation', {
  workerId: workerId,
  latitude: workerLat,
  longitude: workerLng,
  nearestClient: nearestClient || 'none',
  distance: isFinite(nearestDist) ? nearestDist.toFixed(2) : '',
  geofenceLimit: GEOFENCE_RADIUS_MI,
  mapsLink: mapsLink
});
```

**NEW CODE:**
```javascript
PROJECT_LOGGER.logGeofenceViolation(
  {
    workerId: workerId,
    displayName: workerName  // Add this
  },
  {
    latitude: workerLat,
    longitude: workerLng,
    nearestClient: nearestClient || 'Unknown',
    distance: nearestDist
  }
);
```

#### Example 3: Rate Limit

**OLD CODE:**
```javascript
logEvent_('RateLimit', { workerId, diff, minutes });
```

**NEW CODE:**
```javascript
PROJECT_LOGGER.logRateLimit(
  workerId,
  workerName,  // Add this
  diff,
  minutes
);
```

#### Example 4: Time Edit Request

**OLD CODE:**
```javascript
logEvent_('TimeEditRequest', {
  employeeId: employeeId,
  recordId: recordId,
  originalTime: originalTime,
  requestedTime: requestedTime,
  reason: reason
});
```

**NEW CODE:**
```javascript
PROJECT_LOGGER.logTimeEditRequest(
  employeeId,
  employeeName,    // Add this
  requestId,       // Add this (generate unique ID)
  {
    recordId: recordId,
    originalTime: originalTime,
    requestedTime: requestedTime,
    reason: reason
  }
);
```

### Phase 4: Update Function Signatures

Some functions may need to accept additional parameters:

**BEFORE:**
```javascript
function handleClockIn(workerId, lat, lng) {
  // ... clock-in logic ...
  logEvent_('ClockIn', { ... });
}
```

**AFTER:**
```javascript
function handleClockIn(workerId, lat, lng, workerName, device) {
  // ... clock-in logic ...
  PROJECT_LOGGER.logClockIn(
    { workerId, displayName: workerName, device },
    { siteName, distance, latitude, longitude, clockinID, minutesLate }
  );
}
```

Update calling code to pass additional parameters:
```javascript
// In CLS_EmployeeLogin_Main.js doGet handler
const result = handleClockIn(
  workerId, 
  lat, 
  lng,
  workerName,  // NEW
  device       // NEW
);
```

### Phase 5: Remove Old Logging Function

Once all calls are migrated, you can remove the old `logEvent_()` function:

1. **Search for remaining calls:**
   ```
   Find in project: "logEvent_"
   ```

2. **Verify all are replaced**

3. **Comment out or remove old function:**
   ```javascript
   // DEPRECATED - Use PROJECT_LOGGER instead
   // function logEvent_(event, details) { ... }
   ```

### Phase 6: Test Migration

1. **Create test function:**
   ```javascript
   function testMigration() {
     // Test clock-in
     const result1 = PROJECT_LOGGER.logClockIn(
       { workerId: 'TEST001', displayName: 'Test User', device: 'Test Device' },
       { siteName: 'Test Site', distance: 0.1, latitude: 35.7796, longitude: -78.6382, clockinID: 'TEST-CLK-001', minutesLate: 0 }
     );
     Logger.log('Clock-in test:', result1);
     
     // Test login
     const result2 = PROJECT_LOGGER.logLogin({
       workerId: 'TEST001',
       displayName: 'Test User',
       device: 'Chrome',
       email: 'test@example.com'
     });
     Logger.log('Login test:', result2);
     
     // Test system event
     const result3 = PROJECT_LOGGER.logSystem('Migration test completed');
     Logger.log('System test:', result3);
   }
   ```

2. **Run test function**
3. **Verify Activity_Logs sheet has entries**
4. **Check data quality:**
   - All columns populated correctly
   - No "-" placeholders (should be empty or null)
   - JSON details are valid
   - Timestamps are correct timezone

### Phase 7: Deploy and Monitor

1. **Push changes:**
   ```bash
   clasp push
   ```

2. **Monitor for 24-48 hours:**
   - Check Activity_Logs sheet for new entries
   - Verify no errors in execution logs
   - Confirm all event types are logging

3. **Archive old Log sheet (optional):**
   - Rename old "Log" sheet to "Log_Archive"
   - Keep for historical reference

## Data Comparison

### Old Format (Log sheet)
```
| Timestamp           | Event              | Details                           |
|---------------------|--------------------|-----------------------------------|
| 2025-10-17 08:05:23 | ClockIn            | {"workerId":"CLS001","site":"..."} |
| 2025-10-17 08:10:45 | GeofenceViolation  | {"workerId":"CLS002","..."} |
```

### New Format (Activity_Logs sheet)
```
| Log ID              | Timestamp           | Event Type         | Worker ID | Display Name | Event Summary              | ... |
|---------------------|---------------------|--------------------|-----------|--------------|----------------------------|-----|
| LOG-20251017080523-A3F9 | 2025-10-17 08:05:23 | Clock In       | CLS001    | John Doe     | John Doe clocked in at...  | ... |
| LOG-20251017081045-B7K2 | 2025-10-17 08:10:45 | Geofence Violation | CLS002 | Jane Smith   | Jane Smith attempted...    | ... |
```

## Troubleshooting

### Library Not Found
**Issue:** `CLLogger is not defined`
**Solution:** 
1. Verify library is added to project
2. Check Script ID is correct
3. Ensure latest version is selected
4. Save and refresh editor

### Missing Worker Name
**Issue:** Display Name column is empty
**Solution:**
1. Update function signatures to accept worker name
2. Query Workers sheet to get name from ID
3. Use fallback: `displayName || workerId`

### Logs Not Appearing
**Issue:** No entries in Activity_Logs sheet
**Solution:**
1. Check `sheetId` is correct in wrapper
2. Verify spreadsheet permissions
3. Check Apps Script execution logs for errors
4. Ensure SHEET_ID constant is defined

### Performance Issues
**Issue:** Logging is slow
**Solution:**
1. Batch logs if logging many events
2. Use background/async logging for high-volume
3. Consider caching sheet reference
4. Archive old logs periodically

## Checklist

- [ ] Library deployed with Script ID saved
- [ ] Library added to project
- [ ] Wrapper file created
- [ ] All old logging calls identified
- [ ] Worker names added to function signatures
- [ ] All logging calls replaced
- [ ] Old logging function removed/commented
- [ ] Test function created and run
- [ ] Activity_Logs sheet verified
- [ ] Code pushed to production
- [ ] Monitoring for 24-48 hours
- [ ] Old Log sheet archived

## Next Project

Once one project is successfully migrated, repeat the process for:
1. ✅ EmployeeLogin (Time Tracking)
2. ⏳ PayrollProject
3. ⏳ InvoiceProject
4. ⏳ ClockinFlow
5. ⏳ Web Forms Processing

## Support

For migration assistance, contact the development team or refer to:
- Library README.md
- Project-specific documentation
- Apps Script execution logs
