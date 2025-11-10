/**
 * =====================================================
 * 🕓 CLOCKIN FLOW - Optimized Version (v2.1)
 * =====================================================
 * Improvements:
 *  ✅ Per-worker CacheService lock to prevent duplicate clock-ins
 *  ✅ Enhanced structured logging (logEvent wrapper)
 *  ✅ Refined duplicate detection (same-second & per-worker)
 *  ✅ Removed batchUpdateClockInTimestamps() call
 *  ✅ Cleaner organization and consistent formatting
 * =====================================================
 */


/* =====================================================
 * 1️⃣ ROUTING ENTRYPOINT
 * ===================================================== */
function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = (params.action || "").toLowerCase();
    if (!action) throw new Error("Action parameter is missing.");

    if (action === "clockin") return handleClockIn(e);

    if (action === "report") {
      const workerId = params.workerId;
      if (!workerId) throw new Error("Missing workerId for report.");
      const workerName = getWorkerName(workerId);
      const grouped = getWorkerClockInHistory(workerId);
      return renderClockInReport("Last recorded times:", workerName, grouped);
    }

    throw new Error("Unsupported action: " + action);
  } catch (error) {
    logEvent("ERROR", "Routing", "doGet failure", { error: error.message });
    const htmlErr = generateClockInReport("An error occurred: " + error.message, "Error", {});
    return HtmlService.createHtmlOutput(htmlErr);
  }
}


/* =====================================================
 * 2️⃣ MAIN CLOCK-IN HANDLER
 * ===================================================== */
function handleClockIn(e) {
  const correlationId = Utilities.getUuid();
  const start = Date.now();

  try {
    const { workerId, workerName } = validateWorkerId(e);
    acquireWorkerLock(workerId); // per-worker lock to prevent overlap

    const clockInTimestamp = validateClockInRestrictions(workerId);
    const newClockInId = logClockIn(workerId, clockInTimestamp);

    // Cache entry to block rapid re-submissions
    try { CacheService.getScriptCache().put(`clockin-${workerId}`, "1", 120); } catch (_) {}

    // Prepare success response
    const grouped = getWorkerClockInHistory(workerId);
    const readableTime = formatHourReadable(clockInTimestamp.getHours()) +
      (":" + clockInTimestamp.getMinutes().toString().padStart(2, "0"));
    const msg = `Clock-in recorded (id ${newClockInId}) at ${readableTime}.`;

    const out = renderClockInReport(msg, workerName, grouped);
    const rewrite = `
      <script>
        (function(){
          try {
            var url = new URL(window.location.href);
            url.searchParams.set('action','report');
            url.searchParams.set('lastId','${newClockInId}');
            history.replaceState({}, document.title, url.toString());
          } catch (e) {}
        })();
      </script>`;

    logEvent("INFO", "ClockIn", "Clock-in success", {
      workerId, workerName, clockInId: newClockInId,
      elapsedMs: Date.now() - start, correlationId
    });

    releaseWorkerLock(workerId);
    return HtmlService.createHtmlOutput(out.getContent() + rewrite)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  } catch (error) {
    releaseWorkerLock(e?.parameter?.workerId);
    logEvent("ERROR", "ClockIn", error.message, {
      workerId: e?.parameter?.workerId || "unknown",
      correlationId
    });

    // Fallback: display report even if error
    let workerId = e?.parameter?.workerId;
    let workerName = 'Error';
    let grouped = {};
    try {
      if (workerId) {
        workerName = getWorkerName(workerId);
        grouped = getWorkerClockInHistory(workerId);
      }
    } catch (inner) {
      logEvent("WARN", "ClockIn", "Unable to load report after error", { error: inner.message });
    }

    const html = generateClockInReport(`An error occurred: ${error.message}`, workerName, grouped);
    return HtmlService.createHtmlOutput(html);
  }
}


/* =====================================================
 * 3️⃣ CONCURRENCY CONTROL
 * ===================================================== */
function acquireWorkerLock(workerId) {
  const cache = CacheService.getScriptCache();
  const key = `lock-${workerId}`;
  if (cache.get(key)) throw new Error(`⏳ Worker ${workerId} is being processed. Try again.`);
  cache.put(key, "1", 10); // 10-second soft lock
}

function releaseWorkerLock(workerId) {
  if (!workerId) return;
  CacheService.getScriptCache().remove(`lock-${workerId}`);
}


