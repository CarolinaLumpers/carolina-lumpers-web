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
  let params = {};
  let callback = null;
  
  try {
    // Handle GET and POST form parameters (URL-encoded)
    if (e.parameter) {
      params = { ...e.parameter };
    }
    
    // Handle POST JSON data (for offline sync)
    if (e.postData && e.postData.contents && !params.action) {
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
        // Not JSON - probably form data already in e.parameter
        console.log('POST data not JSON (form data):', parseErr);
      }
    }
    
    const action = params.action;
    callback = params.callback; // Assign to outer scope variable
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

        // Login logging handled by TT_LOGGER.logLogin() in loginUser() function
        result = {
          success: true,
          workerId: auth.workerId,
          displayName: auth.displayName,
          email: auth.email,
          w9Status: auth.w9Status || 'none',
          w9SubmittedDate: auth.w9SubmittedDate || '',
          w9ApprovedDate: auth.w9ApprovedDate || '',
          w9SsnLast4: auth.w9SsnLast4 || '',
          w9PdfUrl: auth.w9PdfUrl || '',
          role: getRole_(auth.workerId),
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
        const workerId = params.workerId;
        const lat = parseFloat(params.lat);
        const lng = parseFloat(params.lng);
        const device = params.device || 'Unknown Device';
        if (!workerId || isNaN(lat) || isNaN(lng)) {
          result = { success: false, message: '⚠️ Missing workerId or GPS coordinates.' };
        } else {
          const rateCheck = ensureMinIntervalMinutes_(workerId, RATE_LIMIT_MINUTES);
          
          // If rate limit blocked, return immediately
          if (rateCheck && rateCheck.success === false) {
            result = rateCheck;
            break;
          }

          // ✅ Perform Clock-In
          result = handleClockIn(workerId, lat, lng, device);
          
          // Note: Clock-in logging handled by TT_LOGGER.logClockIn() inside handleClockIn()

          // ✅ Optional: Send late clock-in notification (multilingual + first of day)
          try {
            // Get worker info for the notification
            const workerMeta = lookupWorkerMeta_(workerId);
            const workerName = workerMeta?.displayName || workerId;
            const lang = workerMeta?.primaryLang || params.lang || 'en';
            
            maybeNotifyLateClockIn_(
              workerId,
              workerName,
              result.site,
              result.distance,
              result.ClockinID,
              lat,
              lng,
              lang
            );
          } catch (err) {
            Logger.log('Late clock-in email skipped: ' + err);
          }
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
      // W-9 ENDPOINTS
      // --------------------------
      case 'submitW9': {
        const workerId = params.workerId;
        const device = params.device || 'Unknown';
        
        if (!workerId) {
          result = { ok: false, message: 'Missing workerId' };
          break;
        }
        
        // Parse W-9 data from params
        const w9Data = {
          legalName: params.legalName || '',
          businessName: params.businessName || '',
          taxClassification: params.taxClassification || '',
          address: params.address || '',
          city: params.city || '',
          state: params.state || '',
          zip: params.zip || '',
          ssn: params.ssn || '',
          backupWithholding: params.backupWithholding === 'true' || params.backupWithholding === true,
          signature: params.signature || params.legalName || ''
        };
        
        result = submitW9Form(workerId, w9Data, device);
        break;
      }

      case 'getW9Status': {
        const workerId = params.workerId;
        if (!workerId) {
          result = { ok: false, message: 'Missing workerId' };
        } else {
          result = getW9Status(workerId);
        }
        break;
      }

      case 'listPendingW9s': {
        const requesterId = params.requesterId;
        if (!requesterId) {
          result = { ok: false, message: 'Missing requesterId' };
        } else if (!isAdmin_(requesterId)) {
          result = { ok: false, message: 'Unauthorized - admin access required' };
        } else {
          result = listPendingW9s();
        }
        break;
      }

      case 'approveW9': {
        const w9RecordId = params.w9RecordId;
        const adminId = params.adminId;
        const device = params.device || 'Unknown';
        
        if (!w9RecordId || !adminId) {
          result = { ok: false, message: 'Missing w9RecordId or adminId' };
        } else if (!isAdmin_(adminId)) {
          result = { ok: false, message: 'Unauthorized - admin access required' };
        } else {
          result = approveW9(w9RecordId, adminId, device);
        }
        break;
      }

      case 'rejectW9': {
        const w9RecordId = params.w9RecordId;
        const adminId = params.adminId;
        const reason = params.reason || 'Information incomplete or incorrect';
        const device = params.device || 'Unknown';
        
        if (!w9RecordId || !adminId) {
          result = { ok: false, message: 'Missing w9RecordId or adminId' };
        } else if (!isAdmin_(adminId)) {
          result = { ok: false, message: 'Unauthorized - admin access required' };
        } else {
          result = rejectW9(w9RecordId, adminId, reason, device);
        }
        break;
      }

      case 'getW9Pdf': {
        const workerId = params.workerId;
        const requestorId = params.requestorId;
        
        if (!workerId || !requestorId) {
          result = { ok: false, message: 'Missing workerId or requestorId' };
        } else {
          result = getW9PdfUrl(workerId, requestorId);
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
        console.log('❌ Unknown action:', action, 'Params:', JSON.stringify(params));
        result = { 
          success: false, 
          message: `❌ Unknown or missing action parameter. Received: ${action || 'none'}` 
        };
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
    console.error('❌ handleRequest error:', err);
    const errorObj = { success: false, error: `❌ Server error: ${err.message}` };
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