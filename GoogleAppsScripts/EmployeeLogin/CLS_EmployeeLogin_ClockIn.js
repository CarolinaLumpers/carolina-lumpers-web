// ======================================================
// Project: CLS Employee Login System
// File: CLS_EmployeeLogin_ClockIn.js
// Description: Handles GPS clock-ins, lateness detection,
// geofence validation, and email notifications.
// ======================================================

// ======================================================
//  CLOCK-IN HANDLER (Multi-site Geofence, Miles) - STABLE VERSION
// ======================================================
function handleClockIn(workerId, lat, lng, device) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const clientsSheet = ss.getSheetByName('Clients');
  const clockSheet = ss.getSheetByName('ClockIn');

  // ---- Get worker metadata ONCE at start ----
  const workerMeta = lookupWorkerMeta_(workerId);

  // ---- Clients lookup ----
  const clientRows = clientsSheet.getDataRange().getValues();
    const cHeaders = clientRows[0].map(String);
    const idxName = cHeaders.indexOf('Client Name');
    const idxAddr = cHeaders.indexOf('JobAddress');
    const idxLat = cHeaders.indexOf('Latitude');
    const idxLng = cHeaders.indexOf('Longitude');

    if (idxName < 0 || idxAddr < 0 || idxLat < 0 || idxLng < 0) {
      return { success: false, message: '❌ Clients sheet missing required columns.' };
    }

    const workerLat = parseFloat(lat);
    const workerLng = parseFloat(lng);

    let nearestClient = null;
    let nearestAddr = null;
    let nearestDist = Infinity;

    // --- Find nearest client (FAST - skip geocoding during clock-in) ---
    for (let i = 1; i < clientRows.length; i++) {
      const row = clientRows[i];
      const name = String(row[idxName] || '').trim();
      const addr = String(row[idxAddr] || '').trim();
      const cLat = parseFloat(row[idxLat]);
      const cLng = parseFloat(row[idxLng]);

      // ⚡ SKIP geocoding during clock-in (too slow - causes timeouts)
      // Only use clients that already have coordinates
      // Run geocodeAllClients_() separately to populate missing coordinates
      
      // Calculate distance only if coordinates exist
      if (isFinite(cLat) && isFinite(cLng)) {
        const dist = getDistanceMi(workerLat, workerLng, cLat, cLng);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestClient = name;
          nearestAddr = addr;
        }
      }
    }

    // --- Record the clock-in (no approval status) ---
  const clockHeaders = clockSheet.getRange(1, 1, 1, clockSheet.getLastColumn()).getValues()[0];
  const newRow = [];
  const clockinID = 'CLK-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  const now = new Date();
  const tz = Session.getScriptTimeZone();
  const dateStr = Utilities.formatDate(now, tz, 'MM/dd/yyyy');
  const timeStr = Utilities.formatDate(now, tz, 'hh:mm:ss a');

  clockHeaders.forEach(h => {
    const key = String(h).trim();
    switch (key) {
      case 'ClockinID': newRow.push(clockinID); break;
      case 'WorkerID': newRow.push(workerId); break;
      case 'Date': newRow.push(dateStr); break;
      case 'Time': newRow.push(timeStr); break;
      case 'Latitude': newRow.push(workerLat); break;
      case 'Longitude': newRow.push(workerLng); break;
      case 'Nearest Client': newRow.push(nearestClient || ''); break;
      case 'Distance (mi)': newRow.push(isFinite(nearestDist) ? nearestDist.toFixed(2) : ''); break;
      case 'Needs Processing': newRow.push('Yes'); break;
      default: newRow.push('');
    }
  });

    clockSheet.appendRow(newRow);

    // --- Log the clock-in event (use cached workerMeta) ---
  TT_LOGGER.logClockIn(
    {
      workerId: workerId,
      displayName: workerMeta.displayName || workerId,
      device: device || 'Unknown Device',
      language: workerMeta.language || 'en'
    },
    {
      siteName: nearestClient,
      distance: isFinite(nearestDist) ? nearestDist : 0,
      latitude: workerLat,
      longitude: workerLng,
      clockinID: clockinID,
      minutesLate: 0
    }
  );

    // --- Return success for frontend (multilingual handled separately) ---
    return {
      success: true,
      site: nearestClient,
      distance: isFinite(nearestDist) ? nearestDist.toFixed(2) : '',
      ClockinID: clockinID,
      message: `✅ Clock-in successful at ${nearestClient} (${nearestDist.toFixed(2)} mi away)`
    };
}

