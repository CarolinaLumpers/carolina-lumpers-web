/**
 * Main_Webhook.gs - Handles Webhook Events for Invoice & QBO Sync System
 * Version: 2.0
 * Last Updated: (Insert Date)
 */

/**
 * Webhook listener that processes incoming events from AppSheet & QBO.
 * @param {object} e - The event object received from the webhook.
 * @returns {GoogleAppsScript.Content.TextOutput} - Response message.
 */
function doPost(e) {
    try {
        if (!e.postData || !e.postData.contents) {
            logEvent("Webhook Error: No postData received", "Failed");
            return ContentService.createTextOutput(
                JSON.stringify({ status: "❌ Error", message: "No postData received" })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        // Log the raw payload for debugging
        logEvent("Webhook Raw Payload received", "Info");

        const requestData = JSON.parse(e.postData.contents);
        const eventType = requestData.event;
        let invoiceNumber = requestData.invoiceNumber;

        // Handle different payload structures
        if (!invoiceNumber && requestData.eventNotifications) {
            const entities = requestData.eventNotifications[0].dataChangeEvent.entities;
            if (entities && entities.length > 0) {
                invoiceNumber = entities[0].id;
            }
        }

        // Invoice number is optional for certain events (like Check_Payment_Status)
        const eventsWithoutInvoiceNumber = ["Check_Payment_Status"];
        if (!invoiceNumber && !eventsWithoutInvoiceNumber.includes(eventType)) {
            logEvent("Webhook Error: Missing Invoice Number", "Failed");
            return ContentService.createTextOutput(
                JSON.stringify({ status: "❌ Error", message: "Missing Invoice Number" })
            ).setMimeType(ContentService.MimeType.JSON);
        }

        // Route event to appropriate handler
        let result;
        switch (eventType) {
            case "Invoice_Creation":
                handleInvoiceCreation(requestData);
                break;
            case "LineItem_Update":
                handleLineItemUpdate(requestData);
                break;
            case "QBO_Approval":
                result = handleQBOApproval(requestData);
                // Return the result from QBO sync (includes qboInvoiceId)
                return ContentService.createTextOutput(
                    JSON.stringify({ 
                        status: result?.success ? "✅ Success" : "❌ Error",
                        event: eventType,
                        invoiceNumber: invoiceNumber,
                        qboInvoiceId: result?.qboInvoiceId,
                        error: result?.error
                    })
                ).setMimeType(ContentService.MimeType.JSON);
            case "QBO_Payment_Update":
                handleQBO_PaymentUpdate(requestData);
                break;
            case "Check_Payment_Status":
                // Manual trigger to check all unpaid invoices
                dailyPaymentStatusCheck();
                break;
            default:
        }

        return ContentService.createTextOutput(
            JSON.stringify({ 
                status: "✅ Success", 
                event: eventType,
                invoiceNumber: invoiceNumber || "N/A"
            })
        ).setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        logEvent(`Webhook Error: ${error.message}`, "Failed");
        return ContentService.createTextOutput(
            JSON.stringify({ status: "❌ Error", message: error.message })
        ).setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * Handles invoice creation when a line item is added and no invoice exists.
 * @param {object} requestData - Data payload from the webhook.
 */
function handleInvoiceCreation(requestData) {
    const invoiceNumber = requestData.invoiceNumber;
    const existingInvoice = fetchInvoice(invoiceNumber);

    if (existingInvoice) {
        updateInvoice(invoiceNumber, { LastUpdated: getCurrentTimestamp() });
        updateInvoiceMetadata(invoiceNumber); // Ensure metadata is updated
        logEvent(`Invoice Updated: ${invoiceNumber}`, "Success");
    } else {
        createInvoice({ invoiceNumber: invoiceNumber });
        updateInvoiceMetadata(invoiceNumber); // Ensure metadata is updated
        logEvent(`Invoice Created: ${invoiceNumber}`, "Success");
    }
}
/**
 * Updates the metadata for a given invoice.
 * @param {string} invoiceNumber - The invoice number to update metadata for.
 */
function updateInvoiceMetadata(invoiceNumber) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Invoices");
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === invoiceNumber) { // Assuming the invoice number is in the first column
            sheet.getRange(i + 1, 9).setValue(getCurrentTimestamp()); // Assuming metadata is in the 5th column
            return;
        }
    }
    logEvent(`Metadata Update Error: Invoice ${invoiceNumber} not found`, "Failed");
}
/**
 * Updates invoice timestamps when line items are modified.
 * @param {object} requestData - Data payload from the webhook.
 */
function handleLineItemUpdate(requestData) {
    const invoiceNumber = requestData.invoiceNumber;
    updateInvoiceTimestamp(invoiceNumber);
    logEvent(`Line Item Update: ${invoiceNumber}`, "Success");
}

/**
 * Syncs invoices to QuickBooks Online when 'Push to QBO' is set to 'Yes'.
 * @param {object} requestData - Data payload from the webhook.
 * @returns {object} - Result with success status and qboInvoiceId if successful
 */
function handleQBOApproval(requestData) {
    logEvent(`QBO Approval: ${JSON.stringify(requestData)}`, "Processing");
    const invoiceNumber = requestData.invoiceNumber;
    if (!invoiceNumber) {
        logEvent("QBO Approval Error: Invoice number is not defined", "Error");
        return { success: false, error: 'Invoice number is not defined' };
    }
    return sendInvoiceToQBO(invoiceNumber);
}

/**
 * Updates invoice payment status when a QBO webhook fires.
 * @param {object} requestData - Data payload from the webhook.
 */
function handleQBO_PaymentUpdate(requestData) {
    try {
        const entity = requestData?.eventNotifications?.[0]?.dataChangeEvent?.entities?.[0];
        if (!entity || !entity.id) {
            logEvent("Payment Update", "Unknown", "Error", "Missing QBO entity ID in webhook payload");
            return;
        }

        const qboId = entity.id;

        // Fetch invoice details from QBO using internal ID
        const accessToken = getOAuthService().getAccessToken() || refreshAccessToken();
        const realmId = CONFIG.QBO_REALM_ID;
        const url = `${CONFIG.QBO_BASE_URL}${realmId}/invoice/${qboId}?minorversion=65`;

        const response = UrlFetchApp.fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/json"
            },
            muteHttpExceptions: true
        });

        if (response.getResponseCode() !== 200) {
            logEvent("Payment Update", qboId, "Error", `Failed to fetch QBO invoice. Response: ${response.getContentText()}`);
            return;
        }

        const invoiceData = JSON.parse(response.getContentText()).Invoice;
        const docNumber = invoiceData.DocNumber;
        const balance = invoiceData.Balance || 0;

        // Only mark paid if balance = 0
        const newStatus = balance === 0 ? "Paid" : "Partial";

        updateInvoice(docNumber, { Status: newStatus });
        updateInvoiceMetadata(docNumber);

        logEvent("Payment Update", docNumber, "Success", `Invoice marked as ${newStatus}.`);

    } catch (err) {
        logEvent("Payment Update", "Unknown", "Error", err.message);
    }
}