/* =====================================================
 * 4️⃣ WORKER VALIDATION
 * ===================================================== */
function validateWorkerId(e) {
  const workerId = e?.parameter?.workerId?.trim();
  if (!workerId) throw new Error('❌ Worker ID is missing or invalid.');

  const workersData = getSheetData(CONFIG.SHEET_NAMES.WORKERS);
  const { WORKER_ID, WORKER_NAME, AVAILABILITY } = CONFIG.COLUMNS.WORKERS.INDICES;

  const workerRow = workersData.find(r => String(r[WORKER_ID - 1] || '').trim() === workerId);
  if (!workerRow) throw new Error(`❌ Worker ID "${workerId}" not found.`);

  const workerName = String(workerRow[WORKER_NAME - 1] || '').trim();
  const availability = String(workerRow[AVAILABILITY - 1] || '').toLowerCase();

  if (availability !== 'active') throw new Error(`❌ Worker ID "${workerId}" is not active.`);
  if (!workerName) throw new Error(`❌ Worker name is missing for Worker ID "${workerId}".`);

  logEvent("DEBUG", "Validation", "Worker validated", { workerId, workerName, status: availability });
  return { workerId, workerName };
}


/* =====================================================
 * 5️⃣ CLOCK-IN RESTRICTIONS
 * ===================================================== */
function validateWorkHours(timestamp) {
  const { START, END } = CONFIG.TIME_SETTINGS.WORK_HOURS;
  const h = timestamp.getHours();

  if (h < START || h >= END) {
    const rawMsg = 'Clock-in time ' + h + ' is outside allowed work hours (' + START + ' - ' + END + ').';
    throw new Error(prettyWorkHoursError(rawMsg));
  }
  logEvent("DEBUG", "Validation", "Within allowed hours", { hour: h });
}

function parseHHMMSS(s) {
  const m = /^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*$/.exec(String(s || ''));
  return m ? { h: +m[1], m: +m[2], s: +(m[3] || 0) } : null;
}

function validateDuplicateScan(workerId, clockInTimestamp) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.CLOCK_IN);
  if (!sh) throw new Error(`Clock-in sheet '${CONFIG.SHEET_NAMES.CLOCK_IN}' not found.`);

  const lastRow = sh.getLastRow();
  if (lastRow < 2) return; // No data yet

  const { WORKER_ID, DATE, TIME } = CONFIG.COLUMNS.CLOCK_IN.INDICES;
  const tz = Session.getScriptTimeZone();
  const todayFormatted = Utilities.formatDate(clockInTimestamp, tz, "MM/dd/yyyy");

  // Only fetch recent rows (limit configurable)
  const LOOKBACK_ROWS = CONFIG?.DATA_LIMITS?.DAILY_ROWS || 200;
  const startRow = Math.max(2, lastRow - LOOKBACK_ROWS);
  const data = sh.getRange(startRow, 1, lastRow - startRow + 1, sh.getLastColumn()).getValues();

  // Filter today's rows for this worker
  const todayRows = data.filter(r => {
    const workerMatch = String(r[WORKER_ID - 1]).trim() === workerId;
    const dateVal = r[DATE - 1];
    const dateStr = dateVal instanceof Date
      ? Utilities.formatDate(dateVal, tz, "MM/dd/yyyy")
      : String(dateVal).trim();
    return workerMatch && dateStr === todayFormatted;
  });

  if (todayRows.length === 0) {
    logEvent("DEBUG", "DuplicateCheck", "No previous clock-ins today", { workerId });
    return;
  }

  const last = todayRows[todayRows.length - 1];
  const timeVal = last[TIME - 1];
  const parsedTime = timeVal instanceof Date
    ? { h: timeVal.getHours(), m: timeVal.getMinutes(), s: timeVal.getSeconds() }
    : parseHHMMSS(timeVal);

  if (!parsedTime) {
    logEvent("WARN", "DuplicateCheck", "Invalid prior time, skipping check", { workerId });
    return;
  }

  const lastTs = new Date(clockInTimestamp.getFullYear(), clockInTimestamp.getMonth(), clockInTimestamp.getDate(),
    parsedTime.h, parsedTime.m, parsedTime.s);
  const diffMs = clockInTimestamp - lastTs;
  const diffMin = diffMs / 60000;

  logEvent("DEBUG", "DuplicateCheck", "Time difference since last clock-in", { workerId, diffMin });

  if (diffMs === 0 || diffMin < CONFIG.TIME_SETTINGS.DUPLICATE_SCAN_RESTRICTION_MINUTES) {
    throw new Error("🚨 Duplicate scan detected.");
  }
}



