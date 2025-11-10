// ======================================================
// Project: Carolina Lumpers Centralized Logging Library
// File: CLS_Logging_Library.js
// Version: 1.2.0
// Description: AppSheet-optimized unified logging system
// for all Carolina Lumpers Google Apps Script projects
// ======================================================

// ======================================================
//  CONFIGURATION
// ======================================================

/**
 * Default spreadsheet ID for testing
 * This allows the library to test itself without requiring container-bound context
 * Override by passing sheetId in options when calling from other projects
 * @constant
 */
const DEFAULT_SHEET_ID = '1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk';

/**
 * Logging configuration constants
 * @constant
 */
const LOG_CONFIG = {
  SHEET_NAME: 'Activity_Logs',
  TIMEZONE: 'America/New_York',
  
  // Event types (AppSheet Enum values)
  EVENTS: {
    // Authentication
    LOGIN: 'Login',
    LOGIN_ATTEMPT: 'Login Attempt',
    LOGOUT: 'Logout',
    SIGNUP: 'Signup',
    
    // Time tracking
    CLOCK_IN: 'Clock In',
    CLOCK_OUT: 'Clock Out',
    LATE_ARRIVAL: 'Late Arrival',
    EARLY_DEPARTURE: 'Early Departure',
    
    // Time edits
    TIME_EDIT_REQUEST: 'Time Edit Request',
    TIME_EDIT_APPROVED: 'Time Edit Approved',
    TIME_EDIT_DENIED: 'Time Edit Denied',
    
    // System events
    GEOFENCE_VIOLATION: 'Geofence Violation',
    RATE_LIMIT: 'Rate Limit',
    LATE_EMAIL: 'Late Email Sent',
    PAYMENT_CHECK: 'Payment Check',
    OFFLINE_SYNC: 'Offline Sync',
    
    // Admin actions
    PAYROLL_GENERATED: 'Payroll Generated',
    REPORT_GENERATED: 'Report Generated',
    INVOICE_CREATED: 'Invoice Created',
    
    // Errors
    ERROR: 'Error',
    WARNING: 'Warning',
    SYSTEM: 'System Event'
  },
  
  // Project identifiers (AppSheet Enum values)
  PROJECTS: {
    TIME_TRACKING: 'TIME_TRACKING',
    PAYROLL: 'PAYROLL',
    SCHEDULING: 'SCHEDULING',
    INVOICING: 'INVOICING',
    ADMIN: 'ADMIN',
    HR: 'HR',
    OPERATIONS: 'OPERATIONS',
    QUICKBOOKS: 'QUICKBOOKS',
    WEB_FORMS: 'WEB_FORMS'
  },
  
  // Status values (AppSheet Enum values)
  STATUS: {
    SUCCESS: 'Success',
    FAILED: 'Failed',
    WARNING: 'Warning',
    LATE: 'Late',
    PENDING: 'Pending',
    COMPLETED: 'Completed',
    EMAIL_SENT: 'Email Sent',
    APPROVED: 'Approved',
    DENIED: 'Denied',
    IN_PROGRESS: 'In Progress'
  },
  
  // Column indices (0-based)
  COLUMNS: {
    LOG_ID: 0,         // A: Unique identifier
    TIMESTAMP: 1,      // B: DateTime
    EVENT_TYPE: 2,     // C: Event type
    WORKER_ID: 3,      // D: Employee ID
    DISPLAY_NAME: 4,   // E: Employee name
    SUMMARY: 5,        // F: Human-readable summary
    DEVICE: 6,         // G: Device/browser
    SITE: 7,           // H: Work location
    DISTANCE: 8,       // I: Distance from site (miles)
    LATITUDE: 9,       // J: GPS latitude
    LONGITUDE: 10,     // K: GPS longitude
    STATUS: 11,        // L: Status
    PROJECT: 12,       // M: Project/system
    DETAILS: 13        // N: JSON details
  }
};

// ======================================================
//  UTILITY FUNCTIONS
// ======================================================

/**
 * Generates a unique log ID for AppSheet key column
 * Format: LOG-{timestamp}-{random}
 * Example: LOG-20251017143022-A3F9
 * @returns {string} Unique log identifier
 */
