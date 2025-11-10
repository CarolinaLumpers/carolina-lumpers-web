/*
function logClockIn(workerId, clockInTimestamp) {
  const sheetName = CONFIG.SHEET_NAMES.CLOCK_IN;
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sh) throw new Error(`Log Sheet '${sheetName}' not found!`);

  const { date, time } = formatDateAndTime(clockInTimestamp);
  const newClockInId = generateUniqueId('CLK');

  // Build new row per config; leave LastUpdated blank
  const row = [
    newClockInId, // ClockInID
    workerId,     // WorkerID
    date,         // Date
    time,         // Time
    '',           // Notes
    '',           // TaskID (unused)
    '',           // Approve
    '',           // spare
    ''            // LastUpdated
  ];

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    appendRowToSheet(sheetName, row);
    logToSheet(CONFIG.SHEET_NAMES.LOG, `[NFC] ✅ Clock-in logged WorkerID=${workerId} ID=${newClockInId} ${date} ${time}`);
  } catch (error) {
    logToSheet(CONFIG.SHEET_NAMES.LOG, `[NFC] Error appending row: ${error.message}`);
    throw new Error(`Failed to log clock-in event: ${error.message}`);
  } finally {
    lock.releaseLock();
  }

  return newClockInId;
}
*/