function validateClockInRestrictions(workerId) {
  const ts = new Date();
  logEvent("DEBUG", "Validation", "Running restrictions check", { workerId, ts });
  validateWorkHours(ts);
  validateDuplicateScan(workerId, ts);
  return ts;
}


/* =====================================================
 * 6️⃣ CLOCK-IN LOGGING
 * ===================================================== */
function logClockIn(workerId, clockInTimestamp) {
  const sheetName = CONFIG.SHEET_NAMES.CLOCK_IN;
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sh) throw new Error(`Log Sheet '${sheetName}' not found!`);

  const { date, time } = formatDateAndTime(clockInTimestamp);
  const newClockInId = generateUniqueId('CLK');
  const row = [newClockInId, workerId, date, time, '', '', '', '', ''];

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    appendRowToSheet(sheetName, row);
    logEvent("INFO", "ClockIn", "Clock-in logged", { workerId, clockInId: newClockInId, date, time });
  } catch (error) {
    logEvent("ERROR", "ClockIn", "Failed to append row", { workerId, error: error.message });
    throw new Error(`Failed to log clock-in event: ${error.message}`);
  } finally {
    lock.releaseLock();
  }

  return newClockInId;
}


/* =====================================================
 * 7️⃣ REPORT GENERATION
 * ===================================================== */
