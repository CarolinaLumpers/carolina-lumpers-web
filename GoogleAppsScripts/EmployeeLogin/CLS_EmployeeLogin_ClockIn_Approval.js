// ======================================================
// Project: CLS Employee Login System
// File: CLS_EmployeeLogin_ClockIn_Approval.js
// Description: Clock-in approval workflow for out-of-geofence entries
// ======================================================

// ======================================================
//  GET PENDING CLOCK-IN APPROVALS
// ======================================================
/**
 * Retrieves all clock-ins with ApprovalStatus='pending'
 * @returns {Object} { success: boolean, clockins: Array }
 */
function getPendingClockIns_() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const clockSheet = ss.getSheetByName('ClockIn');
    
    if (!clockSheet) {
      return { success: false, message: 'ClockIn sheet not found' };
    }
    
    const data = clockSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { success: true, clockins: [], message: 'No clock-in records found' };
    }
    
    const headers = data[0].map(function(h) { return String(h).trim(); });
    const idxClockinID = headers.indexOf('ClockinID');
    const idxWorkerID = headers.indexOf('WorkerID');
    const idxDate = headers.indexOf('Date');
    const idxTime = headers.indexOf('Time');
    const idxSite = headers.indexOf('Nearest Client');
    const idxDistance = headers.indexOf('Distance (mi)');
    const idxLat = headers.indexOf('Latitude');
    const idxLng = headers.indexOf('Longitude');
    const idxApprovalStatus = headers.indexOf('ApprovalStatus');
    
    if (idxApprovalStatus < 0) {
      return { success: false, message: 'ApprovalStatus column not found in ClockIn sheet' };
    }
    
    var pendingClockIns = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var status = String(row[idxApprovalStatus] || '').toLowerCase();
      
      if (status === 'pending') {
        var workerMeta = lookupWorkerMeta_(row[idxWorkerID]);
        
        pendingClockIns.push({
          clockinID: idxClockinID >= 0 ? row[idxClockinID] : '',
          workerID: idxWorkerID >= 0 ? row[idxWorkerID] : '',
          workerName: workerMeta.displayName || row[idxWorkerID],
          date: idxDate >= 0 ? Utilities.formatDate(new Date(row[idxDate]), TIMEZONE, 'MM/dd/yyyy') : '',
          time: idxTime >= 0 ? formatTime_(row[idxTime]) : '',
          site: idxSite >= 0 ? row[idxSite] : '',
          distance: idxDistance >= 0 ? String(row[idxDistance]) : '',
          latitude: idxLat >= 0 ? row[idxLat] : '',
          longitude: idxLng >= 0 ? row[idxLng] : '',
          mapsLink: (idxLat >= 0 && idxLng >= 0) ? 
            'https://www.google.com/maps?q=' + row[idxLat] + ',' + row[idxLng] : ''
        });
      }
    }
    
    return {
      success: true,
      clockins: pendingClockIns,
      count: pendingClockIns.length
    };
    
  } catch (err) {
    Logger.log('Error getting pending clock-ins: ' + err);
    return {
      success: false,
      message: 'Failed to get pending clock-ins: ' + err.message
    };
  }
}

// ======================================================
//  APPROVE CLOCK-IN
// ======================================================
/**
 * Approves a pending clock-in by updating ApprovalStatus to 'confirmed'
 * @param {string} clockinId - Clock-in ID to approve
 * @param {string} approverId - Worker ID of approver (admin/lead)
 * @returns {Object} { success: boolean, message: string }
 */
function handleApproveClockIn_(clockinId, approverId) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const clockSheet = ss.getSheetByName('ClockIn');
    
    if (!clockSheet) {
      return { success: false, message: 'ClockIn sheet not found' };
    }
    
    const data = clockSheet.getDataRange().getValues();
    const headers = data[0].map(function(h) { return String(h).trim(); });
    const idxClockinID = headers.indexOf('ClockinID');
    const idxApprovalStatus = headers.indexOf('ApprovalStatus');
    const idxWorkerID = headers.indexOf('WorkerID');
    const idxDate = headers.indexOf('Date');
    const idxTime = headers.indexOf('Time');
    const idxSite = headers.indexOf('Nearest Client');
    
    if (idxApprovalStatus < 0) {
      return { success: false, message: 'ApprovalStatus column not found' };
    }
    
    var rowIndex = -1;
    var clockinData = null;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][idxClockinID] === clockinId) {
        rowIndex = i + 1;
        clockinData = data[i];
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, message: 'Clock-in record not found' };
    }
    
    var currentStatus = String(clockinData[idxApprovalStatus] || '').toLowerCase();
    if (currentStatus !== 'pending') {
      return { success: false, message: 'Clock-in already processed (status: ' + currentStatus + ')' };
    }
    
    clockSheet.getRange(rowIndex, idxApprovalStatus + 1).setValue('confirmed');
    
    var workerMeta = lookupWorkerMeta_(clockinData[idxWorkerID]);
    var approverMeta = lookupWorkerMeta_(approverId);
    
    TT_LOGGER.logClockInApproval(
      {
        workerId: clockinData[idxWorkerID],
        displayName: workerMeta.displayName || clockinData[idxWorkerID],
        device: 'Admin Dashboard'
      },
      {
        clockinID: clockinId,
        approvedBy: approverMeta.displayName || approverId,
        action: 'APPROVED',
        site: idxSite >= 0 ? clockinData[idxSite] : '',
        date: idxDate >= 0 ? Utilities.formatDate(new Date(clockinData[idxDate]), TIMEZONE, 'MM/dd/yyyy') : '',
        time: idxTime >= 0 ? formatTime_(clockinData[idxTime]) : ''
      }
    );
    
    var subject = '✅ Clock-In Approved';
    var body = 'Your clock-in has been approved by ' + (approverMeta.displayName || approverId) + '.\n\n' +
      'Clock-in ID: ' + clockinId + '\n' +
      'Date: ' + (idxDate >= 0 ? Utilities.formatDate(new Date(clockinData[idxDate]), TIMEZONE, 'MM/dd/yyyy') : '') + '\n' +
      'Time: ' + (idxTime >= 0 ? formatTime_(clockinData[idxTime]) : '') + '\n' +
      'Site: ' + (idxSite >= 0 ? clockinData[idxSite] : '') + '\n\n' +
      'Your hours will be included in payroll.';
    
    if (workerMeta.email) {
      GmailApp.sendEmail(workerMeta.email, subject, body);
    }
    
    return {
      success: true,
      message: 'Clock-in approved successfully'
    };
    
  } catch (err) {
    Logger.log('Error approving clock-in: ' + err);
    return {
      success: false,
      message: 'Failed to approve clock-in: ' + err.message
    };
  }
}

