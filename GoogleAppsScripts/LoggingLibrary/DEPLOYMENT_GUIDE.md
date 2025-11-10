# Deployment Instructions - Centralized Logging System

## 🎯 Quick Start Deployment Guide

This guide will walk you through deploying the centralized logging library and integrating it with the EmployeeLogin project.

---

## Phase 1: Deploy the Logging Library

### Step 1: Initialize clasp for Library
```powershell
cd c:\Users\Steve\Desktop\GoogleAppsScripts\LoggingLibrary
clasp create --type standalone --title "Carolina Lumpers Logging Library"
```

**Expected Output:**
```
Created new standalone script: https://script.google.com/...
```

### Step 2: Push Library Code
```powershell
clasp push
```

**Expected Output:**
```
└─ CLS_Logging_Library.js
└─ appsscript.json
Pushed 2 files.
```

### Step 3: Test the Library
1. Open the library in Apps Script editor:
   ```powershell
   clasp open
   ```

2. In the Apps Script editor:
   - Select function: `testLoggingLibrary`
   - Click **Run**
   - Authorize the script when prompted
   - Check execution log for "✅" success messages

3. Verify test results:
   - New sheet named "Activity_Logs" should be created
   - Sheet should have 4-5 test log entries
   - All columns should be properly formatted
   - Log IDs should be unique (format: LOG-20251017...)

### Step 4: Deploy as Library
1. In Apps Script editor:
   - Click **Deploy** → **New deployment**
   - Select type: **Library**
   - Description: `Carolina Lumpers Centralized Logging v1.2.0`
   - Access: `Anyone with link` (or restrict to organization)
   - Click **Deploy**

2. **CRITICAL:** Save the Script ID
   ```
   Script ID: 1aAsNI4ZSFg843_MvwTUI8RgmYe-qt_njBfiPRBgOwwEjvVSS8KrBhtrv
   ```
   ✅ **SAVED!** Use this ID to add library to projects.

3. Document the Script ID:
   - Add to your password manager
   - Save to project documentation
   - Share with development team

---

## Phase 2: Integrate with EmployeeLogin Project

### Step 5: Add Library to EmployeeLogin
1. Open EmployeeLogin project in Apps Script editor:
   ```powershell
   cd c:\Users\Steve\Desktop\GoogleAppsScripts\EmployeeLogin
   clasp open
   ```

2. In Apps Script editor:
   - Click **Libraries** (+ icon in left sidebar)
   - Paste the **Script ID** from Step 4
   - Select **latest version** (should be version 1)
   - Set identifier: `CLLogger`
   - Click **Add**

3. Verify library is added:
   - You should see "CLLogger" in the Libraries list
   - Test in console:
     ```javascript
     Logger.log(CLLogger.LOG_CONFIG.SHEET_NAME);
     // Should output: "Activity_Logs"
     ```

### Step 6: Add Logger Wrapper to EmployeeLogin
The wrapper file `CLS_EmployeeLogin_Logger.js` has already been created in your project. You need to:

1. Verify it exists:
   ```powershell
   dir CLS_EmployeeLogin_Logger.js
   ```

2. If it doesn't exist in your local files, it needs to be added to your project's file list.

3. Push the new file to Google:
   ```powershell
   clasp push
   ```

4. Verify in Apps Script editor:
   - Refresh the editor
   - You should see `CLS_EmployeeLogin_Logger.js` in the file list

### Step 7: Test the Wrapper
1. In Apps Script editor, create a test function in any file (or use TestTools):
   ```javascript
   function testLoggingWrapper() {
     // Test clock-in logging
     const result = TT_LOGGER.logClockIn(
       {
         workerId: 'TEST001',
         displayName: 'Test User',
         device: 'Chrome Browser',
         language: 'en'
       },
       {
         siteName: 'Test Warehouse',
         distance: 0.15,
         latitude: 35.7796,
         longitude: -78.6382,
         clockinID: 'TEST-CLK-001',
         minutesLate: 0
       }
     );
     
     Logger.log('Test result:', result);
     
     // Verify in Activity_Logs sheet
     const ss = SpreadsheetApp.openById(SHEET_ID);
     const sheet = ss.getSheetByName('Activity_Logs');
     const lastRow = sheet.getLastRow();
     const lastEntry = sheet.getRange(lastRow, 1, 1, 14).getValues()[0];
     
     Logger.log('Last log entry:', lastEntry);
   }
   ```

2. Run `testLoggingWrapper()`
3. Check execution log for success
4. Open your spreadsheet and verify:
   - Activity_Logs sheet exists
   - New test entry is present
   - All columns are populated correctly

---

