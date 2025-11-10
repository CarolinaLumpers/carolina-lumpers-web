/*
function doGet(e) {
  try {
    var params = (e && e.parameter) || {};
    var action = (params.action || "").toLowerCase();
    if (!action) throw new Error("Action parameter is missing.");

    if (action === "clockin") {
      return handleClockIn(e);
    }

    if (action === "report") {
      var workerId = params.workerId;
      if (!workerId) throw new Error("Missing workerId for report.");
      var workerName = getWorkerName(workerId);
      var grouped = getWorkerClockInHistory(workerId);
      return renderClockInReport("Last recorded times:", workerName, grouped);
    }

    throw new Error("Unsupported action: " + action);
  } catch (error) {
    logToSheet(CONFIG.SHEET_NAMES.LOG, "[NFC] doGet error: " + error.message);
    var htmlErr = generateClockInReport("An error occurred: " + error.message, "Error", {});
    return HtmlService.createHtmlOutput(htmlErr);
  }
}

*/