function generateLogId() {
  const timestamp = Utilities.formatDate(
    new Date(), 
    LOG_CONFIG.TIMEZONE, 
    'yyyyMMddHHmmss'
  );
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LOG-${timestamp}-${random}`;
}

/**
 * Gets or creates the Activity_Logs sheet with proper structure
 * @param {Spreadsheet} spreadsheet - Google Sheets spreadsheet object
 * @returns {Sheet} The Activity_Logs sheet
 */
function getOrCreateLogSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(LOG_CONFIG.SHEET_NAME);
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet(LOG_CONFIG.SHEET_NAME);
    initializeLogSheet(sheet);
  }
  
  return sheet;
}

/**
 * Initializes the Activity_Logs sheet with proper headers and formatting
 * @param {Sheet} sheet - The sheet to initialize
 */
function initializeLogSheet(sheet) {
  // Set headers
  const headers = [
    'Log ID',           // A - Key column (Text)
    'Timestamp',        // B - DateTime
    'Event Type',       // C - Enum
    'Worker ID',        // D - Ref to Workers
    'Display Name',     // E - Text
    'Event Summary',    // F - LongText
    'Device',           // G - Text
    'Site',             // H - Ref to Sites
    'Distance',         // I - Number (miles)
    'Latitude',         // J - Number
    'Longitude',        // K - Number
    'Status',           // L - Enum
    'Project',          // M - Enum
    'Details'           // N - LongText (JSON)
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format header row
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4285F4');
  headerRange.setFontColor('#FFFFFF');
  
  // Set column widths
  sheet.setColumnWidth(1, 180);  // Log ID
  sheet.setColumnWidth(2, 150);  // Timestamp
  sheet.setColumnWidth(3, 120);  // Event Type
  sheet.setColumnWidth(4, 100);  // Worker ID
  sheet.setColumnWidth(5, 150);  // Display Name
  sheet.setColumnWidth(6, 300);  // Event Summary
  sheet.setColumnWidth(7, 120);  // Device
  sheet.setColumnWidth(8, 150);  // Site
  sheet.setColumnWidth(9, 80);   // Distance
  sheet.setColumnWidth(10, 100); // Latitude
  sheet.setColumnWidth(11, 100); // Longitude
  sheet.setColumnWidth(12, 100); // Status
  sheet.setColumnWidth(13, 120); // Project
  sheet.setColumnWidth(14, 400); // Details
  
  // Freeze header row
  sheet.setFrozenRows(1);
  
  // Set number formats
  sheet.getRange(2, 9, sheet.getMaxRows() - 1, 1).setNumberFormat('0.00'); // Distance
  sheet.getRange(2, 10, sheet.getMaxRows() - 1, 1).setNumberFormat('0.000000'); // Latitude
  sheet.getRange(2, 11, sheet.getMaxRows() - 1, 1).setNumberFormat('0.000000'); // Longitude
}

/**
 * Safely converts a value to a number or null
 * @param {*} value - Value to convert
 * @returns {number|null} Number or null
 */
function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = Number(value);
  return isNaN(num) ? null : num;
}

/**
 * Safely converts a value to a string or empty string
 * @param {*} value - Value to convert
 * @returns {string} String value
 */
function toStringOrEmpty(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

// ======================================================
//  CORE LOGGING FUNCTION
// ======================================================

/**
 * Main logging function - logs an event to the Activity_Logs sheet
 * @param {string} eventType - Type of event (use LOG_CONFIG.EVENTS values)
 * @param {string} userId - User/Worker ID
 * @param {string} displayName - User's display name
 * @param {string} summary - Human-readable event summary
 * @param {Object} options - Additional options
 * @param {string} options.device - Device/browser information
 * @param {string} options.site - Work site/location name
 * @param {number} options.distance - Distance from site in miles
 * @param {number} options.latitude - GPS latitude
 * @param {number} options.longitude - GPS longitude
 * @param {string} options.status - Event status (use LOG_CONFIG.STATUS values)
 * @param {string} options.project - Project identifier (use LOG_CONFIG.PROJECTS values)
 * @param {Object} options.details - Additional details (will be JSON stringified)
 * @param {string} options.sheetId - Optional: specific sheet ID (defaults to calling context)
 * @returns {Object} Result object with success status and log ID
 */
function logEvent(eventType, userId, displayName, summary, options = {}) {
  try {
    // Get spreadsheet ID (priority: options.sheetId > active spreadsheet > DEFAULT_SHEET_ID)
    const sheetId = options.sheetId 
      || SpreadsheetApp.getActiveSpreadsheet()?.getId() 
      || DEFAULT_SHEET_ID;
    
    if (!sheetId) {
      console.error('No spreadsheet ID available for logging');
      return { success: false, error: 'No spreadsheet ID' };
    }
    
    const spreadsheet = SpreadsheetApp.openById(sheetId);
    const sheet = getOrCreateLogSheet(spreadsheet);
    
    // Generate unique log ID
    const logId = generateLogId();
    
    // Current timestamp
    const timestamp = new Date();
    
    // Extract options with defaults
    const device = toStringOrEmpty(options.device);
    const site = toStringOrEmpty(options.site);
    const distance = toNumberOrNull(options.distance);
    const latitude = toNumberOrNull(options.latitude);
    const longitude = toNumberOrNull(options.longitude);
    const status = toStringOrEmpty(options.status || LOG_CONFIG.STATUS.SUCCESS);
    const project = toStringOrEmpty(options.project || LOG_CONFIG.PROJECTS.TIME_TRACKING);
    
    // Convert details to JSON string
    let detailsJson = '';
    if (options.details && typeof options.details === 'object') {
      try {
        detailsJson = JSON.stringify(options.details, null, 2);
      } catch (e) {
        detailsJson = String(options.details);
      }
    } else if (options.details) {
      detailsJson = String(options.details);
    }
    
    // Build row data (matching column order)
    const rowData = [
      logId,              // A: Log ID
      timestamp,          // B: Timestamp
      eventType,          // C: Event Type
      userId,             // D: Worker ID
      displayName,        // E: Display Name
      summary,            // F: Event Summary
      device,             // G: Device
      site,               // H: Site
      distance,           // I: Distance
      latitude,           // J: Latitude
      longitude,          // K: Longitude
      status,             // L: Status
      project,            // M: Project
      detailsJson         // N: Details
    ];
    
    // Append to sheet
    sheet.appendRow(rowData);
    
    // Log to console for debugging
    console.log(`[${project}] ${eventType}: ${summary} (${logId})`);
    
    return {
      success: true,
      logId: logId,
      timestamp: timestamp
    };
    
  } catch (error) {
    console.error('Logging failed:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ======================================================
//  CONVENIENCE FUNCTIONS
// ======================================================

/**
 * Log a clock-in event
 * @param {string} workerId - Worker ID
 * @param {string} displayName - Worker's display name
 * @param {string} site - Work site name
 * @param {number} distance - Distance from site in miles
 * @param {number} latitude - GPS latitude
 * @param {number} longitude - GPS longitude
 * @param {Object} options - Additional options (device, status, clockinID, minutesLate, etc.)
 * @returns {Object} Result object
 */
function logClockIn(workerId, displayName, site, distance, latitude, longitude, options = {}) {
  const minutesLate = options.minutesLate || 0;
  const isLate = minutesLate > 0;
  
  const summary = isLate 
    ? `${displayName} clocked in at ${site} (${minutesLate} min late)`
    : `${displayName} clocked in at ${site}`;
  
  const status = isLate ? LOG_CONFIG.STATUS.LATE : LOG_CONFIG.STATUS.SUCCESS;
  
  const details = {
    clockinID: options.clockinID,
    minutesLate: minutesLate,
    geofenceRadius: options.geofenceRadius,
    mapsLink: latitude && longitude 
      ? `https://www.google.com/maps?q=${latitude},${longitude}`
      : null,
    ...options.details
  };
  
  return logEvent(
    LOG_CONFIG.EVENTS.CLOCK_IN,
    workerId,
    displayName,
    summary,
    {
      ...options,
      site: site,
      distance: distance,
      latitude: latitude,
      longitude: longitude,
      status: status,
      details: details
    }
  );
}

