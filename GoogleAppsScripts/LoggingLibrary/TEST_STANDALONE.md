# Testing Standalone (Non-Container-Bound) Projects

## Problem
When a Google Apps Script project is **not** container-bound to a spreadsheet, calling `SpreadsheetApp.getActiveSpreadsheet()` returns `null`, causing logging to fail.

## Solution
**Always pass `sheetId` in the options parameter** when calling the logging library from standalone projects.

## ✅ Correct Usage for EmployeeLogin Project

The EmployeeLogin wrapper (`CLS_EmployeeLogin_Logger.js`) already does this correctly:

```javascript
logClockIn: function(workerData, locationData) {
  return CLLogger.logClockIn(
    workerData.workerId,
    workerData.displayName,
    locationData.siteName,
    locationData.distance,
    locationData.latitude,
    locationData.longitude,
    {
      device: workerData.device || 'Unknown Device',
      clockinID: locationData.clockinID || '',
      minutesLate: locationData.minutesLate || 0,
      sheetId: SHEET_ID,  // ✅ CRITICAL: Explicitly pass sheet ID
      project: CLLogger.LOG_CONFIG.PROJECTS.TIME_TRACKING,
      details: {
        geofenceRadius: GEOFENCE_RADIUS_MI,
        language: workerData.language || 'en',
        timestamp: new Date().toISOString()
      }
    }
  );
}
```

## Test Function for Standalone Projects

Add this to `CLS_EmployeeLogin_TestTools.js`:

```javascript
/**
 * Test the centralized logging library from standalone project
 * MUST pass sheetId explicitly since this is not container-bound
 */
function testLoggingLibrary() {
  Logger.log('Starting logging library test...');
  Logger.log('Sheet ID: ' + SHEET_ID);
  
  try {
    // Check if library is available
    if (typeof CLLogger === 'undefined') {
      throw new Error('CLLogger library not found! Add library with Script ID: 1aAsNI4ZSFg843_MvwTUI8RgmYe-qt_njBfiPRBgOwwEjvVSS8KrBhtrv');
    }
    
    Logger.log('✅ CLLogger library found');
    
    // Test 1: Direct logEvent call with explicit sheetId
    Logger.log('\nTest 1: Direct logEvent call');
    const result1 = CLLogger.logEvent(
      'System Event',
      'SYSTEM',
      'Test System',
      'Testing standalone project integration',
      {
        sheetId: SHEET_ID,  // ✅ CRITICAL for standalone projects
        project: 'TIME_TRACKING',
        details: {
          test: true,
          projectType: 'standalone',
          timestamp: new Date().toISOString()
        }
      }
    );
    
    Logger.log('Result: ' + JSON.stringify(result1));
    
    if (!result1.success) {
      throw new Error('Test 1 failed: ' + result1.error);
    }
    Logger.log('✅ Test 1 passed - Log ID: ' + result1.logId);
    
    // Test 2: Using wrapper function (which includes sheetId)
    Logger.log('\nTest 2: Wrapper function (TT_LOGGER)');
    const result2 = TT_LOGGER.logSystem(
      'Testing wrapper from standalone project'
    );
    
    Logger.log('Result: ' + JSON.stringify(result2));
    
    if (!result2.success) {
      throw new Error('Test 2 failed: ' + result2.error);
    }
    Logger.log('✅ Test 2 passed - Log ID: ' + result2.logId);
    
    // Test 3: Clock-in event with all parameters
    Logger.log('\nTest 3: Clock-in event');
    const result3 = TT_LOGGER.logClockIn(
      {
        workerId: 'TEST001',
        displayName: 'Test Worker (Standalone)',
        device: 'Chrome Browser',
        language: 'en'
      },
      {
        siteName: 'Test Warehouse',
        distance: 0.15,
        latitude: 35.7796,
        longitude: -78.6382,
        clockinID: 'TEST-CLK-' + Date.now(),
        minutesLate: 0
      }
    );
    
    Logger.log('Result: ' + JSON.stringify(result3));
    
    if (!result3.success) {
      throw new Error('Test 3 failed: ' + result3.error);
    }
    Logger.log('✅ Test 3 passed - Log ID: ' + result3.logId);
    
    // Summary
    Logger.log('\n========================================');
    Logger.log('✅ ALL TESTS PASSED!');
    Logger.log('========================================');
    Logger.log('Log IDs created:');
    Logger.log('  1. ' + result1.logId);
    Logger.log('  2. ' + result2.logId);
    Logger.log('  3. ' + result3.logId);
    Logger.log('\n📊 Verify in Google Sheets:');
    Logger.log('https://docs.google.com/spreadsheets/d/' + SHEET_ID);
    Logger.log('Look for the "Activity_Logs" sheet');
    Logger.log('You should see 3 test entries');
    
    return {
      success: true,
      message: 'All tests passed! Check Activity_Logs sheet.',
      testsRun: 3,
      logIds: [result1.logId, result2.logId, result3.logId],
      sheetUrl: 'https://docs.google.com/spreadsheets/d/' + SHEET_ID
    };
    
  } catch (error) {
    Logger.log('\n========================================');
    Logger.log('❌ TEST FAILED');
    Logger.log('========================================');
    Logger.log('Error: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
    
    return {
      success: false,
      error: error.toString(),
      stack: error.stack
    };
  }
}
```

## Common Errors

### ❌ Error: "No active spreadsheet found"
**Cause:** Not passing `sheetId` in options
**Fix:** Add `sheetId: SHEET_ID` to options parameter

### ❌ Error: "CLLogger is not defined"
**Cause:** Library not added to project
**Fix:** In Apps Script editor:
1. Click Libraries (+)
2. Add Script ID: `1aAsNI4ZSFg843_MvwTUI8RgmYe-qt_njBfiPRBgOwwEjvVSS8KrBhtrv`
3. Identifier: `CLLogger`
4. Version: Latest

### ❌ Error: "SHEET_ID is not defined"
**Cause:** Config constant missing
**Fix:** Define in `CLS_EmployeeLogin_Config.js`:
```javascript
const SHEET_ID = '1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk';
```

## Verification Checklist

- ✅ Library added with Script ID
- ✅ Identifier set to `CLLogger`
- ✅ Version selected (not blank)
- ✅ `SHEET_ID` constant defined in Config
- ✅ All wrapper functions pass `sheetId: SHEET_ID` in options
- ✅ Test function runs without errors
- ✅ Activity_Logs sheet created in target spreadsheet
- ✅ Test entries visible with all 14 columns populated
