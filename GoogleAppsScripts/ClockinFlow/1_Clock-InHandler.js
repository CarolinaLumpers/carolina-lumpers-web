/*
function handleClockIn(e) {
  const correlationId = Utilities.getUuid();
  const cache = CacheService.getScriptCache();

  try {
    const { workerId, workerName } = validateWorkerId(e); // throws on invalid

    // Step 1: Check cache to block repeated submissions within 2 minutes
    if (cache.get(`clockin-${workerId}`)) {
      throw new Error('🚫 Duplicate submission detected. Please wait a moment before retrying.');
    }

    // Step 2: Place a temporary cache lock BEFORE logging
    cache.put(`clockin-${workerId}`, "1", 120);

    // Step 3: Atomic clock-in process with locking around validation + write
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    let newClockInId, clockInTimestamp;

    try {
      clockInTimestamp = validateClockInRestrictions(workerId);  // includes duplicate & hour checks
      newClockInId = logClockIn(workerId, clockInTimestamp);     // append safely
    } finally {
      lock.releaseLock();
    }

    // Step 4: Run background updates
    try {
      batchUpdateClockInTimestamps();
    } catch (inner) {
      logDebug(`Batch update skipped: ${inner}`);
    }

    // Step 5: Build response
    const grouped = getWorkerClockInHistory(workerId);
    const readableTime = formatHourReadable(clockInTimestamp.getHours()) +
      (":" + clockInTimestamp.getMinutes().toString().padStart(2, "0"));

    const msg = `Clock-in recorded (id ${newClockInId}) at ${readableTime}.`;

    // Prevent re-trigger on page refresh
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

    return HtmlService.createHtmlOutput(renderClockInReport(msg, workerName, grouped).getContent() + rewrite)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  } catch (error) {
    logToSheet(CONFIG.SHEET_NAMES.LOG, `[NFC] handleClockIn error: ${error.message}`, { correlationId });
    let workerId = e?.parameter?.workerId;
    let workerName = 'Error';
    let grouped = {};

    try {
      if (workerId) {
        workerName = getWorkerName(workerId);
        grouped = getWorkerClockInHistory(workerId);
      }
    } catch (inner) {
      logDebug(`Could not fetch report after error: ${inner.message}`);
    }

    const html = generateClockInReport(`An error occurred: ${error.message}`, workerName, grouped);
    return HtmlService.createHtmlOutput(html);
  }
}
*/