/**
 * Log a clock-out event
 * @param {string} workerId - Worker ID
 * @param {string} displayName - Worker's display name
 * @param {string} site - Work site name
 * @param {number} hoursWorked - Total hours worked
 * @param {Object} options - Additional options
 * @returns {Object} Result object
 */
function logClockOut(workerId, displayName, site, hoursWorked, options = {}) {
  const summary = `${displayName} clocked out from ${site} (${hoursWorked.toFixed(2)} hours)`;
  
  const details = {
    hoursWorked: hoursWorked,
    clockoutID: options.clockoutID,
    ...options.details
  };
  
  return logEvent(
    LOG_CONFIG.EVENTS.CLOCK_OUT,
    workerId,
    displayName,
    summary,
    {
      ...options,
      site: site,
      status: LOG_CONFIG.STATUS.SUCCESS,
      details: details
    }
  );
}

/**
 * Log a login event
 * @param {string} workerId - Worker ID
 * @param {string} displayName - Worker's display name
 * @param {string} device - Device/browser information
 * @param {string} email - Email address used
 * @param {Object} options - Additional options
 * @returns {Object} Result object
 */
function logLogin(workerId, displayName, device, email, options = {}) {
  const summary = `${displayName} logged in via ${device}`;
  
  const details = {
    email: email,
    ip: options.ip,
    userAgent: options.userAgent,
    biometric: options.biometric || false,
    ...options.details
  };
  
  return logEvent(
    LOG_CONFIG.EVENTS.LOGIN,
    workerId,
    displayName,
    summary,
    {
      ...options,
      device: device,
      status: LOG_CONFIG.STATUS.SUCCESS,
      details: details
    }
  );
}