// ======================================================
//  RATE LIMITING (OPTIMIZED - Only check recent entries)
// ======================================================
function ensureMinIntervalMinutes_(workerId, minutes) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName('ClockIn');
  if (!sh) return null;
  
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return null;
  
  // ⚡ OPTIMIZATION: Only read last 50 rows instead of entire sheet
  const startRow = Math.max(2, lastRow - 49); // Start from row 2 or last-49
  const numRows = lastRow - startRow + 1;
  const data = sh.getRange(startRow, 1, numRows, sh.getLastColumn()).getValues();
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);

  const iWorker = headers.indexOf('WorkerID');
  const iDate = headers.indexOf('Date');
  const iTime = headers.indexOf('Time');

  // Scan backwards from most recent
  for (let i = data.length - 1; i >= 0; i--) {
    const row = data[i];
    if (String(row[iWorker]) !== String(workerId)) continue;

    const dateObj = row[iDate];
    const timeObj = row[iTime];
    if (!(dateObj instanceof Date) || !(timeObj instanceof Date)) continue;

    // Combine date + time correctly
    const combined = new Date(dateObj);
    combined.setHours(timeObj.getHours(), timeObj.getMinutes(), timeObj.getSeconds());

    const now = new Date(Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss"));
    const diff = (now - combined) / 60000;

    if (diff < minutes) {
      // Don't lookup worker meta here - causes another slow query
      TT_LOGGER.logRateLimit(
        {
          workerId: workerId,
          displayName: workerId, // Use ID instead of looking up name (faster)
          device: 'Unknown Device'
        },
        {
          minutesSinceLastClockIn: diff,
          rateLimitMinutes: minutes
        }
      );
      return {
        success: false,
        message: `⏱️ You recently clocked in. Please wait ${Math.ceil(minutes - diff)} minutes before clocking again.`
      };
    }
    break; // Found this worker's most recent entry, stop searching
  }
  return null;
}

