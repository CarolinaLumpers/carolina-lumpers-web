// ======================================================
// Project: CLS Employee Login System
// File: CLS_EmployeeLogin_TestTools.js
// Description: Test and diagnostic tools for debugging
// date formats, worker lookups, and system validation.
// ======================================================

// ======================================================
//  TEST FUNCTION: Check Date/Time Formats from Sheets
// ======================================================
function testDateTimeFormats() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sh = ss.getSheetByName('ClockIn');
    if (!sh) {
      const errorMsg = 'ClockIn sheet not found';
      Logger.log('❌ TEST FAILED: ' + errorMsg);
      logEvent_('TestFormats', { error: errorMsg });
      return { error: errorMsg };
    }
    
    const data = sh.getDataRange().getValues();
    if (data.length < 2) {
      const errorMsg = 'No data in ClockIn sheet';
      Logger.log('❌ TEST FAILED: ' + errorMsg);
      logEvent_('TestFormats', { error: errorMsg });
      return { error: errorMsg };
    }
    
    const headers = data[0].map(h => String(h).trim());
    const iWorker = headers.indexOf('WorkerID');
    const iDate = headers.indexOf('Date');
    const iTime = headers.indexOf('Time');
    
    const now = new Date();
    
    const results = {
      currentTime: Utilities.formatDate(now, TIMEZONE, 'yyyy-MM-dd HH:mm:ss'),
      todayISO: Utilities.formatDate(now, TIMEZONE, 'yyyy-MM-dd'),
      todayMMDD: Utilities.formatDate(now, TIMEZONE, 'MM/dd/yyyy'),
      currentTimeStr: Utilities.formatDate(now, TIMEZONE, 'hh:mm a'),
      sampleEntries: [],
      headers: headers,
      columnIndexes: { worker: iWorker, date: iDate, time: iTime }
    };
    
    // Get last 5 entries to see actual formats
    const lastEntries = data.slice(-5);
    lastEntries.forEach((row, idx) => {
      if (idx === 0) return; // skip if it's header row
      
      const d = row[iDate];
      const t = row[iTime];
      
      results.sampleEntries.push({
        workerId: row[iWorker],
        dateRaw: d,
        timeRaw: t,
        dateType: Object.prototype.toString.call(d),
        timeType: Object.prototype.toString.call(t),
        dateFormatted: d instanceof Date ? Utilities.formatDate(d, TIMEZONE, 'MM/dd/yyyy') : String(d),
        timeFormatted: t instanceof Date ? Utilities.formatDate(t, TIMEZONE, 'hh:mm a') : String(t),
        dateISO: d instanceof Date ? Utilities.formatDate(d, TIMEZONE, 'yyyy-MM-dd') : '',
        matches: {
          todayISO: d instanceof Date ? (Utilities.formatDate(d, TIMEZONE, 'yyyy-MM-dd') === results.todayISO) : false,
          todayMMDD: d instanceof Date ? (Utilities.formatDate(d, TIMEZONE, 'MM/dd/yyyy') === results.todayMMDD) : (String(d) === results.todayMMDD)
        }
      });
    });
    
    // Test worker lookup
    if (results.sampleEntries.length > 0) {
      const testWorkerId = results.sampleEntries[0].workerId;
      if (testWorkerId) {
        const workerMeta = lookupWorkerMeta_(testWorkerId);
        results.workerLookupTest = workerMeta;
      }
    }
    
    // Log results
    Logger.log('✅ DATE/TIME FORMAT TEST RESULTS:');
    Logger.log('Current Time: ' + results.currentTime);
    Logger.log('Today (ISO): ' + results.todayISO);
    Logger.log('Today (MM/dd): ' + results.todayMMDD);
    Logger.log('Sample Entries: ' + results.sampleEntries.length);
    Logger.log('Column Indexes - Worker: ' + results.columnIndexes.worker + ', Date: ' + results.columnIndexes.date + ', Time: ' + results.columnIndexes.time);
    
    // Log to persistent Log sheet
    logEvent_('TestFormats', {
      success: true,
      currentTime: results.currentTime,
      sampleCount: results.sampleEntries.length,
      columnIndexes: results.columnIndexes,
      workerLookupSuccess: results.workerLookupTest?.ok || false
    });
    
    return results;
    
  } catch (err) {
    const errorMsg = err.toString();
    Logger.log('❌ TEST SUITE ERROR: ' + errorMsg);
    logEvent_('TestSuiteComplete', { error: errorMsg });
    return { error: errorMsg };
  }
}