/**
 * Log a login attempt (success or failure)
 * @param {string} email - Email address attempted
 * @param {boolean} success - Whether login succeeded
 * @param {string} device - Device/browser information
 * @param {Object} options - Additional options
 * @returns {Object} Result object
 */
function logLoginAttempt(email, success, device, options = {}) {
  const summary = success 
    ? `Login successful: ${email}`
    : `Login failed: ${email}`;
  
  const status = success ? LOG_CONFIG.STATUS.SUCCESS : LOG_CONFIG.STATUS.FAILED;
  
  const details = {
    email: email,
    ip: options.ip,
    userAgent: options.userAgent,
    reason: options.reason,
    ...options.details
  };
  
  return logEvent(
    LOG_CONFIG.EVENTS.LOGIN_ATTEMPT,
    options.workerId || 'UNKNOWN',
    options.displayName || email,
    summary,
    {
      ...options,
      device: device,
      status: status,
      details: details
    }
  );
}

/**
 * Log a late arrival email notification
 * @param {string} workerId - Worker ID
 * @param {string} displayName - Worker's display name
 * @param {string} site - Work site name
 * @param {number} minutesLate - Minutes late
 * @param {Object} options - Additional options
 * @returns {Object} Result object
 */
function logLateEmail(workerId, displayName, site, minutesLate, options = {}) {
  const summary = `Late arrival email sent for ${displayName} at ${site} (${minutesLate} min late)`;
  
  const details = {
    minutesLate: minutesLate,
    recipients: options.recipients || [],
    clockinTime: options.clockinTime,
    expectedTime: options.expectedTime,
    ...options.details
  };
  
  return logEvent(
    LOG_CONFIG.EVENTS.LATE_EMAIL,
    workerId,
    displayName,
    summary,
    {
      ...options,
      site: site,
      status: LOG_CONFIG.STATUS.EMAIL_SENT,
      details: details
    }
  );
}

/**
 * Log a time edit request submission
 * @param {string} employeeId - Employee ID
 * @param {string} employeeName - Employee name
 * @param {string} requestId - Time edit request ID
 * @param {Object} options - Additional options
 * @returns {Object} Result object
 */
function logTimeEditRequest(employeeId, employeeName, requestId, options = {}) {
  const summary = `${employeeName} submitted time edit request #${requestId}`;
  
  const details = {
    requestId: requestId,
    recordId: options.recordId,
    originalTime: options.originalTime,
    requestedTime: options.requestedTime,
    reason: options.reason,
    ...options.details
  };
  
  return logEvent(
    LOG_CONFIG.EVENTS.TIME_EDIT_REQUEST,
    employeeId,
    employeeName,
    summary,
    {
      ...options,
      status: LOG_CONFIG.STATUS.PENDING,
      details: details
    }
  );
}

/**
 * Log a time edit approval
 * @param {string} employeeId - Employee ID
 * @param {string} employeeName - Employee name
 * @param {string} approverName - Approver name
 * @param {string} requestId - Time edit request ID
 * @param {Object} options - Additional options
 * @returns {Object} Result object
 */