// ======================================================
//  LATE CLOCK-IN EMAIL NOTIFICATION
// ======================================================
function maybeNotifyLateClockIn_(workerId, workerName, siteName, dist, id, lat, lng, lang) {
  const now = new Date();
  const hr = parseInt(Utilities.formatDate(now, TIMEZONE, 'H'), 10);
  const mn = parseInt(Utilities.formatDate(now, TIMEZONE, 'm'), 10);

  // --- Late if after 8:05 AM ---
  const isLate = hr > LATE_CLOCK_IN_HOUR || (hr === LATE_CLOCK_IN_HOUR && mn >= LATE_CLOCK_IN_MINUTE);
  if (!isLate) return translateMsg_("ontime", lang, now);

  // --- Check if this is the first clock-in of the day ---
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName('ClockIn');
  const data = sh.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const iWorker = headers.indexOf('WorkerID');
  const iDate = headers.indexOf('Date');
  const iTime = headers.indexOf('Time');
  
  // Use MM/dd/yyyy format to match ClockIn sheet
  const todayStr = Utilities.formatDate(now, TIMEZONE, 'MM/dd/yyyy');
  let alreadyClocked = false;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][iWorker]) !== String(workerId)) continue;
    
    // Handle both Date objects and string dates
    const d = data[i][iDate];
    let dateStr = '';
    if (d instanceof Date) {
      dateStr = Utilities.formatDate(d, TIMEZONE, 'MM/dd/yyyy');
    } else if (typeof d === 'string') {
      dateStr = d;
    }
    
    if (dateStr !== todayStr) continue;

    // Skip if this is the entry we just created (same time)
    const t = data[i][iTime];
    const timeStr = typeof t === 'string' ? t : Utilities.formatDate(t, TIMEZONE, 'hh:mm a');
    const currentTimeStr = Utilities.formatDate(now, TIMEZONE, 'hh:mm a');
    
    if (timeStr === currentTimeStr) continue;

    alreadyClocked = true;
    break;
  }

  // Only send email if this is the first clock-in of the day
  if (alreadyClocked) return translateMsg_("ontime", lang, now);

  // --- Compute lateness bucket for message ---
  const minutesSinceEight = (hr - LATE_CLOCK_IN_HOUR) * 60 + mn - LATE_CLOCK_IN_MINUTE;
  let type = "mild";
  if (minutesSinceEight <= 10) type = "mild";
  else if (minutesSinceEight <= 30) type = "moderate";
  else type = "severe";

  // --- Send admin email ---
  const weekday = Utilities.formatDate(now, TIMEZONE, 'EEEE');
  const displayName = workerName || workerId;
  const msg = [
    `Worker: ${displayName} (${workerId})`,
    `Time (ET): ${Utilities.formatDate(now, TIMEZONE, 'yyyy-MM-dd HH:mm:ss')}`,
    `Day: ${weekday}`,
    `Site: ${siteName || ''}`,
    `Distance (mi): ${dist || ''}`,
    `ClockinID: ${id || ''}`,
    `Lat/Lng: ${lat}, ${lng}`,
    `Minutes Late: ${minutesSinceEight}`
  ].join('\n');

  // Log the event
  TT_LOGGER.logLateEmail(
    {
      workerId: workerId,
      displayName: displayName
    },
    {
      siteName: siteName,
      minutesLate: minutesSinceEight,
      clockinTime: Utilities.formatDate(now, TIMEZONE, 'hh:mm a')
    }
  );

  Logger.log('📨 Sending late email for ' + displayName + ' at ' + Utilities.formatDate(now, TIMEZONE, 'hh:mm a'));

  GmailApp.sendEmail(
    INFO_EMAIL,
    `⏰ Late Clock-In (${weekday}) — ${displayName}`,
    msg,
    { name: 'Carolina Lumper Service', cc: CC_EMAIL }
  );

  return translateMsg_(type, lang, now);
}

// ======================================================
//  WEEKLY REPORT (last 7 days, formatted)
// ======================================================
function getWeeklyReportObj(workerId) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('ClockIn');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const workerIdx = headers.indexOf('WorkerID');
  const dateIdx = headers.indexOf('Date');
  const timeIdx = headers.indexOf('Time');
  const siteIdx = headers.indexOf('Nearest Client');  // optional for richer UI
  const distIdx = headers.indexOf('Distance (mi)');   // optional

  if (workerIdx < 0 || dateIdx < 0 || timeIdx < 0) {
    return { success: false, message: '❌ ClockIn sheet missing required columns.' };
  }

  const tz = Session.getScriptTimeZone();
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  const records = [];
  // Get edit requests sheet and data
  let editSheet, editData = [], editHeaders = [];
  try {
    editSheet = ss.getSheetByName('TimeEditRequests');
    if (editSheet) {
      editData = editSheet.getDataRange().getValues();
      editHeaders = editData[0];
    }
  } catch (err) {}

  // Helper to get edit status for a record
  function getEditStatus(workerId, clockinId, clockinEditStatus) {
    // First priority: Use EditStatus column from ClockIn sheet if available
    if (clockinEditStatus && clockinEditStatus !== '') {
      return String(clockinEditStatus).toLowerCase();
    }
    
    // Fallback: Check TimeEditRequests sheet for pending/approved/denied requests
    if (!editSheet || !editHeaders.length) return 'confirmed';
    const empCol = editHeaders.indexOf('EmployeeID');
    const recCol = editHeaders.indexOf('RecordID');
    const statusCol = editHeaders.indexOf('Status');
    for (let i = 1; i < editData.length; i++) {
      const row = editData[i];
      if (row[empCol] === workerId && row[recCol] === clockinId) {
        if (row[statusCol] === 'pending') return 'editing';
        if (row[statusCol] === 'approved') return 'confirmed';
        if (String(row[statusCol]).startsWith('denied')) return 'denied';
      }
    }
    return 'confirmed';
  }

  // Find ClockinID and EditStatus columns
  const clockinIdIdx = headers.indexOf('ClockinID');
  const editStatusIdx = headers.indexOf('EditStatus');

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[workerIdx]) === String(workerId)) {
      const dRaw = row[dateIdx];
      const tRaw = row[timeIdx];

      // Only include last 7 days
      const d = new Date(dRaw);
      if (!isNaN(d) && d >= weekAgo) {
        const formattedDate = Utilities.formatDate(d, tz, 'MM/dd/yyyy');
        const formattedTime = formatTime_(tRaw);

        const site = siteIdx >= 0 ? row[siteIdx] : '';
        const dist = distIdx >= 0 && row[distIdx] !== '' && row[distIdx] !== null && row[distIdx] !== undefined
          ? String(row[distIdx])
          : '';

        // Get edit status for this record (prioritize EditStatus column)
        const clockinId = clockinIdIdx >= 0 ? row[clockinIdIdx] : '';
        const clockinEditStatus = editStatusIdx >= 0 ? row[editStatusIdx] : '';
        const editStatus = getEditStatus(workerId, clockinId, clockinEditStatus);

        records.push({ date: formattedDate, time: formattedTime, site: site, distance: dist, id: clockinId, editStatus: editStatus });
      }
    }
  }

  return { success: true, records: records };
}