// ======================================================
//  TEST FUNCTION: Centralized Logging Library
// ======================================================
/**
 * Test the centralized logging library from standalone project
 * CRITICAL: Must pass sheetId explicitly since this is not container-bound
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

// ======================================================
//  TEST FUNCTION: Logging Library Integration
// ======================================================
/**
 * Test the centralized logging library
 * Run this to verify CLLogger library is working
 */
function testLoggingLibrary() {
  Logger.log('Starting logging library test...');
  
  try {
    // Check if library is available
    if (typeof CLLogger === 'undefined') {
      throw new Error('CLLogger library not available');
    }
    
    Logger.log('CLLogger library found');
    
    // Test simple log with explicit sheetId
    const result = CLLogger.logEvent(
      'System Event',
      'SYSTEM',
      'System',
      'Test from EmployeeLogin',
      {
        sheetId: SHEET_ID,
        project: 'TIME_TRACKING',
        details: {
          test: true,
          timestamp: new Date().toISOString()
        }
      }
    );
    
    Logger.log('Log result: ' + JSON.stringify(result));
    
    if (result.success) {
      Logger.log('✅ Test passed! Log ID: ' + result.logId);
      Logger.log('Check Activity_Logs sheet in: https://docs.google.com/spreadsheets/d/' + SHEET_ID);
    } else {
      Logger.log('❌ Test failed: ' + result.error);
    }
    
    return result;
    
  } catch (error) {
    Logger.log('❌ Error: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// ======================================================
//  TEST FUNCTION: Validate System Configuration
// ======================================================
function testFormatTime() {
  Logger.log('🧪 TESTING formatTime_ FUNCTION');
  
  const testCases = [
    { input: null, expected: '', description: 'null value' },
    { input: '', expected: '', description: 'empty string' },
    { input: '04:35:12 PM', expected: '04:35:12 PM', description: 'already formatted string' },
    { input: new Date('2025-10-17T16:35:12'), description: 'Date object' },
    { input: '2025-10-17T16:35:12.000Z', description: 'ISO timestamp string' },
    { input: 'invalid', expected: 'invalid', description: 'invalid string' }
  ];
  
  const results = [];
  testCases.forEach((test, idx) => {
    const result = formatTime_(test.input);
    const passed = test.expected ? result === test.expected : result !== '';
    
    results.push({
      test: idx + 1,
      description: test.description,
      input: String(test.input),
      output: result,
      expected: test.expected || 'formatted time',
      passed: passed ? '✅' : '❌'
    });
    
    Logger.log(`Test ${idx + 1} (${test.description}): ${passed ? '✅' : '❌'}`);
    Logger.log(`  Input: ${String(test.input)}`);
    Logger.log(`  Output: ${result}`);
  });
  
  const allPassed = results.every(r => r.passed === '✅');
  Logger.log(`\n${allPassed ? '✅' : '❌'} formatTime_ Tests: ${results.filter(r => r.passed === '✅').length}/${results.length} passed`);
  
  logEvent_('TestFormatTime', { success: allPassed, results: results });
  return results;
}

// ======================================================
//  TEST FUNCTION: Validate System Configuration
// ======================================================
function testSystemConfig() {
  const results = {
    configCheck: {
      sheetId: SHEET_ID ? '✅ Set' : '❌ Missing',
      hashSalt: HASH_SALT ? '✅ Set' : '❌ Missing',
      timezone: TIMEZONE ? '✅ Set' : '❌ Missing',
      emailConfig: (INFO_EMAIL && CC_EMAIL) ? '✅ Set' : '❌ Missing'
    },
    sheetAccess: {},
    functionsAvailable: {}
  };
  
  // Test sheet access
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    results.sheetAccess.main = '✅ Accessible';
    
    const sheets = ['Workers', 'ClockIn', 'Clients', 'Payroll LineItems'];
    sheets.forEach(sheetName => {
      try {
        const sh = ss.getSheetByName(sheetName);
        results.sheetAccess[sheetName] = sh ? '✅ Found' : '❌ Missing';
      } catch (err) {
        results.sheetAccess[sheetName] = '❌ Error: ' + err.message;
      }
    });
  } catch (err) {
    results.sheetAccess.main = '❌ Cannot access: ' + err.message;
  }
  
  // Test function availability
  const functions = ['loginUser', 'handleClockIn', 'getRole_', 'logEvent_'];
  functions.forEach(funcName => {
    try {
      results.functionsAvailable[funcName] = (typeof eval(funcName) === 'function') ? '✅ Available' : '❌ Missing';
    } catch (err) {
      results.functionsAvailable[funcName] = '❌ Error: ' + err.message;
    }
  });
  
  // Log results to console
  Logger.log('✅ SYSTEM CONFIG TEST RESULTS:');
  Logger.log('Config Check:');
  Object.entries(results.configCheck).forEach(([key, value]) => {
    Logger.log(`  ${key}: ${value}`);
  });
  Logger.log('Sheet Access:');
  Object.entries(results.sheetAccess).forEach(([key, value]) => {
    Logger.log(`  ${key}: ${value}`);
  });
  Logger.log('Functions Available:');
  Object.entries(results.functionsAvailable).forEach(([key, value]) => {
    Logger.log(`  ${key}: ${value}`);
  });
  
  // Log to persistent Log sheet
  logEvent_('TestSystemConfig', {
    success: true,
    configValid: Object.values(results.configCheck).every(v => v.includes('✅')),
    sheetsAccessible: Object.values(results.sheetAccess).every(v => v.includes('✅')),
    functionsAvailable: Object.values(results.functionsAvailable).every(v => v.includes('✅')),
    details: results
  });
  
  return results;
}

// ======================================================
//  TEST FUNCTION: Simulate Clock-in Flow
// ======================================================
function testClockInFlow(testWorkerId, testLat, testLng) {
  const results = {
    step1_rateLimit: null,
    step2_clockIn: null,
    step3_notification: null
  };
  
  try {
    Logger.log('🔄 STARTING CLOCK-IN FLOW TEST');
    Logger.log('Test Worker ID: ' + (testWorkerId || 'TEST001'));
    Logger.log('Test Coordinates: ' + (testLat && testLng ? `${testLat}, ${testLng}` : 'Not provided'));
    
    // Step 1: Test rate limiting
    Logger.log('📝 Step 1: Testing rate limiting...');
    results.step1_rateLimit = ensureMinIntervalMinutes_(testWorkerId || 'TEST001', RATE_LIMIT_MINUTES);
    Logger.log('Rate limit result: ' + (results.step1_rateLimit ? 'Limited' : 'Allowed'));
    
    // Step 2: Test clock-in (if coords provided)
    if (testLat && testLng) {
      Logger.log('📝 Step 2: Testing clock-in with coordinates...');
      results.step2_clockIn = handleClockIn(testWorkerId || 'TEST001', testLat, testLng);
      Logger.log('Clock-in result: ' + (results.step2_clockIn?.success ? 'Success' : 'Failed'));
    } else {
      Logger.log('📝 Step 2: Skipped - no coordinates provided');
    }
    
    // Step 3: Test notification logic
    Logger.log('📝 Step 3: Testing notification logic...');
    results.step3_notification = {
      currentTime: Utilities.formatDate(new Date(), TIMEZONE, 'HH:mm'),
      isLateTime: isCurrentlyLate_(),
      lateThreshold: `${LATE_CLOCK_IN_HOUR}:${String(LATE_CLOCK_IN_MINUTE).padStart(2, '0')}`
    };
    Logger.log('Current time: ' + results.step3_notification.currentTime);
    Logger.log('Is late time: ' + results.step3_notification.isLateTime);
    Logger.log('Late threshold: ' + results.step3_notification.lateThreshold);
    
    Logger.log('✅ CLOCK-IN FLOW TEST COMPLETED');
    
    // Log to persistent Log sheet
    logEvent_('TestClockInFlow', {
      success: true,
      testWorkerId: testWorkerId || 'TEST001',
      coordinates: testLat && testLng ? { lat: testLat, lng: testLng } : null,
      rateLimited: !!results.step1_rateLimit,
      clockInSuccess: results.step2_clockIn?.success || false,
      isLateTime: results.step3_notification.isLateTime,
      currentTime: results.step3_notification.currentTime
    });
    
  } catch (err) {
    const errorMsg = err.toString();
    Logger.log('❌ CLOCK-IN FLOW TEST ERROR: ' + errorMsg);
    results.error = errorMsg;
    logEvent_('TestClockInFlow', { error: errorMsg });
  }
  
  return results;
}

// ======================================================
//  HELPER FUNCTION: Check if current time is late
// ======================================================
function isCurrentlyLate_() {
  const now = new Date();
  const hr = parseInt(Utilities.formatDate(now, TIMEZONE, 'H'), 10);
  const mn = parseInt(Utilities.formatDate(now, TIMEZONE, 'm'), 10);
  return hr > LATE_CLOCK_IN_HOUR || (hr === LATE_CLOCK_IN_HOUR && mn >= LATE_CLOCK_IN_MINUTE);
}

// ======================================================
//  COMPREHENSIVE TEST RUNNER
// ======================================================
function runAllTests() {
  Logger.log('🚀 STARTING COMPREHENSIVE TEST SUITE');
  Logger.log('=====================================');
  
  const startTime = new Date();
  const results = {
    testRun: {
      timestamp: Utilities.formatDate(startTime, TIMEZONE, 'yyyy-MM-dd HH:mm:ss'),
      version: 'CLS Employee Login System v1.0'
    },
    tests: {}
  };
  
  try {
    // Test 1: System Configuration
    Logger.log('🔧 Running System Configuration Test...');
    results.tests.systemConfig = testSystemConfig();
    
    // Test 2: Date/Time Formats
    Logger.log('📅 Running Date/Time Format Test...');
    results.tests.dateTimeFormats = testDateTimeFormats();
    
    // Test 3: Clock-in Flow (without coordinates)
    Logger.log('🕐 Running Clock-in Flow Test...');
    results.tests.clockInFlow = testClockInFlow('TEST001');
    
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    
    Logger.log('=====================================');
    Logger.log(`✅ TEST SUITE COMPLETED in ${duration}s`);
    
    // Count passed/failed tests
    let passed = 0;
    let failed = 0;
    Object.values(results.tests).forEach(test => {
      if (test.error) failed++;
      else passed++;
    });
    
    Logger.log(`📊 Results: ${passed} passed, ${failed} failed`);
    
    // Log comprehensive results to Log sheet
    logEvent_('TestSuiteComplete', {
      success: true,
      duration: duration,
      testsRun: Object.keys(results.tests).length,
      testsPassed: passed,
      testsFailed: failed,
      timestamp: results.testRun.timestamp
    });
    
    return results;
    
  } catch (err) {
    const errorMsg = err.toString();
    Logger.log('❌ TEST SUITE ERROR: ' + errorMsg);
    logEvent_('TestSuiteComplete', { error: errorMsg });
    return { error: errorMsg };
  }
}