function logTimeEditApproval(employeeId, employeeName, approverName, requestId, options = {}) {
  const summary = `Time edit request #${requestId} approved by ${approverName} for ${employeeName}`;
  
  const details = {
    requestId: requestId,
    approverName: approverName,
    originalTime: options.originalTime,
    newTime: options.newTime,
    ...options.details
  };
  
  return logEvent(
    LOG_CONFIG.EVENTS.TIME_EDIT_APPROVED,
    employeeId,
    employeeName,
    summary,
    {
      ...options,
      status: LOG_CONFIG.STATUS.APPROVED,
      details: details
    }
  );
}

/**
 * Log a time edit denial
 * @param {string} employeeId - Employee ID
 * @param {string} employeeName - Employee name
 * @param {string} approverName - Approver name
 * @param {string} requestId - Time edit request ID
 * @param {Object} options - Additional options
 * @returns {Object} Result object
 */
function logTimeEditDenial(employeeId, employeeName, approverName, requestId, options = {}) {
  const summary = `Time edit request #${requestId} denied by ${approverName} for ${employeeName}`;
  
  const details = {
    requestId: requestId,
    approverName: approverName,
    reason: options.reason,
    ...options.details
  };
  
  return logEvent(
    LOG_CONFIG.EVENTS.TIME_EDIT_DENIED,
    employeeId,
    employeeName,
    summary,
    {
      ...options,
      status: LOG_CONFIG.STATUS.DENIED,
      details: details
    }
  );
}

/**
 * Log a geofence violation
 * @param {string} workerId - Worker ID
 * @param {string} displayName - Worker's display name
 * @param {number} distance - Distance from nearest site
 * @param {number} latitude - GPS latitude
 * @param {number} longitude - GPS longitude
 * @param {Object} options - Additional options
 * @returns {Object} Result object
 */
function logGeofenceViolation(workerId, displayName, distance, latitude, longitude, options = {}) {
  const summary = `${displayName} attempted clock-in outside geofence (${distance.toFixed(2)} mi from ${options.nearestSite || 'nearest site'})`;
  
  const details = {
    nearestSite: options.nearestSite,
    geofenceRadius: options.geofenceRadius,
    mapsLink: `https://www.google.com/maps?q=${latitude},${longitude}`,
    ...options.details
  };
  
  return logEvent(
    LOG_CONFIG.EVENTS.GEOFENCE_VIOLATION,
    workerId,
    displayName,
    summary,
    {
      ...options,
      distance: distance,
      latitude: latitude,
      longitude: longitude,
      status: LOG_CONFIG.STATUS.FAILED,
      details: details
    }
  );
}

/**
 * Log a rate limit event (preventing duplicate clock-ins)
 * @param {string} workerId - Worker ID
 * @param {string} displayName - Worker's display name
 * @param {number} minutesSinceLastClockIn - Minutes since last clock-in
 * @param {number} rateLimit - Rate limit in minutes
 * @param {Object} options - Additional options
 * @returns {Object} Result object
 */
function logRateLimit(workerId, displayName, minutesSinceLastClockIn, rateLimit, options = {}) {
  const summary = `${displayName} blocked by rate limit (${minutesSinceLastClockIn.toFixed(0)} min since last clock-in, limit: ${rateLimit} min)`;
  
  const details = {
    minutesSinceLastClockIn: minutesSinceLastClockIn,
    rateLimitMinutes: rateLimit,
    lastClockinTime: options.lastClockinTime,
    ...options.details
  };
  
  return logEvent(
    LOG_CONFIG.EVENTS.RATE_LIMIT,
    workerId,
    displayName,
    summary,
    {
      ...options,
      status: LOG_CONFIG.STATUS.WARNING,
      details: details
    }
  );
}

/**
 * Log a system event
 * @param {string} message - System message
 * @param {Object} options - Additional options
 * @returns {Object} Result object
 */
function logSystem(message, options = {}) {
  return logEvent(
    LOG_CONFIG.EVENTS.SYSTEM,
    options.userId || 'SYSTEM',
    options.displayName || 'System',
    message,
    {
      ...options,
      status: options.status || LOG_CONFIG.STATUS.SUCCESS
    }
  );
}