// ======================================================
//  TIME EDIT REQUEST HANDLER
// ======================================================
function handleTimeEditRequest_(editData) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    
    // Create or get the TimeEditRequests sheet
    let editSheet = ss.getSheetByName('TimeEditRequests');
    if (!editSheet) {
      editSheet = ss.insertSheet('TimeEditRequests');
      // Add headers
      editSheet.getRange(1, 1, 1, 10).setValues([[
        'RequestID', 'EmployeeID', 'RecordID', 'OriginalTime', 
        'RequestedTime', 'RequestedDateTime', 'Reason', 'Status', 
        'SubmittedAt', 'ReviewedAt'
      ]]);
      // Format header row
      editSheet.getRange(1, 1, 1, 10).setFontWeight('bold');
    }
    
    // Generate unique request ID
    const requestId = 'EDIT-' + Utilities.getUuid().slice(0, 8).toUpperCase();
    
    // Prepare the row data
    const newRow = [
      requestId,
      editData.employeeId,
      editData.recordId,
      editData.originalTime,
      editData.requestedTime,
      editData.requestedDateTime,
      editData.reason,
      editData.status,
      editData.submittedAt,
      '' // ReviewedAt - empty until approved/denied
    ];
    
    // Add the request to the sheet
    editSheet.appendRow(newRow);
    
    // Update the ClockIn sheet EditStatus column to 'editing' (pending)
    const clockSheet = ss.getSheetByName('ClockIn');
    if (clockSheet) {
      const clockData = clockSheet.getDataRange().getValues();
      const clockHeaders = clockData[0];
      const clockIdCol = clockHeaders.indexOf('ClockinID');
      const editStatusCol = clockHeaders.indexOf('EditStatus');
      
      if (editStatusCol >= 0) {
        for (let i = 1; i < clockData.length; i++) {
          if (clockData[i][clockIdCol] === editData.recordId) {
            clockSheet.getRange(i + 1, editStatusCol + 1).setValue('editing');
            Logger.log(`✅ Updated ClockIn record ${editData.recordId}: EditStatus=editing`);
            break;
          }
        }
      }
    }
    
    // Log the edit request
    const employeeMeta = lookupWorkerMeta_(editData.employeeId);
    TT_LOGGER.logTimeEditRequest(
      {
        workerId: editData.employeeId,
        displayName: employeeMeta.displayName || editData.employeeId
      },
      {
        clockinID: editData.recordId,
        originalTime: editData.originalTime,
        requestedTime: editData.requestedTime,
        reason: editData.reason
      }
    );
    
    // Send notification email to supervisors
    try {
      const subject = `⏰ Time Edit Request - ${editData.employeeId}`;
      const body = `A time edit request has been submitted:\n\n` +
        `Employee: ${editData.employeeId}\n` +
        `Record ID: ${editData.recordId}\n` +
        `Original Time: ${editData.originalTime}\n` +
        `Requested Time: ${editData.requestedTime}\n` +
        `Reason: ${editData.reason}\n` +
        `Request ID: ${requestId}\n\n` +
        `Please review and approve/deny this request in the system.`;
      
      GmailApp.sendEmail(INFO_EMAIL, subject, body, { cc: CC_EMAIL });
      Logger.log(`✅ Time edit email sent to ${INFO_EMAIL} (cc: ${CC_EMAIL})`);
    } catch (emailErr) {
      Logger.log('Failed to send notification email: ' + emailErr);
    }
    
    return {
      success: true,
      requestId: requestId,
      message: 'Time edit request submitted successfully'
    };
    
  } catch (err) {
    Logger.log('Error handling time edit request: ' + err);
    return {
      success: false,
      message: 'Failed to submit time edit request: ' + err.message
    };
  }
}

