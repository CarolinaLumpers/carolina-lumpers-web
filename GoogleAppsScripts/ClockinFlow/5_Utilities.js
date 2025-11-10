/*

function batchUpdateClockInTimestamps() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.CLOCK_IN);
  const data = sh.getDataRange().getValues();
  const rowsPayload = [];
  const timestamp = new Date().toISOString();

  for (let i = 1; i < data.length; i++) {
    const id = data[i][CONFIG.COLUMNS.CLOCK_IN.INDICES.CLOCK_IN_ID - 1];
    if (id) rowsPayload.push({ ClockInID: id, LastUpdated: timestamp });
  }
  if (!rowsPayload.length) { Logger.log('No rows to update'); return; }

  const payload = {
    Action: 'Edit',
    Properties: { Locale: 'en-US', Location: 'US' },
    Rows: rowsPayload
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    headers: { ApplicationAccessKey: CONFIG.APPSHEET.API_KEY }
  };

  const url = `https://api.appsheet.com/api/v2/apps/${CONFIG.APPSHEET.APP_ID}/tables/${CONFIG.SHEET_NAMES.CLOCK_IN}/Action`;
  const resp = UrlFetchApp.fetch(url, options);
  Logger.log(`Batch update code ${resp.getResponseCode()}`);
}

function getSheetData(sheetName) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sh) throw new Error(`Sheet '${sheetName}' not found!`);
  return sh.getDataRange().getValues();
}

function appendRowToSheet(sheetName, rowData) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sh) throw new Error(`Sheet '${sheetName}' not found.`);
  sh.appendRow(rowData);
}

function updateRowInSheet(sheetName, rowIndex, columnIndex, rowData) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sh) throw new Error(`Sheet '${sheetName}' not found.`);
  sh.getRange(rowIndex, columnIndex, 1, rowData.length).setValues([rowData]);
}

function generateUniqueId(prefix) {
  return `${prefix}-${Math.floor(Math.random() * 1e6).toString().padStart(6, '0')}`;
}

function formatDateAndTime(timestamp) {
  const tz = Session.getScriptTimeZone();
  return {
    date: Utilities.formatDate(timestamp, tz, 'MM/dd/yyyy'),
    time: Utilities.formatDate(timestamp, tz, 'HH:mm:ss'),
  };
}

function normalizeDateTime(ts) {
  const tz = Session.getScriptTimeZone();
  return {
    date: Utilities.formatDate(ts, tz, 'MM/dd/yyyy'),
    time: Utilities.formatDate(ts, tz, 'HH:mm:ss'),
  };
}

function generateUniqueClockInId() {
  const data = getSheetData(CONFIG.SHEET_NAMES.CLOCK_IN);
  const existing = new Set(data.map(r => r[CONFIG.COLUMNS.CLOCK_IN.INDICES.CLOCK_IN_ID - 1]));
  let id;
  do { id = `CLK-${Math.floor(Math.random() * 1e6).toString().padStart(6, '0')}`; } while (existing.has(id));
  return id;
}

function getWorkerName(workerId) {
  const data = getSheetData(CONFIG.SHEET_NAMES.WORKERS);
  const idxId = CONFIG.COLUMNS.WORKERS.INDICES.WORKER_ID - 1;
  const idxName = CONFIG.COLUMNS.WORKERS.INDICES.WORKER_NAME - 1;
  const row = data.find(r => String(r[idxId] || '').trim() === workerId);
  if (!row) throw new Error(`Worker ID "${workerId}" not found in Workers sheet.`);
  const name = String(row[idxName] || '').trim();
  if (!name) throw new Error(`Worker name missing for ID: "${workerId}".`);
  return name;
}



function logToSheet(level, component, message, context = {}) {
  try {
    const ss = SpreadsheetApp.getActive();
    const sh = ss.getSheetByName(CONFIG.SHEET_NAMES.LOG) || ss.insertSheet(CONFIG.SHEET_NAMES.LOG);
    const now = new Date();

    const entry = [
      Utilities.formatDate(now, Session.getScriptTimeZone(), "MM/dd/yyyy HH:mm:ss"),
      level || "INFO",
      component || "General",
      message || "",
      JSON.stringify(context)
    ];

    sh.appendRow(entry);

    // Optional: also log to Stackdriver for cloud visibility
    if (CONFIG.DEBUG) Logger.log(`${level} [${component}] ${message} ${JSON.stringify(context)}`);

  } catch (err) {
    Logger.log(`⚠️ Logging failed: ${err.message}`);
  }
}
*/