/**
 * Log an error event
 * @param {string} userId - User ID (or 'SYSTEM')
 * @param {string} displayName - User's display name
 * @param {string} errorMessage - Error message
 * @param {Object} options - Additional options
 * @returns {Object} Result object
 */
function logError(userId, displayName, errorMessage, options = {}) {
  const summary = `Error: ${errorMessage}`;
  
  const details = {
    error: errorMessage,
    stack: options.stack,
    function: options.function,
    ...options.details
  };
  
  return logEvent(
    LOG_CONFIG.EVENTS.ERROR,
    userId,
    displayName,
    summary,
    {
      ...options,
      status: LOG_CONFIG.STATUS.FAILED,
      details: details
    }
  );
}

/**
 * Get a log entry by ID
 * @param {string} logId - Log ID to retrieve
 * @param {Object} options - Additional options
 * @param {string} options.sheetId - Spreadsheet ID
 * @returns {Object|null} Log entry object or null if not found
 */
function getLogById(logId, options = {}) {
  try {
    const sheetId = options.sheetId || SpreadsheetApp.getActiveSpreadsheet()?.getId();
    if (!sheetId) {
      return null;
    }
    
    const spreadsheet = SpreadsheetApp.openById(sheetId);
    const sheet = spreadsheet.getSheetByName(LOG_CONFIG.SHEET_NAME);
    
    if (!sheet) {
      return null;
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find log by ID
    for (let i = 1; i < data.length; i++) {
      if (data[i][LOG_CONFIG.COLUMNS.LOG_ID] === logId) {
        const log = {};
        headers.forEach((header, index) => {
          log[header] = data[i][index];
        });
        return log;
      }
    }
    
    return null;
    
  } catch (error) {
    console.error('Failed to retrieve log:', error);
    return null;
  }
}

// ======================================================
//  QUERY FUNCTIONS
// ======================================================

/**
 * Get logs filtered by criteria
 * @param {Object} filters - Filter criteria
 * @param {string} filters.workerId - Filter by worker ID
 * @param {string} filters.eventType - Filter by event type
 * @param {string} filters.site - Filter by site
 * @param {string} filters.project - Filter by project
 * @param {Date} filters.startDate - Filter by start date
 * @param {Date} filters.endDate - Filter by end date
 * @param {number} filters.limit - Maximum number of results
 * @param {Object} options - Additional options
 * @param {string} options.sheetId - Spreadsheet ID
 * @returns {Array} Array of log entries
 */
function getLogs(filters = {}, options = {}) {
  try {
    const sheetId = options.sheetId || SpreadsheetApp.getActiveSpreadsheet()?.getId();
    if (!sheetId) {
      return [];
    }
    
    const spreadsheet = SpreadsheetApp.openById(sheetId);
    const sheet = spreadsheet.getSheetByName(LOG_CONFIG.SHEET_NAME);
    
    if (!sheet) {
      return [];
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    let logs = [];
    
    // Convert rows to objects
    for (let i = 1; i < data.length; i++) {
      const log = {};
      headers.forEach((header, index) => {
        log[header] = data[i][index];
      });
      logs.push(log);
    }
    
    // Apply filters
    if (filters.workerId) {
      logs = logs.filter(log => log['Worker ID'] === filters.workerId);
    }
    
    if (filters.eventType) {
      logs = logs.filter(log => log['Event Type'] === filters.eventType);
    }
    
    if (filters.site) {
      logs = logs.filter(log => log['Site'] === filters.site);
    }
    
    if (filters.project) {
      logs = logs.filter(log => log['Project'] === filters.project);
    }
    
    if (filters.startDate) {
      logs = logs.filter(log => new Date(log['Timestamp']) >= filters.startDate);
    }
    
    if (filters.endDate) {
      logs = logs.filter(log => new Date(log['Timestamp']) <= filters.endDate);
    }
    
    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b['Timestamp']) - new Date(a['Timestamp']));
    
    // Apply limit
    if (filters.limit && filters.limit > 0) {
      logs = logs.slice(0, filters.limit);
    }
    
    return logs;
    
  } catch (error) {
    console.error('Failed to get logs:', error);
    return [];
  }
}

// ======================================================
//  TEST FUNCTION
// ======================================================