// ======================================================
//  APPROVE TIME EDIT REQUEST
// ======================================================
function handleApproveTimeEdit_(requestId, approverId) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const editSheet = ss.getSheetByName('TimeEditRequests');
    
    if (!editSheet) {
      return { success: false, message: 'No time edit requests found' };
    }
    
    // Find the request
    const data = editSheet.getDataRange().getValues();
    const headers = data[0];
    const requestIdCol = headers.indexOf('RequestID');
    const statusCol = headers.indexOf('Status');
    const reviewedAtCol = headers.indexOf('ReviewedAt');
    const employeeIdCol = headers.indexOf('EmployeeID');
    const recordIdCol = headers.indexOf('RecordID');
    const requestedTimeCol = headers.indexOf('RequestedTime');
    
    let requestRow = -1;
    let requestData = null;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][requestIdCol] === requestId) {
        requestRow = i + 1; // 1-indexed for sheet
        requestData = data[i];
        break;
      }
    }
    
    if (requestRow === -1) {
      return { success: false, message: 'Time edit request not found' };
    }
    
    if (requestData[statusCol] !== 'pending') {
      return { success: false, message: 'Request has already been processed' };
    }
    
    // Update the request status
    editSheet.getRange(requestRow, statusCol + 1).setValue('approved');
    editSheet.getRange(requestRow, reviewedAtCol + 1).setValue(new Date().toISOString());
    
    // Update the original ClockIn record
    const clockSheet = ss.getSheetByName('ClockIn');
    if (clockSheet) {
      const clockData = clockSheet.getDataRange().getValues();
      const clockHeaders = clockData[0];
      const clockIdCol = clockHeaders.indexOf('ClockinID');
      const clockTimeCol = clockHeaders.indexOf('Time');
      const editStatusCol = clockHeaders.indexOf('EditStatus');
      
      // Find and update the original record
      for (let i = 1; i < clockData.length; i++) {
        if (clockData[i][clockIdCol] === requestData[recordIdCol]) {
          // Update the time to the approved requested time
          clockSheet.getRange(i + 1, clockTimeCol + 1).setValue(requestData[requestedTimeCol]);
          
          // Update EditStatus column if it exists
          if (editStatusCol >= 0) {
            clockSheet.getRange(i + 1, editStatusCol + 1).setValue('confirmed');
          }
          
          Logger.log(`✅ Updated ClockIn record ${requestData[recordIdCol]}: Time=${requestData[requestedTimeCol]}, EditStatus=confirmed`);
          break;
        }
      }
    }
    
    // Log the approval
    const employeeMeta = lookupWorkerMeta_(requestData[employeeIdCol]);
    const approverMeta = lookupWorkerMeta_(approverId);
    TT_LOGGER.logTimeEditApproval(
      {
        workerId: requestData[employeeIdCol],
        displayName: employeeMeta.displayName || requestData[employeeIdCol]
      },
      {
        approverName: approverMeta.displayName || approverId,
        originalTime: requestData[headers.indexOf('OriginalTime')],
        newTime: requestData[requestedTimeCol]
      }
    );
    
    return {
      success: true,
      message: 'Time edit request approved successfully'
    };
    
  } catch (err) {
    Logger.log('Error approving time edit: ' + err);
    return {
      success: false,
      message: 'Failed to approve time edit: ' + err.message
    };
  }
}

