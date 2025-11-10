/**
 * Logs a message to the "Log" sheet.
 * @param {string} message - The message to log.
 */
function logToSheet(message) {
  const sheetName = 'Log';
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  const timestamp = new Date();
  sheet.appendRow([timestamp, message]);
}