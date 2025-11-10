// ======================================================
// Project: CLS Employee Login System
// File: CLS_EmployeeLogin_Main.js
// Description: Main entry point (doGet, routing) for the 
// employee login and clock-in system API.
// ======================================================

// ======================================================
//  MAIN ENTRY: doGet and doPost (JSONP API + Offline Sync)
// ======================================================
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    let params = {};
    
    // Handle GET parameters
    if (e.parameter) {
      params = { ...e.parameter };
    }
    
    // Handle POST data (for offline sync)
    if (e.postData && e.postData.contents) {
      try {
        const postData = JSON.parse(e.postData.contents);
        if (postData.workerId && postData.lat && postData.lng) {
          // This is a clock-in from offline sync
          params.action = 'clockin';
          params.workerId = postData.workerId;
          params.lat = postData.lat.toString();
          params.lng = postData.lng.toString();
          params.lang = postData.lang || 'en';
          params.email = postData.email || '';
        }
      } catch (parseErr) {
        console.log('POST data parse error:', parseErr);
      }
    }
    
    const action = params.action;
    const callback = params.callback;
    let result;

    switch (action) {
      // --------------------------
      // AUTH & ACCOUNT ACTIONS
      // --------------------------
      case 'login': {
        const email = params.email || '';
        const password = params.password || '';
        const device = params.device || 'Unknown';
        
        // Create modified event object for loginUser function
        const loginEvent = { parameter: params };
        const auth = loginUser(loginEvent);
        if (!auth.success) {
          result = { success: false, message: auth.message };
          break;
        }

        // Log device type to the "Log" sheet
        try {
          const ss = SpreadsheetApp.openById(SHEET_ID);
          const logSh = ss.getSheetByName('Log') || ss.insertSheet('Log');
          logSh.appendRow([
            new Date(),
            'Login',
            email,
            `Device: ${device}`
          ]);
        } catch (logErr) {
          // Don't fail login if logging fails
          console.log('Logging failed:', logErr);
        }

        result = {
          success: true,
          workerId: auth.workerId,
          displayName: auth.displayName,
          email: auth.email,
          device
        };
        break;
      }

      case 'signup':
        result = signUpUser({ parameter: params });
        break;

      // --------------------------
      // CLOCK-IN ACTION
      // --------------------------
      case 'clockin': {
        const requestStart = new Date().getTime();
        Logger.log(`🚀 Clock-in API request received at ${new Date().toISOString()}`);
        
        const workerId = params.workerId;
        const lat = parseFloat(params.lat);
        const lng = parseFloat(params.lng);
        const device = params.device || 'Unknown Device';
        
        Logger.log(`📋 Request params: workerId=${workerId}, lat=${lat}, lng=${lng}, device=${device}`);
        
        if (!workerId || isNaN(lat) || isNaN(lng)) {
          Logger.log(`❌ Invalid parameters - returning error`);
          result = { success: false, message: '⚠️ Missing workerId or GPS coordinates.' };
        } else {
          Logger.log(`⏱️ [${new Date().getTime() - requestStart}ms] Checking rate limit...`);
          const rateCheck = ensureMinIntervalMinutes_(workerId, RATE_LIMIT_MINUTES);
          Logger.log(`⏱️ [${new Date().getTime() - requestStart}ms] Rate limit check complete`);
          
          if (rateCheck && rateCheck.success === false) {
            Logger.log(`⏱️ Rate limit triggered - returning early`);
            result = rateCheck;
            break;
          }

          // ✅ Perform Clock-In
          Logger.log(`⏱️ [${new Date().getTime() - requestStart}ms] Starting handleClockIn()...`);
          result = handleClockIn(workerId, lat, lng, device);
          Logger.log(`⏱️ [${new Date().getTime() - requestStart}ms] handleClockIn() returned`);
          // Note: Clock-in logging handled by TT_LOGGER.logClockIn() inside handleClockIn()

          // ⚡ REMOVED: Late clock-in notification (too slow - caused timeouts)
          // Late notifications should be handled by a separate time-based trigger
          // that runs every hour to check for late clock-ins
          
          Logger.log(`✅ Clock-in complete - Total API time: ${new Date().getTime() - requestStart}ms`);
        }
        break;
      }

      // --------------------------
      // REPORTING & LOOKUP
      // --------------------------
      case 'report':
        result = getWeeklyReportObj(params.workerId);
        break;

      case 'getworkerid':
        result = getWorkerIdByEmail(params.email);
        break;

      // --------------------------
      // ADMIN / LEAD ENDPOINTS
      // --------------------------
      case 'reportAll': {
        const who = String(params.workerId || '');
        const workersCsv = String(params.workers || ''); // optional CSV filter
        result = handleReportAll_(who, workersCsv);
        break;
      }

      case 'whoami': {
        const who = String(params.workerId || '');
        result = { ok: true, role: getRole_(who) };
        break;
      }

      case 'whois': {
        const targetId = params.workerId;
        if (!targetId) {
          result = { ok: false, message: 'Missing workerId' };
        } else {
          result = lookupWorkerMeta_(targetId);
        }
        break;
      }

      case 'reportAs': {
        const requester = params.requesterId;
        const target = params.targetId;
        if (!requester || !target) {
          result = { ok: false, message: 'Missing requesterId/targetId' };
        } else if (!isAdmin_(requester)) {
          result = { ok: false, message: 'Unauthorized' };
        } else {
          result = handleReportForWorker_(target);
        }
        break;
      }

      case 'payrollAs': {
        const requester = params.requesterId;
        const target = params.targetId;
        const range = params.range || 'current';
        if (!requester || !target) {
          result = { ok: false, message: 'Missing requesterId/targetId' };
        } else if (!isAdmin_(requester)) {
          result = { ok: false, message: 'Unauthorized' };
        } else {
          result = handlePayrollForWorker_(target, range);
        }
        break;
      }

      // --------------------------
      // TIME EDIT REQUESTS
      // --------------------------
      case 'submitTimeEdit': {
        const editData = {
          employeeId: params.employeeId,
          recordId: params.recordId,
          originalTime: params.originalTime,
          requestedTime: params.requestedTime,
          requestedDateTime: params.requestedDateTime,
          reason: params.reason,
          status: params.status || 'pending',
          submittedAt: params.submittedAt
        };
        result = handleTimeEditRequest_(editData);
        break;
      }

      case 'approveTimeEdit': {
        const requesterId = params.requesterId;
        const requestId = params.requestId;
        if (!requesterId || !requestId) {
          result = { success: false, message: 'Missing requesterId or requestId' };
        } else if (!isAdmin_(requesterId)) {
          result = { success: false, message: 'Unauthorized - admin access required' };
        } else {
          result = handleApproveTimeEdit_(requestId, requesterId);
        }
        break;
      }

      case 'denyTimeEdit': {
        const requesterId = params.requesterId;
        const requestId = params.requestId;
        const reason = params.reason || '';
        if (!requesterId || !requestId) {
          result = { success: false, message: 'Missing requesterId or requestId' };
        } else if (!isAdmin_(requesterId)) {
          result = { success: false, message: 'Unauthorized - admin access required' };
        } else {
          result = handleDenyTimeEdit_(requestId, requesterId, reason);
        }
        break;
      }

      case 'getTimeEditRequests': {
        const requesterId = params.requesterId;
        const status = params.status || 'all'; // 'pending', 'approved', 'denied', 'all'
        if (!requesterId) {
          result = { success: false, message: 'Missing requesterId' };
        } else if (!isAdmin_(requesterId)) {
          result = { success: false, message: 'Unauthorized - admin access required' };
        } else {
          result = getTimeEditRequests_(status);
        }
        break;
      }

      case 'getTimeEntryStatus': {
        const workerId = params.workerId;
        const recordId = params.recordId;
        if (!workerId) {
          result = { success: false, message: 'Missing workerId' };
        } else {
          result = getTimeEntryStatus_(workerId, recordId);
        }
        break;
      }

      // --------------------------
      // CLOCK-IN APPROVAL
      // --------------------------
      case 'getPendingClockIns': {
        const requesterId = params.requesterId;
        if (!requesterId) {
          result = { success: false, message: 'Missing requesterId' };
        } else if (!isAdmin_(requesterId) && !isLead_(requesterId)) {
          result = { success: false, message: 'Unauthorized - admin or lead access required' };
        } else {
          result = getPendingClockIns_();
        }
        break;
      }

      case 'approveClockIn': {
        const requesterId = params.requesterId;
        const clockinId = params.clockinId;
        if (!requesterId || !clockinId) {
          result = { success: false, message: 'Missing requesterId or clockinId' };
        } else if (!isAdmin_(requesterId) && !isLead_(requesterId)) {
          result = { success: false, message: 'Unauthorized - admin or lead access required' };
        } else {
          result = handleApproveClockIn_(clockinId, requesterId);
        }
        break;
      }

      case 'denyClockIn': {
        const requesterId = params.requesterId;
        const clockinId = params.clockinId;
        const reason = params.reason || '';
        if (!requesterId || !clockinId) {
          result = { success: false, message: 'Missing requesterId or clockinId' };
        } else if (!isAdmin_(requesterId) && !isLead_(requesterId)) {
          result = { success: false, message: 'Unauthorized - admin or lead access required' };
        } else {
          result = handleDenyClockIn_(clockinId, requesterId, reason);
        }
        break;
      }

      // --------------------------
      // TIME EDIT REQUEST
      // --------------------------
      case 'timeEdit':
      case 'submitTimeEdit': {
        try {
          result = handleTimeEditRequest_(params);
        } catch (err) {
          Logger.log('❌ Error in handleTimeEditRequest_: ' + err);
          result = { success: false, message: 'Server error while submitting edit request.' };
        }
        break;
      }

      // --------------------------
      // PAYROLL ENDPOINTS
      // --------------------------
      case 'payroll':
        result = getPayrollSummary_(params.workerId, params.range || 'current');
        break;

      case 'payrollWeekPeriods':
        result = getPayrollWeekPeriods_(params.workerId);
        break;

      case 'payrollPdf':
        result = {
          pdfUrl: generatePayrollPdf_(
            params.workerId,
            params.workerName,
            params.weekPeriod
          ),
        };
        break;

      // --------------------------
      // TEST ENDPOINTS
      // --------------------------
      case 'testFormats':
        result = testDateTimeFormats();
        break;

      case 'testConfig':
        result = testSystemConfig();
        break;

      case 'testClockIn':
        result = testClockInFlow(
          params.workerId || 'TEST001',
          params.lat ? parseFloat(params.lat) : null,
          params.lng ? parseFloat(params.lng) : null
        );
        break;

      // --------------------------
      // FALLBACK
      // --------------------------
      default:
        result = { success: false, message: '❌ Unknown or missing action parameter.' };
    }

    // ==========================
    // JSONP CALLBACK HANDLER
    // ==========================
    const json = JSON.stringify(result);
    if (callback) {
      return ContentService
        .createTextOutput(`${callback}(${json})`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
      .createTextOutput(json)
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    const errorObj = { success: false, error: `❌ Server error: ${err.message}` };
    const callback = params?.callback;
    const json = JSON.stringify(errorObj);
    if (callback) {
      return ContentService
        .createTextOutput(`${callback}(${json})`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
      .createTextOutput(json)
      .setMimeType(ContentService.MimeType.JSON);
  }
}