// ======================================================
//  DENY TIME EDIT REQUEST
// ======================================================
function handleDenyTimeEdit_(requestId, reviewerId, reason) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const editSheet = ss.getSheetByName('TimeEditRequests');
    
    if (!editSheet) {
      return { success: false, message: 'No time edit requests found' };
    }
    
    // Find the request
    const data = editSheet.getDataRange().getValues();
    const headers = data[0];
    const requestIdCol = headers.indexOf('RequestID');
    const statusCol = headers.indexOf('Status');
    const reviewedAtCol = headers.indexOf('ReviewedAt');
    const employeeIdCol = headers.indexOf('EmployeeID');
    
    let requestRow = -1;
    let requestData = null;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][requestIdCol] === requestId) {
        requestRow = i + 1; // 1-indexed for sheet
        requestData = data[i];
        break;
      }
    }
    
    if (requestRow === -1) {
      return { success: false, message: 'Time edit request not found' };
    }
    
    if (requestData[statusCol] !== 'pending') {
      return { success: false, message: 'Request has already been processed' };
    }
    
    // Update the request status
    const denyReason = reason ? `denied: ${reason}` : 'denied';
    editSheet.getRange(requestRow, statusCol + 1).setValue(denyReason);
    editSheet.getRange(requestRow, reviewedAtCol + 1).setValue(new Date().toISOString());
    
    // Update the ClockIn sheet EditStatus column if it exists
    const clockSheet = ss.getSheetByName('ClockIn');
    if (clockSheet) {
      const clockData = clockSheet.getDataRange().getValues();
      const clockHeaders = clockData[0];
      const clockIdCol = clockHeaders.indexOf('ClockinID');
      const editStatusCol = clockHeaders.indexOf('EditStatus');
      const recordIdCol = headers.indexOf('RecordID');
      
      if (editStatusCol >= 0) {
        for (let i = 1; i < clockData.length; i++) {
          if (clockData[i][clockIdCol] === requestData[recordIdCol]) {
            clockSheet.getRange(i + 1, editStatusCol + 1).setValue('denied');
            Logger.log(`✅ Updated ClockIn record ${requestData[recordIdCol]}: EditStatus=denied`);
            break;
          }
        }
      }
    }
    
    // Log the denial
    const employeeMeta = lookupWorkerMeta_(requestData[employeeIdCol]);
    const reviewerMeta = lookupWorkerMeta_(reviewerId);
    TT_LOGGER.logTimeEditDenial(
      {
        workerId: requestData[employeeIdCol],
        displayName: employeeMeta.displayName || requestData[employeeIdCol]
      },
      {
        approverName: reviewerMeta.displayName || reviewerId,
        reason: reason
      }
    );
    
    return {
      success: true,
      message: 'Time edit request denied'
    };
    
  } catch (err) {
    Logger.log('Error denying time edit: ' + err);
    return {
      success: false,
      message: 'Failed to deny time edit: ' + err.message
    };
  }
}

