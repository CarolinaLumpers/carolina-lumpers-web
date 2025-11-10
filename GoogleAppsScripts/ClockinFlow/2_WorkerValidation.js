/*
function validateWorkerId(e) {
  const workerId = e?.parameter?.workerId?.trim();
  if (!workerId) throw new Error('❌ Worker ID is missing or invalid.');

  const workersData = getSheetData(CONFIG.SHEET_NAMES.WORKERS);
  const { WORKER_ID, WORKER_NAME, AVAILABILITY } = CONFIG.COLUMNS.WORKERS.INDICES;

  const workerRow = workersData.find(r => String(r[WORKER_ID - 1] || '').trim() === workerId);
  if (!workerRow) throw new Error('❌ Worker ID "' + workerId + '" not found.');

  const workerName = String(workerRow[WORKER_NAME - 1] || '').trim();
  const availability = String(workerRow[AVAILABILITY - 1] || '').toLowerCase();

  if (availability !== 'active') throw new Error('❌ Worker ID "' + workerId + '" is not active.');
  if (!workerName) throw new Error('❌ Worker name is missing for Worker ID "' + workerId + '".');

  logDebug('✅ Worker Validated: ID=' + workerId + ', Name=' + workerName + ', Status=' + availability);
  return { workerId, workerName };
}

function validateWorkHours(timestamp) {
  const START = CONFIG.TIME_SETTINGS.WORK_HOURS.START;
  const END   = CONFIG.TIME_SETTINGS.WORK_HOURS.END;
  const h     = timestamp.getHours();

  if (h < START || h >= END) {
    var rawMsg = 'Clock-in time ' + h + ' is outside allowed work hours (' + START + ' - ' + END + ').';
    throw new Error(prettyWorkHoursError(rawMsg));
  }
  logDebug('✅ Clock-in within allowed hours: ' + formatHourReadable(h));
}

function parseHHMMSS(s) {
  const m = /^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*$/.exec(String(s || ''));
  return m ? { h: +m[1], m: +m[2], s: +(m[3] || 0) } : null;
}

function validateDuplicateScan(workerId, clockInTimestamp) {
  const data = getSheetData(CONFIG.SHEET_NAMES.CLOCK_IN);
  const { WORKER_ID, DATE, TIME } = CONFIG.COLUMNS.CLOCK_IN.INDICES;

  const wId = String(workerId).trim();
  const last = data.slice(1).reverse().find(r => String(r[WORKER_ID - 1]).trim() === wId);
  if (!last) { logDebug(`✅ No previous clock-ins for ${wId}`); return; }

  const d = new Date(last[DATE - 1]);
  let lastTs;

  if (last[TIME - 1] instanceof Date) {
    // time stored as a Date
    const t = last[TIME - 1];
    lastTs = new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.getHours(), t.getMinutes(), t.getSeconds());
  } else {
    // time stored as string
    const t = parseHHMMSS(last[TIME - 1]);
    if (!t) {
      logDebug(`⚠️ Invalid prior date/time. Skipping duplicate check for ${wId}`);
      return;
    }
    lastTs = new Date(d.getFullYear(), d.getMonth(), d.getDate(), t.h, t.m, t.s);
  }

  const diffMin = (clockInTimestamp - lastTs) / 60000;
  logDebug(`Δ minutes since last for ${wId}: ${diffMin.toFixed(2)}`);

  if (diffMin < CONFIG.TIME_SETTINGS.DUPLICATE_SCAN_RESTRICTION_MINUTES) {
    throw new Error('🚨 Duplicate scan detected.');
  }
}


function validateClockInRestrictions(workerId) {
  const ts = new Date();
  logDebug('🔍 Validating restrictions for ' + workerId + ' at ' + ts);
  validateWorkHours(ts);
  validateDuplicateScan(workerId, ts);
  return ts;
}

function testValidateDuplicateScan() {
  const workerId = 'TEST-001';
  const now = new Date();
  const limit = CONFIG.TIME_SETTINGS.DUPLICATE_SCAN_RESTRICTION_MINUTES;
  const samples = [
    { label: '10 min ago (pass)', t: new Date(now.getTime() - 10 * 60000) },
    { label: 'same second (fail)', t: new Date(now.getTime()) },
  ];
  for (var i = 0; i < samples.length; i++) {
    var s = samples[i];
    try {
      const diff = (now - s.t) / 60000;
      if (diff < limit) throw new Error('🚨 Duplicate scan detected.');
      Logger.log('PASS ' + s.label);
    } catch (e) {
      Logger.log('FAIL ' + s.label + ': ' + e.message);
    }
  }
}

function formatHourReadable(hour) {
  var suffix = hour >= 12 ? 'PM' : 'AM';
  var h = hour % 12;
  if (h === 0) h = 12;
  return h + ':00 ' + suffix;
}

function prettyWorkHoursError(message) {
  if (!message) return message;
  return message
    .replace(/Clock-in time (\d{1,2})/i, function(_, h) {
      return 'Clock-in time ' + formatHourReadable(parseInt(h, 10));
    })
    .replace(/\((\d{1,2})\s*-\s*(\d{1,2})\)/, function(_, s, e) {
      return '(' + formatHourReadable(parseInt(s, 10)) + ' – ' + formatHourReadable(parseInt(e, 10)) + ')';
    });
}
*/