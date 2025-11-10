/**
 * Handles incoming webhook requests for payroll processing & PDF report generation.
 * @param {GoogleAppsScript.Events.DoPost} e - The incoming HTTP POST request.
 * @returns {GoogleAppsScript.Content.TextOutput} - The response message.
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      logEvent("Webhook Error", { headers: e.parameter }, "❌ Invalid request payload (empty or malformed)");
      return createResponse(400, "❌ Invalid request payload");
    }

    // ✅ Parse & Log Incoming Payload
    const payload = JSON.parse(e.postData.contents);
    logEvent("Webhook Received", payload, "✅ Webhook triggered");

    // 🔄 **Handle Payroll Processing**
    if (payload["Webhook Type"] === "Run Payroll") {
      logEvent("Payroll Processing", payload, "🔄 Processing Payroll...");
      const result = processPayroll(payload["Week Period"]);
      
      logEvent("Payroll Completed", { ...payload, result }, "✅ Payroll processed");
      return createResponse(200, "Payroll processed");
    }

    // 📄 **Handle PDF Report Generation**
    if (payload["Webhook Type"] === "Generate PDF Report") {
      logEvent("PDF Report Requested", payload, "📄 Generating PDF...");

      // ✅ Validate Required Fields
      if (!payload["WorkerID"] || !payload["Worker Name"] || !payload["Send Report"]) {
        logEvent("PDF Report Failed", payload, "❌ Missing required fields (WorkerID, Worker Name, or Send Report)");
        return createResponse(400, "Missing required fields");
      }

      // 🔍 **Calculate Week Period**
      const weekPeriod = getWeekPeriod(payload["Send Report"]);
      logEvent("Derived Week Period", { workerId: payload["WorkerID"], weekPeriod }, "📅 Week Period derived from request");

      // 📄 **Generate PDF Report**
      const pdfUrl = generateWorkerPdfReport(payload["WorkerID"], payload["Worker Name"], weekPeriod);

      if (pdfUrl) {
        logEvent("PDF Report Generated", { ...payload, pdfUrl }, `✅ PDF created successfully: ${pdfUrl}`);
        return ContentService.createTextOutput(JSON.stringify({ success: true, pdfUrl }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        logEvent("PDF Report Failed", { ...payload, weekPeriod }, "❌ PDF generation failed");
        return createResponse(500, "Failed to generate PDF");
      }
    }

    // ❓ **Unknown Webhook Type**
    logEvent("Webhook Error", payload, "❌ Unknown Webhook Type received");
    return createResponse(400, "Unknown Webhook Type");

  } catch (error) {
    logEvent("Webhook Exception", { error: error.message }, `❌ Error processing request: ${error.message}`);
    return createResponse(500, error.message);
  }
}

/**
 * Logs events into the 'Log' sheet for traceability.
 * @param {string} eventType - Type of event (e.g., "Webhook Received", "Error").
 * @param {object} payload - Event data.
 * @param {string} status - Status message for logging.
 */
function logEvent(eventType, payload, status) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Log");
    if (!sheet) {
      Logger.log("⚠️ Log sheet not found!");
      return;
    }

    const timestamp = new Date().toISOString();
    sheet.appendRow([timestamp, eventType, JSON.stringify(payload), status]);
    Logger.log(`📝 Logged Event: ${eventType} - ${status}`);
  } catch (err) {
    Logger.log("⚠️ Failed to log event: " + err.message);
  }
}

/**
 * Creates a structured HTTP response.
 * @param {number} statusCode - HTTP status code.
 * @param {string} message - Response message.
 * @returns {GoogleAppsScript.Content.TextOutput} - Formatted response object.
 */
function createResponse(statusCode, message) {
  return ContentService.createTextOutput(JSON.stringify({ status: statusCode, message }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Determines the correct Week Period based on "Send Report" selection.
 * @param {string} sendReportValue - "Last Week" or "Current Week".
 * @returns {string} - Week Period (yyyy-MM-dd format).
 */
function getWeekPeriod(sendReportValue) {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Ensure no time interference

  // Find the last Saturday
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const lastSaturday = new Date(today);
  lastSaturday.setDate(today.getDate() - dayOfWeek - 1);

  // Find the upcoming Saturday
  const nextSaturday = new Date(lastSaturday);
  nextSaturday.setDate(lastSaturday.getDate() + 7);

  // Determine correct week period
  const targetSaturday = sendReportValue === "Last Week" ? lastSaturday : nextSaturday;
  
  return targetSaturday.toISOString().split("T")[0]; // Convert to yyyy-MM-dd
}

/**
 * Helper function to check if a date string is a Sunday.
 * @param {string} dateStr - Date in yyyy-MM-dd format.
 * @returns {boolean} - True if it's a Sunday, otherwise false.
 */
function isSunday(dateStr) {
  const date = new Date(dateStr);
  return date.getDay() === 0; // 0 = Sunday
}