// ======================================================
//  GET TIME EDIT REQUESTS
// ======================================================
function getTimeEditRequests_(status) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const editSheet = ss.getSheetByName('TimeEditRequests');
    
    if (!editSheet) {
      Logger.log('TimeEditRequests sheet not found');
      return { success: true, requests: [], message: 'TimeEditRequests sheet not found' };
    }
    
    const data = editSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, requests: [], message: 'No time edit requests found' };
    }
    
    const headers = data[0];
    const requestIdCol = headers.indexOf('RequestID');
    const employeeIdCol = headers.indexOf('EmployeeID');
    const recordIdCol = headers.indexOf('RecordID');
    const originalTimeCol = headers.indexOf('OriginalTime');
    const requestedTimeCol = headers.indexOf('RequestedTime');
    const reasonCol = headers.indexOf('Reason');
    const statusCol = headers.indexOf('Status');
    const submittedAtCol = headers.indexOf('SubmittedAt');
    const reviewedAtCol = headers.indexOf('ReviewedAt');
    
    // Validate that required columns exist
    if (requestIdCol === -1 || employeeIdCol === -1 || statusCol === -1) {
      const missingCols = [];
      if (requestIdCol === -1) missingCols.push('RequestID');
      if (employeeIdCol === -1) missingCols.push('EmployeeID');
      if (statusCol === -1) missingCols.push('Status');
      
      Logger.log('Missing required columns in TimeEditRequests: ' + missingCols.join(', '));
      return { 
        success: false, 
        message: 'TimeEditRequests sheet missing required columns: ' + missingCols.join(', '),
        requests: []
      };
    }
    
    // Get worker names for display
    const workerNames = getWorkerNames_();
    
    const requests = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowStatus = String(row[statusCol] || '');
      
      // Filter by status if specified
      const includeRow = status === 'all' || 
                        rowStatus === status || 
                        (status === 'pending' && rowStatus === 'pending') ||
                        (status === 'approved' && rowStatus === 'approved') ||
                        (status === 'denied' && rowStatus.startsWith('denied'));
      
      if (includeRow) {
        const empId = employeeIdCol !== -1 ? String(row[employeeIdCol] || '') : '';
        const employeeName = workerNames[empId] || empId || 'Unknown';
        
        // Format times using utility function for consistency
        const origTimeRaw = originalTimeCol !== -1 ? row[originalTimeCol] : '';
        const reqTimeRaw = requestedTimeCol !== -1 ? row[requestedTimeCol] : '';
        
        requests.push({
          requestId: requestIdCol !== -1 ? (row[requestIdCol] || '') : '',
          employeeId: empId,
          employeeName: employeeName,
          recordId: recordIdCol !== -1 ? (row[recordIdCol] || '') : '',
          originalTime: formatTime_(origTimeRaw),
          requestedTime: formatTime_(reqTimeRaw),
          reason: reasonCol !== -1 ? (row[reasonCol] || '') : '',
          status: rowStatus,
          submittedAt: submittedAtCol !== -1 ? (row[submittedAtCol] || '') : '',
          reviewedAt: reviewedAtCol !== -1 ? (row[reviewedAtCol] || '') : ''
        });
      }
    }
    
    // Sort by submitted date (newest first)
    requests.sort((a, b) => {
      const dateA = new Date(a.submittedAt);
      const dateB = new Date(b.submittedAt);
      return dateB - dateA;
    });
    
    return {
      success: true,
      requests: requests
    };
    
  } catch (err) {
    Logger.log('Error getting time edit requests: ' + err);
    return {
      success: false,
      message: 'Failed to get time edit requests: ' + err.message,
      requests: []
    };
  }
}

// ======================================================
//  GET TIME ENTRY STATUS
// ======================================================
function getTimeEntryStatus_(workerId, recordId) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    
    // Check if there's a pending edit request for this record
    const editSheet = ss.getSheetByName('TimeEditRequests');
    if (editSheet) {
      const data = editSheet.getDataRange().getValues();
      const headers = data[0];
      const employeeIdCol = headers.indexOf('EmployeeID');
      const recordIdCol = headers.indexOf('RecordID');
      const statusCol = headers.indexOf('Status');
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[employeeIdCol] === workerId && 
            (recordId ? row[recordIdCol] === recordId : true)) {
          const status = row[statusCol];
          if (status === 'pending') {
            return {
              success: true,
              status: 'editing',
              message: 'Edit request pending approval'
            };
          } else if (status === 'approved') {
            return {
              success: true,
              status: 'confirmed',
              message: 'Time entry confirmed'
            };
          } else if (String(status).startsWith('denied')) {
            return {
              success: true,
              status: 'confirmed',
              message: 'Edit request denied - original time stands'
            };
          }
        }
      }
    }
    
    // No edit requests found - entry is confirmed
    return {
      success: true,
      status: 'confirmed',
      message: 'Time entry confirmed'
    };
    
  } catch (err) {
    Logger.log('Error getting time entry status: ' + err);
    return {
      success: false,
      status: 'confirmed',
      message: 'Error checking status - assuming confirmed'
    };
  }
}
// ======================================================
//  TEST FUNCTION: Centralized Logging Integration  
// ======================================================
/**
 * Test all migrated logging functions in ClockIn module
 * Verifies that TT_LOGGER wrapper is working correctly
 * Run this to test the centralized logging integration
 */
