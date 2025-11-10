// ======================================================
// Project: CLS Employee Login System
// File: CLS_EmployeeLogin_Logger.js
// Description: Logging wrapper for EmployeeLogin project
// using Carolina Lumpers Centralized Logging Library
// ======================================================

/**
 * EmployeeLogin Project Logging Wrapper
 * Provides convenience functions for logging all EmployeeLogin events
 * using the centralized Carolina Lumpers Logging Library
 */
const TT_LOGGER = {
  PROJECT_NAME: 'TIME_TRACKING',
  
  /**
   * Log a successful clock-in event
   * @param {Object} workerData - Worker information
   * @param {string} workerData.workerId - Worker ID
   * @param {string} workerData.displayName - Worker's full name
   * @param {string} workerData.device - Device/browser used
   * @param {string} workerData.language - Language preference
   * @param {Object} locationData - Location information
   * @param {string} locationData.siteName - Site/client name
   * @param {number} locationData.distance - Distance from site in miles
   * @param {number} locationData.latitude - GPS latitude
   * @param {number} locationData.longitude - GPS longitude
   * @param {string} locationData.clockinID - Clock-in record ID
   * @param {number} locationData.minutesLate - Minutes late (0 if on time)
   * @returns {Object} Logging result
   */
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
        sheetId: SHEET_ID,
        project: 'TIME_TRACKING',
        details: {
          geofenceRadius: GEOFENCE_RADIUS_MI,
          language: workerData.language || 'en',
          timestamp: new Date().toISOString()
        }
      }
    );
  },
  
  /**
   * Log a clock-out event (when implemented)
   * @param {Object} workerData - Worker information
   * @param {Object} locationData - Location and time information
   * @returns {Object} Logging result
   */
  logClockOut: function(workerData, locationData) {
    return CLLogger.logClockOut(
      workerData.workerId,
      workerData.displayName,
      locationData.siteName,
      locationData.hoursWorked,
      {
        device: workerData.device || 'Unknown Device',
        clockoutID: locationData.clockoutID || '',
        sheetId: SHEET_ID,
        project: 'TIME_TRACKING',
        details: {
          clockinTime: locationData.clockinTime,
          clockoutTime: locationData.clockoutTime
        }
      }
    );
  },
  
  /**
   * Log a user login event
   * @param {Object} workerData - Worker information
   * @param {string} workerData.workerId - Worker ID
   * @param {string} workerData.displayName - Worker's full name
   * @param {string} workerData.email - Email address
   * @param {string} workerData.device - Device/browser used
   * @param {string} workerData.role - User role (Admin/Lead/Worker)
   * @param {boolean} workerData.biometric - Whether biometric auth was used
   * @returns {Object} Logging result
   */
  logLogin: function(workerData) {
    return CLLogger.logLogin(
      workerData.workerId,
      workerData.displayName,
      workerData.device || 'Web Browser',
      workerData.email,
      {
        sheetId: SHEET_ID,
        project: 'TIME_TRACKING',
        details: {
          role: workerData.role || 'Worker',
          biometric: workerData.biometric || false,
          timestamp: new Date().toISOString()
        }
      }
    );
  },
  
  /**
   * Log a login attempt (success or failure)
   * @param {string} email - Email address attempted
   * @param {boolean} success - Whether login succeeded
   * @param {string} device - Device/browser used
   * @param {Object} additionalData - Additional data (workerId, displayName, reason)
   * @returns {Object} Logging result
   */
  logLoginAttempt: function(email, success, device, additionalData = {}) {
    return CLLogger.logLoginAttempt(
      email,
      success,
      device,
      {
        workerId: additionalData.workerId,
        displayName: additionalData.displayName,
        reason: additionalData.reason,
        sheetId: SHEET_ID,
        project: 'TIME_TRACKING',
        details: additionalData.details
      }
    );
  },
  
  /**
   * Log a user signup event
   * @param {Object} userData - User information
   * @returns {Object} Logging result
   */
  logSignup: function(userData) {
    return CLLogger.logEvent(
      'SIGNUP',
      userData.workerId || 'PENDING',
      userData.displayName,
      `${userData.displayName} signed up with email ${userData.email}`,
      {
        device: userData.device || 'Web Browser',
        sheetId: SHEET_ID,
        project: 'TIME_TRACKING',
        status: 'PENDING',
        details: {
          email: userData.email,
          phone: userData.phone,
          timestamp: new Date().toISOString()
        }
      }
    );
  },
  
  /**
   * Log a geofence violation
   * @param {Object} workerData - Worker information
   * @param {Object} locationData - Location information
   * @returns {Object} Logging result
   */
  logGeofenceViolation: function(workerData, locationData) {
    return CLLogger.logGeofenceViolation(
      workerData.workerId,
      workerData.displayName || 'Unknown Worker',
      locationData.distance,
      locationData.latitude,
      locationData.longitude,
      {
        device: workerData.device || 'Unknown Device',
        nearestSite: locationData.nearestClient || 'Unknown',
        geofenceRadius: GEOFENCE_RADIUS_MI,
        sheetId: SHEET_ID,
        project: 'TIME_TRACKING',
        details: {
          nearestAddress: locationData.nearestAddress
        }
      }
    );
  },
  
  /**
   * Log a rate limit warning (preventing duplicate clock-ins)
   * @param {string} workerId - Worker ID
   * @param {string} displayName - Worker's display name
   * @param {number} diff - Minutes since last clock-in
   * @param {number} minutes - Rate limit in minutes
   * @param {Object} additionalData - Additional data
   * @returns {Object} Logging result
   */
  logRateLimit: function(workerId, displayName, diff, minutes, additionalData = {}) {
    return CLLogger.logRateLimit(
      workerId,
      displayName || workerId,
      diff,
      minutes,
      {
        sheetId: SHEET_ID,
        project: 'TIME_TRACKING',
        details: {
          lastClockinTime: additionalData.lastClockinTime,
          attemptedTime: new Date().toISOString()
        }
      }
    );
  },
  
  /**
   * Log a late arrival email notification
   * @param {Object} workerData - Worker information
   * @param {Object} lateData - Late arrival data
   * @returns {Object} Logging result
   */
  logLateEmail: function(workerData, lateData) {
    return CLLogger.logLateEmail(
      workerData.workerId,
      workerData.displayName,
      lateData.siteName,
      lateData.minutesLate,
      {
        sheetId: SHEET_ID,
        project: 'TIME_TRACKING',
        details: {
          recipients: [INFO_EMAIL, CC_EMAIL],
          clockinTime: lateData.clockinTime,
          expectedTime: lateData.expectedTime,
          severity: lateData.severity || 'moderate'
        }
      }
    );
  },
  
  /**
   * Log a time edit request submission
   * @param {string} employeeId - Employee ID
   * @param {string} employeeName - Employee name
   * @param {string} requestId - Unique request ID
   * @param {Object} editData - Edit request data
   * @returns {Object} Logging result
   */
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
        project: 'TIME_TRACKING',
        details: {
          requestDate: new Date().toISOString(),
          status: 'Pending'
        }
      }
    );
  },
  
  /**
   * Log a time edit approval
   * @param {string} employeeId - Employee ID
   * @param {string} employeeName - Employee name
   * @param {string} approverName - Approver name
   * @param {string} requestId - Request ID
   * @param {Object} editData - Edit data
   * @returns {Object} Logging result
   */
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
        project: 'TIME_TRACKING',
        details: {
          approvalDate: new Date().toISOString(),
          recordId: editData.recordId
        }
      }
    );
  },
  
  /**
   * Log a time edit denial
   * @param {string} employeeId - Employee ID
   * @param {string} employeeName - Employee name
   * @param {string} approverName - Approver name
   * @param {string} requestId - Request ID
   * @param {string} reason - Denial reason
   * @returns {Object} Logging result
   */
  logTimeEditDenial: function(employeeId, employeeName, approverName, requestId, reason) {
    return CLLogger.logTimeEditDenial(
      employeeId,
      employeeName,
      approverName,
      requestId,
      {
        reason: reason,
        sheetId: SHEET_ID,
        project: 'TIME_TRACKING',
        details: {
          denialDate: new Date().toISOString()
        }
      }
    );
  },
  
  /**
   * Log a payroll generation event
   * @param {string} workerId - Worker ID
   * @param {string} displayName - Worker name
   * @param {Object} payrollData - Payroll information
   * @returns {Object} Logging result
   */
  logPayrollGeneration: function(workerId, displayName, payrollData) {
    return CLLogger.logEvent(
      'PAYROLL_GENERATED',
      workerId,
      displayName,
      `Payroll report generated for ${displayName} (${payrollData.weekEnd})`,
      {
        sheetId: SHEET_ID,
        project: 'TIME_TRACKING',
        status: 'COMPLETED',
        details: {
          weekEnd: payrollData.weekEnd,
          totalHours: payrollData.totalHours,
          totalPay: payrollData.totalPay,
          pdfGenerated: payrollData.pdfGenerated || false,
          emailSent: payrollData.emailSent || false
        }
      }
    );
  },
  
  /**
   * Log a report generation event
   * @param {string} workerId - Worker ID (or ADMIN)
   * @param {string} displayName - User name
   * @param {string} reportType - Type of report
   * @param {Object} reportData - Report data
   * @returns {Object} Logging result
   */
  logReportGeneration: function(workerId, displayName, reportType, reportData) {
    return CLLogger.logEvent(
      'REPORT_GENERATED',
      workerId,
      displayName,
      `${reportType} report generated by ${displayName}`,
      {
        sheetId: SHEET_ID,
        project: 'TIME_TRACKING',
        status: 'COMPLETED',
        details: {
          reportType: reportType,
          recordCount: reportData.recordCount,
          dateRange: reportData.dateRange,
          filters: reportData.filters
        }
      }
    );
  },
  
  /**
   * Log an offline sync event
   * @param {string} workerId - Worker ID
   * @param {string} displayName - Worker name
   * @param {Object} syncData - Sync information
   * @returns {Object} Logging result
   */
  logOfflineSync: function(workerId, displayName, syncData) {
    return CLLogger.logEvent(
      'OFFLINE_SYNC',
      workerId,
      displayName,
      `Offline clock-in synced for ${displayName}`,
      {
        device: syncData.device || 'Unknown Device',
        sheetId: SHEET_ID,
        project: 'TIME_TRACKING',
        status: 'SUCCESS',
        details: {
          offlineTimestamp: syncData.offlineTimestamp,
          syncTimestamp: new Date().toISOString(),
          queuedDuration: syncData.queuedDuration
        }
      }
    );
  },
  
  /**
   * Log a system event
   * @param {string} message - System message
   * @param {Object} details - Additional details
   * @returns {Object} Logging result
   */
  logSystem: function(message, details = {}) {
    return CLLogger.logSystem(
      message,
      {
        sheetId: SHEET_ID,
        project: 'TIME_TRACKING',
        status: details.status || 'SUCCESS',
        details: details
      }
    );
  },
  
  /**
   * Log an error event
   * @param {string} userId - User ID (or 'SYSTEM')
   * @param {string} displayName - User name (or 'System')
   * @param {string} errorMessage - Error message
   * @param {Object} errorDetails - Error details
   * @returns {Object} Logging result
   */
  logError: function(userId, displayName, errorMessage, errorDetails = {}) {
    return CLLogger.logError(
      userId || 'SYSTEM',
      displayName || 'System',
      errorMessage,
      {
        sheetId: SHEET_ID,
        project: 'TIME_TRACKING',
        function: errorDetails.function,
        stack: errorDetails.stack,
        details: errorDetails
      }
    );
  },
  
  /**
   * Log a W-9 form submission
   * @param {Object} workerData - Worker information
   * @param {string} workerData.workerId - Worker ID
   * @param {string} workerData.displayName - Worker name
   * @param {string} workerData.device - Device used
   * @param {string} workerData.email - Worker email
   * @param {string} w9RecordId - W-9 record ID (e.g., "W9-001")
   * @returns {Object} Logging result
   */
  logW9Submission: function(workerData, w9RecordId) {
    return CLLogger.logEvent(
      'W9_SUBMISSION',
      workerData.workerId,
      workerData.displayName,
      `${workerData.displayName} submitted W-9 form (${w9RecordId})`,
      {
        device: workerData.device || 'Unknown Device',
        sheetId: SHEET_ID,
        project: 'TIME_TRACKING',
        status: 'PENDING',
        details: {
          w9RecordId: w9RecordId,
          email: workerData.email,
          submissionDate: new Date().toISOString(),
          workflowStatus: 'pending_admin_review'
        }
      }
    );
  },
  
  /**
   * Log a W-9 approval by admin
   * @param {Object} workerData - Worker information (whose W-9 was approved)
   * @param {Object} adminData - Admin information (who approved)
   * @param {string} w9RecordId - W-9 record ID
   * @returns {Object} Logging result
   */
  logW9Approval: function(workerData, adminData, w9RecordId) {
    return CLLogger.logEvent(
      'W9_APPROVAL',
      workerData.workerId,
      workerData.displayName,
      `W-9 approved for ${workerData.displayName} by ${adminData.displayName} (${w9RecordId})`,
      {
        device: adminData.device || 'Unknown Device',
        sheetId: SHEET_ID,
        project: 'TIME_TRACKING',
        status: 'SUCCESS',
        details: {
          w9RecordId: w9RecordId,
          approvedBy: adminData.workerId,
          approverName: adminData.displayName,
          approvalDate: new Date().toISOString(),
          workerEmail: workerData.email,
          workflowStatus: 'approved'
        }
      }
    );
  },
  
  /**
   * Log a W-9 rejection by admin
   * @param {Object} workerData - Worker information (whose W-9 was rejected)
   * @param {Object} adminData - Admin information (who rejected)
   * @param {string} w9RecordId - W-9 record ID
   * @param {string} reason - Rejection reason
   * @returns {Object} Logging result
   */
  logW9Rejection: function(workerData, adminData, w9RecordId, reason) {
    return CLLogger.logEvent(
      'W9_REJECTION',
      workerData.workerId,
      workerData.displayName,
      `W-9 rejected for ${workerData.displayName} by ${adminData.displayName} (${w9RecordId})`,
      {
        device: adminData.device || 'Unknown Device',
        sheetId: SHEET_ID,
        project: 'TIME_TRACKING',
        status: 'REJECTED',
        details: {
          w9RecordId: w9RecordId,
          rejectedBy: adminData.workerId,
          rejecterName: adminData.displayName,
          rejectionDate: new Date().toISOString(),
          rejectionReason: reason,
          workerEmail: workerData.email,
          workflowStatus: 'rejected'
        }
      }
    );
  },
  
  /**
   * Log a W-9 PDF view event
   * @param {Object} viewerData - Viewer information
   * @param {string} viewerData.workerId - Viewer's worker ID
   * @param {string} viewerData.displayName - Viewer's name
   * @param {string} viewerData.device - Device used
   * @param {string} w9RecordId - W-9 record ID
   * @returns {Object} Logging result
   */
  logW9View: function(viewerData, w9RecordId) {
    return CLLogger.logEvent(
      'W9_VIEW',
      viewerData.workerId,
      viewerData.displayName,
      `${viewerData.displayName} viewed W-9 PDF (${w9RecordId})`,
      {
        device: viewerData.device || 'Unknown Device',
        sheetId: SHEET_ID,
        project: 'TIME_TRACKING',
        status: 'SUCCESS',
        details: {
          w9RecordId: w9RecordId,
          viewDate: new Date().toISOString()
        }
      }
    );
  }
};

/**
 * Helper function to get worker display name from Workers sheet
 * @param {string} workerId - Worker ID
 * @returns {string} Worker's display name or worker ID if not found
 */
function getWorkerDisplayName_(workerId) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const workersSheet = ss.getSheetByName('Workers');
    
    if (!workersSheet) {
      return workerId;
    }
    
    const data = workersSheet.getDataRange().getValues();
    const headers = data[0].map(String);
    const idIdx = headers.indexOf('WorkerID');
    const nameIdx = headers.indexOf('FullName') >= 0 
      ? headers.indexOf('FullName') 
      : headers.indexOf('Name');
    
    if (idIdx < 0 || nameIdx < 0) {
      return workerId;
    }
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idIdx]) === String(workerId)) {
        return String(data[i][nameIdx]) || workerId;
      }
    }
    
    return workerId;
    
  } catch (error) {
    console.error('Failed to get worker display name:', error);
    return workerId;
  }
}