// ======================================================
//  DENY CLOCK-IN
// ======================================================
/**
 * Denies a pending clock-in by updating ApprovalStatus to 'denied'
 * @param {string} clockinId - Clock-in ID to deny
 * @param {string} deniedBy - Worker ID of denier (admin/lead)
 * @param {string} reason - Reason for denial
 * @returns {Object} { success: boolean, message: string }
 */
function handleDenyClockIn_(clockinId, deniedBy, reason) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const clockSheet = ss.getSheetByName('ClockIn');
    
    if (!clockSheet) {
      return { success: false, message: 'ClockIn sheet not found' };
    }
    
    const data = clockSheet.getDataRange().getValues();
    const headers = data[0].map(function(h) { return String(h).trim(); });
    const idxClockinID = headers.indexOf('ClockinID');
    const idxApprovalStatus = headers.indexOf('ApprovalStatus');
    const idxWorkerID = headers.indexOf('WorkerID');
    const idxDate = headers.indexOf('Date');
    const idxTime = headers.indexOf('Time');
    const idxSite = headers.indexOf('Nearest Client');
    
    if (idxApprovalStatus < 0) {
      return { success: false, message: 'ApprovalStatus column not found' };
    }
    
    var rowIndex = -1;
    var clockinData = null;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][idxClockinID] === clockinId) {
        rowIndex = i + 1;
        clockinData = data[i];
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, message: 'Clock-in record not found' };
    }
    
    var currentStatus = String(clockinData[idxApprovalStatus] || '').toLowerCase();
    if (currentStatus !== 'pending') {
      return { success: false, message: 'Clock-in already processed (status: ' + currentStatus + ')' };
    }
    
    clockSheet.getRange(rowIndex, idxApprovalStatus + 1).setValue('denied');
    
    var workerMeta = lookupWorkerMeta_(clockinData[idxWorkerID]);
    var denierMeta = lookupWorkerMeta_(deniedBy);
    
    TT_LOGGER.logClockInApproval(
      {
        workerId: clockinData[idxWorkerID],
        displayName: workerMeta.displayName || clockinData[idxWorkerID],
        device: 'Admin Dashboard'
      },
      {
        clockinID: clockinId,
        approvedBy: denierMeta.displayName || deniedBy,
        action: 'DENIED',
        reason: reason || 'No reason provided',
        site: idxSite >= 0 ? clockinData[idxSite] : '',
        date: idxDate >= 0 ? Utilities.formatDate(new Date(clockinData[idxDate]), TIMEZONE, 'MM/dd/yyyy') : '',
        time: idxTime >= 0 ? formatTime_(clockinData[idxTime]) : ''
      }
    );
    
    var subject = '❌ Clock-In Denied';
    var body = 'Your clock-in has been denied by ' + (denierMeta.displayName || deniedBy) + '.\n\n' +
      'Clock-in ID: ' + clockinId + '\n' +
      'Date: ' + (idxDate >= 0 ? Utilities.formatDate(new Date(clockinData[idxDate]), TIMEZONE, 'MM/dd/yyyy') : '') + '\n' +
      'Time: ' + (idxTime >= 0 ? formatTime_(clockinData[idxTime]) : '') + '\n' +
      'Site: ' + (idxSite >= 0 ? clockinData[idxSite] : '') + '\n' +
      'Reason: ' + (reason || 'No reason provided') + '\n\n' +
      'This clock-in will NOT be included in payroll. Please contact your supervisor if you have questions.';
    
    if (workerMeta.email) {
      GmailApp.sendEmail(workerMeta.email, subject, body);
    }
    
    return {
      success: true,
      message: 'Clock-in denied'
    };
    
  } catch (err) {
    Logger.log('Error denying clock-in: ' + err);
    return {
      success: false,
      message: 'Failed to deny clock-in: ' + err.message
    };
  }
}