function testClockInLogging() {
  Logger.log('=== Testing Clock-In Centralized Logging ===');
  Logger.log('Timestamp: ' + new Date().toISOString());
  
  const results = {
    testsRun: 0,
    testsPassed: 0,
    testsFailed: 0,
    errors: []
  };
  
  try {
    // Test 1: Clock-in success logging
    Logger.log('\n Test 1: Clock-In Success Log');
    results.testsRun++;
    try {
      const result1 = TT_LOGGER.logClockIn(
        {
          workerId: 'TEST001',
          displayName: 'Test Worker - ClockIn',
          device: 'Test Device',
          language: 'en'
        },
        {
          siteName: 'Test Warehouse',
          distance: 0.12,
          latitude: 35.7796,
          longitude: -78.6382,
          clockinID: 'CLK-TEST-' + Date.now(),
          minutesLate: 0
        }
      );
      if (result1.success) {
        Logger.log(' Test 1 passed - Log ID: ' + result1.logId);
        results.testsPassed++;
      } else {
        throw new Error('Failed to log clock-in: ' + result1.error);
      }
    } catch (e) {
      Logger.log(' Test 1 failed: ' + e.toString());
      results.testsFailed++;
      results.errors.push('Test 1: ' + e.toString());
    }
    
    // Test 2: Geofence violation logging
    Logger.log('\n Test 2: Geofence Violation Log');
    results.testsRun++;
    try {
      const result2 = TT_LOGGER.logGeofenceViolation(
        {
          workerId: 'TEST002',
          displayName: 'Test Worker - Geofence',
          device: 'Test Device'
        },
        {
          latitude: 35.8000,
          longitude: -78.7000,
          nearestClient: 'ABC Distribution',
          distance: 0.8
        }
      );
      if (result2.success) {
        Logger.log(' Test 2 passed - Log ID: ' + result2.logId);
        results.testsPassed++;
      } else {
        throw new Error('Failed to log geofence violation: ' + result2.error);
      }
    } catch (e) {
      Logger.log(' Test 2 failed: ' + e.toString());
      results.testsFailed++;
      results.errors.push('Test 2: ' + e.toString());
    }
    
    // Test 3: Rate limit logging
    Logger.log('\n Test 3: Rate Limit Log');
    results.testsRun++;
    try {
      const result3 = TT_LOGGER.logRateLimit(
        'TEST003',
        'Test Worker - RateLimit',
        8,
        30,
        {
          lastClockinTime: new Date(Date.now() - 8 * 60 * 1000).toISOString()
        }
      );
      if (result3.success) {
        Logger.log(' Test 3 passed - Log ID: ' + result3.logId);
        results.testsPassed++;
      } else {
        throw new Error('Failed to log rate limit: ' + result3.error);
      }
    } catch (e) {
      Logger.log(' Test 3 failed: ' + e.toString());
      results.testsFailed++;
      results.errors.push('Test 3: ' + e.toString());
    }
    
    // Test 4: Late email notification logging
    Logger.log('\n Test 4: Late Email Log');
    results.testsRun++;
    try {
      const result4 = TT_LOGGER.logLateEmail(
        {
          workerId: 'TEST004',
          displayName: 'Test Worker - Late'
        },
        {
          siteName: 'XYZ Warehouse',
          minutesLate: 15,
          clockinTime: '08:15 AM'
        }
      );
      if (result4.success) {
        Logger.log(' Test 4 passed - Log ID: ' + result4.logId);
        results.testsPassed++;
      } else {
        throw new Error('Failed to log late email: ' + result4.error);
      }
    } catch (e) {
      Logger.log(' Test 4 failed: ' + e.toString());
      results.testsFailed++;
      results.errors.push('Test 4: ' + e.toString());
    }
    
    Logger.log('\n Phase 1 Complete (4/7 tests)');
    Logger.log('Activity_Logs sheet URL: https://docs.google.com/spreadsheets/d/' + SHEET_ID);
    
    return {
      success: results.testsPassed === results.testsRun,
      testsRun: results.testsRun,
      testsPassed: results.testsPassed,
      testsFailed: results.testsFailed,
      errors: results.errors
    };
    
  } catch (error) {
    Logger.log('\n TEST SUITE ERROR: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}