function generateClockInReport(message, workerName, groupedByDate) {
  if (!groupedByDate || typeof groupedByDate !== "object") {
    logEvent("ERROR", "Report", "Invalid groupedByDate", { input: groupedByDate });
    throw new Error("Invalid groupedByDate: Expected an object.");
  }

  const styles = `
    body { font-family: Arial, sans-serif; color: #f2f2f2; background-color: #000; padding: 10px; margin: 0; text-align: center; }
    .header { color: #ffcc00; margin-bottom: 20px; }
    .header h1 { font-size: 3.6em; }
    .header img { max-width: 120px; margin-top: 10px; }
    .message { margin-bottom: 20px; font-size: 2.4em; }
    .worker-name { font-size: 3.6em; margin-bottom: 20px; }
    .day-group { margin-bottom: 20px; }
    .day-title { font-size: 3em; font-weight: bold; margin-bottom: 10px; color: #ffcc00; }
    .time-item { font-size: 3em; border-bottom: 1px solid #555; padding: 5px 0; }
  `;

  const dayGroupsHtml = Object.keys(groupedByDate)
    .sort((a, b) => new Date(a) - new Date(b))
    .map(date => `
      <div class="day-group">
        <div class="day-title">${date}</div>
        ${groupedByDate[date].map(en => `<div class="time-item">${en.time}</div>`).join("")}
      </div>`)
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <head><title>Clock-In Report</title><style>${styles}</style></head>
      <body>
        <div class="header">
          <h1>Clock-In Report</h1>
          <img src="https://carolinalumpers.com/assets/CLS-003%20(1)%20dark.webp" alt="Logo">
        </div>
        <div class="message">${message}</div>
        <div class="worker-name">${workerName}</div>
        ${dayGroupsHtml}
      </body>
    </html>`;
}

function renderClockInReport(message, workerName, groupedByDate) {
  const t = HtmlService.createTemplateFromFile("ClockInReport");
  t.message = message;
  t.workerName = workerName;
  t.groupedByDate = Object.keys(groupedByDate).map(d => ({ date: d, entries: groupedByDate[d] }));
  return t.evaluate().setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


/* =====================================================
 * 8️⃣ CLOCK-IN HISTORY RETRIEVAL
 * ===================================================== */
function getWorkerClockInHistory(workerId) {
  try {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.CLOCK_IN);
    if (!sh) throw new Error(`Clock-in sheet '${CONFIG.SHEET_NAMES.CLOCK_IN}' not found.`);

    const lastRow = sh.getLastRow();
    if (lastRow < 2) return {};

    const { WORKER_ID, DATE, TIME } = CONFIG.COLUMNS.CLOCK_IN.INDICES;
    const LOOKBACK_ROWS = CONFIG?.DATA_LIMITS?.WEEKLY_ROWS || 500;
    const startRow = Math.max(2, lastRow - LOOKBACK_ROWS);
    const data = sh.getRange(startRow, 1, lastRow - startRow + 1, sh.getLastColumn()).getValues();

    // Define start & end of the current week (Sunday–Saturday)
    const tz = Session.getScriptTimeZone();
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const grouped = Object.create(null);

    data.forEach(row => {
      const wId = String(row[WORKER_ID - 1]).trim();
      if (wId !== workerId) return;

      const dVal = row[DATE - 1];
      const dateObj = dVal instanceof Date ? dVal : new Date(dVal);
      if (isNaN(dateObj)) return;
      if (dateObj < startOfWeek || dateObj >= endOfWeek) return;

      const dateKey = Utilities.formatDate(dateObj, tz, "MM/dd/yyyy");

      let tVal = row[TIME - 1];
      if (tVal instanceof Date) {
        tVal = Utilities.formatDate(tVal, tz, "HH:mm:ss");
      } else if (typeof tVal === "string") {
        const parsed = parseHHMMSS(tVal);
        tVal = parsed ? formatHHMMSS(parsed.h, parsed.m, parsed.s) : tVal;
      }

      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push({ time: tVal });
    });

    // Sort entries for each day
    for (const k of Object.keys(grouped)) {
      grouped[k].sort((a, b) => a.time.localeCompare(b.time));
    }

    return grouped;

  } catch (error) {
    logEvent("ERROR", "Data", "getWorkerClockInHistory failed", { error: error.message });
    return {};
  }
}




/* =====================================================
 * 9️⃣ HELPERS (TIME & FORMATTING)
 * ===================================================== */
function formatClockInDate(dateValue) {
  return Utilities.formatDate(new Date(dateValue), Session.getScriptTimeZone(), "MM/dd/yyyy");
}

function formatClockInTime(timeValue) {
  if (timeValue instanceof Date) {
    return Utilities.formatDate(timeValue, Session.getScriptTimeZone(), "HH:mm:ss");
  }
  const t = parseHHMMSS(timeValue);
  return t ? formatHHMMSS(t.h, t.m, t.s) : String(timeValue);
}

function formatHHMMSS(h, m, s) {
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function formatHourReadable(hour) {
  const suffix = hour >= 12 ? "PM" : "AM";
  let h = hour % 12;
  if (h === 0) h = 12;
  return h + ":00 " + suffix;
}

function prettyWorkHoursError(message) {
  if (!message) return message;
  return message
    .replace(/Clock-in time (\d{1,2})/i, (_, h) => "Clock-in time " + formatHourReadable(parseInt(h, 10)))
    .replace(/\((\d{1,2})\s*-\s*(\d{1,2})\)/, (_, s, e) =>
      "(" + formatHourReadable(parseInt(s, 10)) + " – " + formatHourReadable(parseInt(e, 10)) + ")");
}


/* =====================================================
 * 🔟 UTILITIES & LOGGING
 * ===================================================== */
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

function generateUniqueId(prefix) {
  return `${prefix}-${Math.floor(Math.random() * 1e6).toString().padStart(6, "0")}`;
}

function formatDateAndTime(timestamp) {
  const tz = Session.getScriptTimeZone();
  return {
    date: Utilities.formatDate(timestamp, tz, "MM/dd/yyyy"),
    time: Utilities.formatDate(timestamp, tz, "HH:mm:ss")
  };
}

function getWorkerName(workerId) {
  const data = getSheetData(CONFIG.SHEET_NAMES.WORKERS);
  const idxId = CONFIG.COLUMNS.WORKERS.INDICES.WORKER_ID - 1;
  const idxName = CONFIG.COLUMNS.WORKERS.INDICES.WORKER_NAME - 1;
  const row = data.find(r => String(r[idxId] || "").trim() === workerId);
  if (!row) throw new Error(`Worker ID "${workerId}" not found in Workers sheet.`);
  const name = String(row[idxName] || "").trim();
  if (!name) throw new Error(`Worker name missing for ID: "${workerId}".`);
  return name;
}

/* --------------------
 * Structured Logging
 * -------------------- */
function logEvent(level, component, message, context = {}) {
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

    if (CONFIG.DEBUG) Logger.log(`${level} [${component}] ${message} ${JSON.stringify(context)}`);
  } catch (err) {
    Logger.log(`⚠️ Logging failed: ${err.message}`);
  }
}