## Phase 3: Migrate Existing Logging Calls

### Step 8: Update handleClockIn Function

**Location:** `CLS_EmployeeLogin_ClockIn.js`

#### Current Implementation (Lines ~132-145):
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

#### New Implementation:
```javascript
// Get worker name
const workerName = getWorkerDisplayName_(workerId);

// Log clock-in with new system
TT_LOGGER.logClockIn(
  {
    workerId: workerId,
    displayName: workerName,
    device: 'Mobile App',  // TODO: Get from request parameters
    language: 'en'          // TODO: Get from user preferences
  },
  {
    siteName: nearestClient,
    distance: nearestDist,
    latitude: workerLat,
    longitude: workerLng,
    clockinID: clockinId,  // Use the generated clockinId
    minutesLate: minutesLate
  }
);
```

### Step 9: Update Geofence Violation Logging

**Location:** `CLS_EmployeeLogin_ClockIn.js` (Lines ~86-95)

#### Current:
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

#### New:
```javascript
const workerName = getWorkerDisplayName_(workerId);

TT_LOGGER.logGeofenceViolation(
  {
    workerId: workerId,
    displayName: workerName,
    device: 'Mobile App'
  },
  {
    latitude: workerLat,
    longitude: workerLng,
    nearestClient: nearestClient || 'Unknown',
    nearestAddress: nearestAddr || '',
    distance: nearestDist
  }
);
```

### Step 10: Update Rate Limit Logging

**Location:** `CLS_EmployeeLogin_ClockIn.js` (Line ~183)

#### Current:
```javascript
logEvent_('RateLimit', { workerId, diff, minutes });
```

#### New:
```javascript
const workerName = getWorkerDisplayName_(workerId);

TT_LOGGER.logRateLimit(
  workerId,
  workerName,
  diff,
  minutes,
  {
    lastClockinTime: lastClockinTime  // From context
  }
);
```

### Step 11: Update Late Email Logging

**Location:** `CLS_EmployeeLogin_ClockIn.js` (Lines ~269-277)

#### Current:
```javascript
logEvent_('LateEmail', {
  workerId: workerId,
  site: site,
  minutesLate: minutesLate,
  severity: severity
});
```

#### New:
```javascript
const workerName = getWorkerDisplayName_(workerId);

TT_LOGGER.logLateEmail(
  {
    workerId: workerId,
    displayName: workerName
  },
  {
    siteName: site,
    minutesLate: minutesLate,
    clockinTime: clockinTime,  // From context
    expectedTime: expectedTime, // From context
    severity: severity
  }
);
```

### Step 12: Update Time Edit Logging

**Location:** `CLS_EmployeeLogin_ClockIn.js` (Lines ~441, 556, 642)

#### Time Edit Request (Line ~441):
**Current:**
```javascript
logEvent_('TimeEditRequest', {
  employeeId: employeeId,
  recordId: recordId,
  originalTime: originalTime,
  requestedTime: requestedTime,
  reason: reason
});
```

**New:**
```javascript
const employeeName = getWorkerDisplayName_(employeeId);
const requestId = `EDIT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

TT_LOGGER.logTimeEditRequest(
  employeeId,
  employeeName,
  requestId,
  {
    recordId: recordId,
    originalTime: originalTime,
    requestedTime: requestedTime,
    reason: reason
  }
);
```

#### Time Edit Approved (Line ~556):
**Current:**
```javascript
logEvent_('TimeEditApproved', {
  employeeId: employeeId,
  approver: approverName,
  recordId: recordId,
  oldTime: oldTime,
  newTime: newTime
});
```

**New:**
```javascript
const employeeName = getWorkerDisplayName_(employeeId);
const requestId = editRequest.requestId || `EDIT-${recordId}`;  // Get from TimeEditRequests sheet

TT_LOGGER.logTimeEditApproval(
  employeeId,
  employeeName,
  approverName,
  requestId,
  {
    originalTime: oldTime,
    newTime: newTime,
    recordId: recordId
  }
);
```

#### Time Edit Denied (Line ~642):
**Current:**
```javascript
logEvent_('TimeEditDenied', {
  employeeId: employeeId,
  approver: approverName,
  recordId: recordId,
  reason: 'Denied by admin'
});
```

**New:**
```javascript
const employeeName = getWorkerDisplayName_(employeeId);
const requestId = editRequest.requestId || `EDIT-${recordId}`;

