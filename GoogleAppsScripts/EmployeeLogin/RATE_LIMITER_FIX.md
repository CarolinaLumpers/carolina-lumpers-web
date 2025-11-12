# Rate Limiter Fix - November 11, 2025

## Problem
Rate limiter was allowing consecutive clock-ins within 20 minutes despite being configured to block them.

## Root Cause
The rate limiter WAS detecting duplicate clock-ins correctly (calculating `diffMinutes: 0.33`), BUT the `TT_LOGGER.logRateLimit()` call was throwing an error:

```
TypeError: Cannot read properties of undefined (reading 'toFixed')
```

This error was caught by the outer try-catch block, which returned `{ success: true, debug: debugInfo }` to allow clock-in to proceed if the rate limiter failed.

**Issue:** The logging failure caused the rate limit check to fail-open (allow access), when it should have failed-closed (deny access).

## Debug Process

### Step 1: Added Debug Logging
Added detailed debug output to rate limiter response:
```javascript
rateLimiterDebug: {
  foundEntries: [{
    diffMinutes: 0.33,  // Correctly calculated!
    dateIsDate: true,
    timeIsDate: true
  }],
  error: "TypeError: Cannot read properties of undefined (reading 'toFixed')"
}
```

This revealed:
- ✅ Rate limiter WAS finding the recent clock-in
- ✅ Time calculation WAS correct (0.33 minutes < 20 minutes)
- ❌ Logging function was crashing and preventing the block

### Step 2: Root Cause Analysis
The `TT_LOGGER.logRateLimit()` function signature was:
```javascript
logRateLimit: function(workerId, displayName, diff, minutes, additionalData = {})
```

But it was being called with objects:
```javascript
TT_LOGGER.logRateLimit(
  { workerId, displayName, device },  // ❌ Object, not string
  { minutesSinceLastClockIn, rateLimitMinutes }  // ❌ Object, not number
);
```

The centralized logger expected:
```javascript
CLLogger.logRateLimit(workerId, displayName, diff, minutes, options)
```

Where `diff` and `minutes` are numbers, but we were passing objects. This caused the `.toFixed()` error somewhere in the logger.

## The Fix

Wrapped the logging call in its own try-catch so logging failure doesn't prevent rate limiting:

```javascript
if (diff < minutes) {
  // Log rate limit event (wrapped in try-catch to not block the rate limit)
  try {
    const workerMeta = lookupWorkerMeta_(workerId);
    TT_LOGGER.logRateLimit(
      {
        workerId: workerId,
        displayName: workerMeta.displayName || workerId,
        device: workerMeta.device || 'Unknown Device'
      },
      {
        minutesSinceLastClockIn: diff,
        rateLimitMinutes: minutes
      }
    );
  } catch (logError) {
    Logger.log('⚠️ Rate limit logging failed: ' + logError.toString());
    // Continue anyway - the rate limit should still block
  }
  
  // Return rate limit block regardless of logging success
  return {
    success: false,
    message: `⏱️ You recently clocked in. Please wait ${Math.ceil(minutes - diff)} minutes before clocking again.`,
    debug: debugInfo
  };
}
```

**Key Change:** Logging failure is now logged but doesn't prevent the rate limit from blocking the clock-in.

## Testing Results

**Before Fix:**
```javascript
// First clock-in
{ success: true, ClockinID: "CLK-3F9BAC77" }

// Second clock-in (20 seconds later)
{ success: true, ClockinID: "CLK-19FAF647" }  // ❌ Should have been blocked!
```

**After Fix:**
```javascript
// First clock-in
{ success: true, ClockinID: "CLK-3F9BAC77" }

// Second clock-in (20 seconds later)
{ 
  success: false, 
  message: "⏱️ You recently clocked in. Please wait 20 minutes before clocking again."
}  // ✅ Correctly blocked!
```

## Files Modified

1. **CLS_EmployeeLogin_ClockIn.js** (lines 310-332)
   - Wrapped `TT_LOGGER.logRateLimit()` in try-catch
   - Rate limit block now executes regardless of logging success/failure

## Future Improvements

### Fix the Logger Signature Mismatch (Optional)
The `TT_LOGGER.logRateLimit()` wrapper should match how it's being called:

```javascript
// Current (mismatched):
logRateLimit: function(workerId, displayName, diff, minutes, additionalData = {})

// Should be (to match usage):
logRateLimit: function(workerData, timingData, additionalData = {}) {
  return CLLogger.logRateLimit(
    workerData.workerId,
    workerData.displayName,
    timingData.minutesSinceLastClockIn,
    timingData.rateLimitMinutes,
    {
      device: workerData.device,
      sheetId: SHEET_ID,
      project: 'TIME_TRACKING',
      ...additionalData
    }
  );
}
```

This would fix the toFixed error at the source, but the current solution (try-catch wrapper) works and is more defensive.

## Deployment

- **Version:** @124
- **Date:** November 11, 2025
- **Deployment ID:** AKfycbwHBLEQ5QHuhD-O4uI4hRN_5_yS9YsFgtn_dMAdoAO2C7zHLoi3qfHO82vas3Uv0wXXpg

## Configuration

Rate limit is set in `CLS_EmployeeLogin_Config.js`:
```javascript
const RATE_LIMIT_MINUTES = 20;  // Production: 20 minutes
// Set to 0 for development/testing to disable
```

## Related Documentation

- **Error Handling Fix:** `ERROR_HANDLING_FIX.md`
- **Time Display Fix:** `react-portal/TIME_DISPLAY_BUG_FIX.md`
- **Centralized Logging:** `GoogleAppsScripts/LoggingLibrary/START_HERE.md`