/**
 * Scheduled daily check to update invoice payment statuses from QBO.
 * Only checks invoices that are not yet marked as "Paid".
 */
/**
 * Scheduled daily check to update invoice payment statuses from QBO.
 * Checks only invoices not yet marked as "Paid".
 * Sets status to: "Paid" or "Unpaid" based on QBO balance.
 */
function dailyPaymentStatusCheck() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.INVOICES);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const invoiceCol = headers.indexOf(CONFIG.COLUMNS.INVOICES.INVOICE_NUMBER);
    const statusCol = headers.indexOf(CONFIG.COLUMNS.INVOICES.STATUS);

    let accessToken = getOAuthService().getAccessToken();
    if (!accessToken) accessToken = refreshAccessToken();
    const realmId = CONFIG.QBO_REALM_ID;

    const updates = [];

    for (let i = 1; i < data.length; i++) {
      const invoiceNumber = data[i][invoiceCol];
      const currentStatus = data[i][statusCol];

      // Skip blank or already-paid invoices
      if (!invoiceNumber || currentStatus === "Paid") continue;

      const queryUrl = `${CONFIG.QBO_BASE_URL}${realmId}/query?query=select * from Invoice where DocNumber='${invoiceNumber}'&minorversion=65`;

      try {
        const response = UrlFetchApp.fetch(queryUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json"
          },
          muteHttpExceptions: true
        });

        if (response.getResponseCode() !== 200) {
          logEvent("Daily Payment Check", invoiceNumber, "Error", `QBO query failed: ${response.getContentText()}`);
          continue;
        }

        const json = JSON.parse(response.getContentText());
        const invoice = json.QueryResponse?.Invoice?.[0];
        if (!invoice) continue;

        const balance = invoice.Balance || 0;
        const newStatus = balance === 0 ? "Paid" : "Unpaid";

        // Update only if changed
        if (newStatus !== currentStatus) {
          updateInvoice(invoiceNumber, { Status: newStatus });
          updateInvoiceMetadata(invoiceNumber);
          updates.push(`${invoiceNumber}: ${newStatus}`);
        }

      } catch (innerErr) {
        logEvent("Daily Payment Check", invoiceNumber, "Error", innerErr.message);
      }
    }

    logEvent("Daily Payment Check", "System", "Success", `Updated ${updates.length} invoices: ${updates.join(", ")}`);

  } catch (err) {
    logEvent("Daily Payment Check", "System", "Error", err.message);
  }
}
