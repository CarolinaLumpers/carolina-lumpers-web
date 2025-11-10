/*******************************************************
 * SheetsService.js
 *
 * Provides helper functions to interact with the main
 * project spreadsheet. It:
 *   - Reads Workers (active only) from the "Workers" sheet
 *   - Reads Payroll LineItems from the "Payroll LineItems" sheet
 *   - Appends structured log entries to the "Log" sheet
 *
 * Assumes you have a CONFIG object that contains
 * your script configuration, including:
 *   CONFIG.SPREADSHEET_ID
 *   CONFIG.SHEETS.WORKERS
 *   CONFIG.SHEETS.PAYROLL_LINE_ITEMS
 *   CONFIG.SHEETS.LOG
 *   CONFIG.COLUMNS.WORKERS
 *   CONFIG.COLUMNS.PAYROLL_LINE_ITEMS
 *******************************************************/

/**
 * Fetches only "active" workers from the Workers sheet.
 * @returns {Object[]} Array of worker objects.
 * @throws {Error} If required columns or sheet are missing.
 */
function getActiveWorkers() {
  const spreadsheetId = CONFIG.SPREADSHEET_ID;
  const sheetName = CONFIG.SHEETS.WORKERS;
  const columns = CONFIG.COLUMNS.WORKERS; // E.g. { WORKER_ID: "WorkerID", AVAILABILITY: "Availability", ... }

  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found in spreadsheet "${spreadsheetId}".`);
  }

  // Read all data
  const allRows = sheet.getDataRange().getValues();
  if (allRows.length < 2) {
    // Only header row or empty
    return [];
  }

  // Extract headers from the first row
  const headers = allRows[0];
  validateRequiredColumns(headers, Object.values(columns), sheetName);

  // Find index of the "Availability" column
  const availabilityColName = columns.AVAILABILITY; // e.g. "Availability"
  const availabilityIdx = headers.indexOf(availabilityColName);

  // Build array of objects, skipping header and blank rows
  const dataRows = allRows.slice(1).filter(row => !isBlankRow(row));

  // Convert each row to an object keyed by the header
  const workers = dataRows.map(row => {
    const rowObject = {};
    headers.forEach((headerName, colIndex) => {
      rowObject[headerName] = row[colIndex];
    });
    return rowObject;
  });

  // Filter only active workers
  const activeWorkers = workers.filter(w => {
    return w[availabilityColName] === 'Active';
  });

  return activeWorkers;
}

/**
 * Fetches payroll line items from the "Payroll LineItems" sheet.
 * @returns {Object[]} Array of payroll line item objects.
 * @throws {Error} If required columns or sheet are missing.
 */
function getPayrollLineItems() {
  const spreadsheetId = CONFIG.SPREADSHEET_ID;
  const sheetName = CONFIG.SHEETS.PAYROLL_LINE_ITEMS;
  const columns = CONFIG.COLUMNS.PAYROLL_LINE_ITEMS;

  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found in spreadsheet "${spreadsheetId}".`);
  }

  const allRows = sheet.getDataRange().getValues();
  if (allRows.length < 2) {
    // Only header row or empty
    return [];
  }

  // Extract headers from the first row
  const headers = allRows[0];
  validateRequiredColumns(headers, Object.values(columns), sheetName);

  // Build array of objects, skipping header and blank rows
  const dataRows = allRows.slice(1).filter(row => !isBlankRow(row));

  const lineItems = dataRows.map(row => {
    const rowObject = {};
    headers.forEach((headerName, colIndex) => {
      rowObject[headerName] = row[colIndex];
    });
    return rowObject;
  });

  return lineItems;
}

/**
 * Appends a log entry to the Log sheet with columns:
 *   [Timestamp, LogLevel, Message, ContextData].
 * @param {string} logLevel - e.g. "INFO", "WARN", "ERROR".
 * @param {string} message - The message or description.
 * @param {string|object} contextData - Additional context (stringified if object).
 */
function appendLogEntry(logLevel, message, contextData) {
  const spreadsheetId = CONFIG.SPREADSHEET_ID;
  const sheetName = CONFIG.SHEETS.LOG;

  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Log sheet "${sheetName}" not found in spreadsheet "${spreadsheetId}".`);
  }

  // Convert objects to string for logging
  let contextString = contextData;
  if (typeof contextData === 'object') {
    contextString = JSON.stringify(contextData);
  }

  sheet.appendRow([new Date(), logLevel, message, contextString]);
}

//
// ────────────────────────────────────────────────────────────────────
//   Helper Functions
// ────────────────────────────────────────────────────────────────────
//

/**
 * Checks that all required columns exist in the given headers array.
 * If any are missing, throws an error.
 * @param {string[]} headers - The sheet's header row.
 * @param {string[]} requiredColumns - List of required column names.
 * @param {string} sheetName - For error reporting.
 */
function validateRequiredColumns(headers, requiredColumns, sheetName) {
  for (const colName of requiredColumns) {
    if (!headers.includes(colName)) {
      throw new Error(`Required column "${colName}" missing in sheet "${sheetName}".`);
    }
  }
}

/**
 * Determines if an entire row is blank (no content in any cell).
 * @param {any[]} row - A single row from getValues().
 * @returns {boolean} True if every cell is blank (null/empty).
 */
function isBlankRow(row) {
  // If every cell is empty or blank, we consider the row blank
  return row.every(cell => cell === '' || cell === null);
}