TT_LOGGER.logTimeEditDenial(
  employeeId,
  employeeName,
  approverName,
  requestId,
  'Denied by admin'  // Or get reason from request
);
```

---

## Phase 4: Push Changes and Test

### Step 13: Push Updated Code
```powershell
cd c:\Users\Steve\Desktop\GoogleAppsScripts\EmployeeLogin
clasp push
```

**Verify:**
- All files push successfully
- No syntax errors reported

### Step 14: Test in Production
1. Test each migration:
   - Clock-in event
   - Geofence violation
   - Rate limit
   - Late email
   - Time edit request/approval/denial

2. Use test functions or trigger real events

3. Verify in Activity_Logs sheet:
   - Events appear with correct data
   - Log IDs are unique
   - Timestamps are correct
   - Display names are populated
   - GPS coordinates are present
   - JSON details are valid

### Step 15: Monitor for 24 Hours
- Check Activity_Logs sheet for new entries
- Verify all event types are logging
- Check for any errors in execution logs
- Confirm no data loss

---

## Phase 5: Clean Up (Optional)

### Step 16: Archive Old Log Sheet
Once you've verified the new system is working:

1. Rename old "Log" sheet to "Log_Archive"
2. Keep for historical reference
3. Eventually export and delete if needed

### Step 17: Remove Old Logging Function
In `CLS_EmployeeLogin_Utils.js`, comment out or remove the old `logEvent_()` function (lines ~95-110):

```javascript
// DEPRECATED - Use TT_LOGGER instead
// function logEvent_(event, details) { ... }
```

---

## 🔍 Verification Checklist

- [ ] Logging library created and pushed
- [ ] Test function runs successfully
- [ ] Library deployed with Script ID saved
- [ ] Library added to EmployeeLogin project
- [ ] Logger wrapper file added and pushed
- [ ] Wrapper test function runs successfully
- [ ] All logging calls updated in ClockIn module
- [ ] Updated code pushed to Google
- [ ] Test clock-in creates Activity_Logs entry
- [ ] All columns populated correctly
- [ ] Display names appear (not just IDs)
- [ ] GPS coordinates present for location events
- [ ] JSON details are valid
- [ ] No errors in execution logs
- [ ] Monitored for 24 hours successfully
- [ ] Old Log sheet archived (optional)
- [ ] Old logEvent_ function removed (optional)

---

## 🆘 Troubleshooting

### Library Not Found
**Error:** `ReferenceError: CLLogger is not defined`

**Solution:**
1. Verify library is added: Check Libraries section in editor
2. Correct identifier: Should be `CLLogger` (case-sensitive)
3. Latest version: Select highest version number
4. Save and refresh: Save project, close and reopen editor

### Missing Display Names
**Issue:** Display Name column shows IDs instead of names

**Solution:**
1. Verify Workers sheet has `FullName` or `Name` column
2. Check `getWorkerDisplayName_()` function in Logger.js
3. Add fallback: Use workerId if name not found

### Logs Not Appearing
**Issue:** No entries in Activity_Logs sheet

**Solution:**
1. Check SHEET_ID is correct in Config
2. Verify spreadsheet permissions
3. Check execution logs for errors:
   - View → Execution log
   - Look for error messages
4. Test with simple logSystem call

### Permission Errors
**Error:** `You do not have permission to call...`

**Solution:**
1. Reauthorize the script:
   - Run any function
   - Click "Review permissions"
   - Allow access
2. Check spreadsheet sharing settings
3. Verify account has edit access

---

## 📊 Success Metrics

After successful deployment, you should see:

1. **Activity_Logs Sheet:**
   - All 14 columns with proper headers
   - Unique Log IDs for each entry
   - Readable event summaries
   - GPS coordinates for location events
   - Detailed JSON in Details column

2. **Event Coverage:**
   - Clock-in events logging
   - Geofence violations logging
   - Rate limits logging
   - Late emails logging
   - Time edits logging
   - System events logging

3. **Data Quality:**
   - No null/undefined in key fields
   - No "-" placeholder values
   - Timestamps in correct timezone
   - Numbers in proper format
   - JSON is parseable

---

## 📱 Next Steps: AppSheet Integration

Once logging is stable:

1. Open AppSheet app builder
2. Add Google Sheets data source
3. Select your spreadsheet
4. Configure Activity_Logs table:
   - Set Log ID as Key
   - Configure column types (Enum, Ref, Number)
   - Add Refs to Workers and Clients sheets
5. Create views (Map, Timeline, Filters)
6. Deploy to mobile app

See `APPSHEET_SETUP.md` for detailed instructions (to be created).

---

## 🎉 Congratulations!

If you've completed all steps, your EmployeeLogin project is now using the centralized logging system!

Next projects to integrate:
- PayrollProject
- InvoiceProject
- ClockinFlow
- Web Forms Processing

For each project, repeat Phase 2-4 with project-specific wrappers.