/**
 * Test function to verify library setup
 * Creates sample log entries and verifies sheet structure
 * 
 * IMPORTANT: When using this library from a standalone (non-container-bound) project,
 * you must provide the sheetId parameter explicitly in all options.
 * 
 * For container-bound scripts (bound to a spreadsheet), sheetId is optional.
 */
function testLoggingLibrary() {
  console.log('Starting logging library test...');
  
  // Try to get active spreadsheet first, fallback to DEFAULT_SHEET_ID
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheetId = null;
  let isContainerBound = false;
  
  if (ss) {
    // Container-bound script
    sheetId = ss.getId();
    isContainerBound = true;
    console.log('✅ Container-bound script detected');
    console.log('Spreadsheet ID:', sheetId);
  } else {
    // Standalone script - use DEFAULT_SHEET_ID
    sheetId = DEFAULT_SHEET_ID;
    console.log('✅ Standalone script detected');
    console.log('Using DEFAULT_SHEET_ID:', sheetId);
    
    // Open the spreadsheet by ID
    try {
      ss = SpreadsheetApp.openById(sheetId);
      console.log('✅ Successfully opened spreadsheet');
    } catch (error) {
      console.error('❌ Failed to open spreadsheet:', error.toString());
      return {
        success: false,
        error: 'Failed to open spreadsheet: ' + error.toString()
      };
    }
  }
  
  try {
    // Test 1: Create/initialize sheet
    const sheet = getOrCreateLogSheet(ss);
    console.log('✅ Sheet created/found:', sheet.getName());
    
    // Test 2: Log a clock-in event
    const result1 = logClockIn(
      'CLS001',
      'John Doe',
      'ABC Warehouse',
      0.15,
      35.7796,
      -78.6382,
      {
        device: 'iPhone 13',
        minutesLate: 5,
        clockinID: 'TEST-001',
        sheetId: sheetId,
        project: LOG_CONFIG.PROJECTS.TIME_TRACKING
      }
    );
    console.log('✅ Clock-in logged:', result1.logId);
    
    // Test 3: Log a login event
    const result2 = logLogin(
      'CLS002',
      'Jane Smith',
      'Chrome Browser',
      'jane@example.com',
      {
        ip: '192.168.1.1',
        biometric: true,
        sheetId: sheetId,
        project: LOG_CONFIG.PROJECTS.TIME_TRACKING
      }
    );
    console.log('✅ Login logged:', result2.logId);
    
    // Test 4: Log a geofence violation
    const result3 = logGeofenceViolation(
      'CLS003',
      'Bob Johnson',
      0.5,
      35.7800,
      -78.6400,
      {
        nearestSite: 'XYZ Distribution',
        geofenceRadius: 0.3,
        device: 'Android Phone',
        sheetId: sheetId,
        project: LOG_CONFIG.PROJECTS.TIME_TRACKING
      }
    );
    console.log('✅ Geofence violation logged:', result3.logId);
    
    // Test 5: Log a system event
    const result4 = logSystem(
      'Logging library test completed successfully',
      {
        sheetId: sheetId,
        project: LOG_CONFIG.PROJECTS.TIME_TRACKING
      }
    );
    console.log('✅ System event logged:', result4.logId);
    
    // Test 6: Retrieve a log by ID
    const retrievedLog = getLogById(result1.logId, { sheetId: sheetId });
    if (retrievedLog) {
      console.log('✅ Log retrieved:', retrievedLog['Log ID']);
    }
    
    // Test 7: Query logs
    const logs = getLogs(
      { 
        workerId: 'CLS001',
        limit: 10
      },
      { sheetId: sheetId }
    );
    console.log('✅ Query returned', logs.length, 'logs');
    
    console.log('\n=== Test Summary ===');
    console.log('All tests completed successfully!');
    console.log('Check the Activity_Logs sheet for entries.');
    console.log('Spreadsheet URL:', ss.getUrl());
    console.log('Ready for deployment as library.');
    
    return {
      success: true,
      message: 'All tests passed',
      logIds: [result1.logId, result2.logId, result3.logId, result4.logId],
      spreadsheetUrl: ss.getUrl()
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error.toString());
    console.error('Stack:', error.stack);
    return {
      success: false,
      error: error.toString(),
      stack: error.stack
    };
  }
}
