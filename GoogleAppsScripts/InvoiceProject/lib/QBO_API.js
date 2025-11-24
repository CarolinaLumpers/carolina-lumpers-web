/**
 * Revised Functions for Updated Invoice & QBO Sync System
 * Version: 4.0
 * Last Updated: 2025-02-12
 */

/**
 * Sends an invoice to QuickBooks Online via API with enhanced error handling, retries, and validation.
 * @param {string} invoiceNumber - The internal invoice number to sync.
 */
function sendInvoiceToQBO(invoiceNumber) {
    // Fetch invoice data, client data, and line items
    const invoiceData = fetchInvoice(invoiceNumber);
    const clientData = fetchClientData(invoiceData.customer);
    const lineItems = fetchInvoiceLineItems(invoiceNumber);

    const payload = buildInvoicePayload(invoiceData, clientData, lineItems);
    const url = CONFIG.QBO_BASE_URL + CONFIG.QBO_REALM_ID + "/invoice?minorversion=65";
    
    // Refresh the access token if expired
    let accessToken = getOAuthService().getAccessToken();
    if (!accessToken) {
        accessToken = refreshAccessToken();
        if (!accessToken) {
            logEvent("QBO Sync", invoiceNumber, "Error", "Could not retrieve new access token.");
            return false;
        }
    }

    // Check if the invoice already exists in QBO
    let existingInvoice = getInvoiceFromQBO(invoiceNumber, accessToken);
    if (existingInvoice) {
        payload.Id = existingInvoice.Id;
        payload.SyncToken = existingInvoice.SyncToken;
        logEvent("QBO Sync", invoiceNumber, "Info", "Invoice exists in QBO. Preparing to update.");
    } else {
        logEvent("QBO Sync", invoiceNumber, "Info", "Invoice does not exist in QBO. Preparing to create.");
    }

    let response;
    let statusCode;
    let content;
    let jsonResponse;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        attempts++;
        response = UrlFetchApp.fetch(url, {
            method: "POST",
            headers: {
              Authorization: "Bearer " + accessToken,
              Accept: "application/json",
              "Content-Type": "application/json"
            },
            payload: JSON.stringify(payload),
            muteHttpExceptions: true
        });
        
        statusCode = response.getResponseCode();
        content = response.getContentText();
        
        try {
            jsonResponse = JSON.parse(content);
        } catch (e) {
            logEvent("QBO Sync", invoiceNumber, "Error", `Failed to parse JSON response: ${e.message}`);
        }

        if (statusCode === 401) {
            logEvent("QBO Sync", invoiceNumber, "Error", "Authentication failed. Refreshing access token and retrying...");
            accessToken = refreshAccessToken();
            if (!accessToken) {
                logEvent("QBO Sync", invoiceNumber, "Error", "Could not retrieve new access token.");
                return false;
            }
        } else if (statusCode === 400 && jsonResponse && jsonResponse.Fault && jsonResponse.Fault.Error) {
            const error = jsonResponse.Fault.Error[0];
            if (error.Message === "Duplicate Document Number Error") {
                logEvent("QBO Sync", invoiceNumber, "Error", `Duplicate Document Number Error: ${error.Detail}`);
                // Re-query QBO to get the existing invoice details
                existingInvoice = getInvoiceFromQBO(invoiceNumber, accessToken);
                if (existingInvoice) {
                    payload.Id = existingInvoice.Id;
                    payload.SyncToken = existingInvoice.SyncToken;
                    logEvent("QBO Sync", invoiceNumber, "Info", "Re-query successful. Preparing to update existing invoice.");
                    continue; // Retry with the updated payload
                }
            }
        } else {
            break;
        }
    }

    if (jsonResponse && jsonResponse.Invoice && jsonResponse.Invoice.Id) {
        const QBOinvoiceID = jsonResponse.Invoice.Id;
        logEvent("QBO Sync", invoiceNumber, "Success", `Invoice successfully ${existingInvoice ? 'updated' : 'created'} in QuickBooks with QBO ID: ${QBOinvoiceID}`);
        markInvoiceAsSynced(invoiceNumber);
        return { success: true, qboInvoiceId: QBOinvoiceID };
    } else {
        if (jsonResponse && jsonResponse.Fault) {
            logEvent("QBO Sync", invoiceNumber, "Error", `QuickBooks Error Fault: ${JSON.stringify(jsonResponse.Fault)}`);
        } else if (jsonResponse && jsonResponse.ErrorDetail) {
            logEvent("QBO Sync", invoiceNumber, "Error", `QuickBooks Error Detail: ${JSON.stringify(jsonResponse.ErrorDetail)}`);
        }
        logEvent("QBO Sync", invoiceNumber, "Error", `Invoice ${existingInvoice ? 'update' : 'creation'} response did not include an ID.`);
        return { success: false, error: 'Invoice response did not include an ID' };
    }
}

/**
 * Retrieves an invoice from QuickBooks Online by internal invoice number.
 * @param {string} invoiceNumber - The internal invoice number.
 * @param {string} accessToken - The access token for authentication.
 * @returns {object|null} - The invoice data if found, otherwise null.
 */
function getInvoiceFromQBO(invoiceNumber, accessToken) {
    const url = `${CONFIG.QBO_BASE_URL}${CONFIG.QBO_REALM_ID}/query?query=select * from Invoice where DocNumber='${invoiceNumber}'&minorversion=65`;
    const response = UrlFetchApp.fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json"
        },
        muteHttpExceptions: true
    });

    const statusCode = response.getResponseCode();
    const content = response.getContentText();
    logEvent("QBO Sync", invoiceNumber, "Info", `HTTP Status Code (getInvoiceFromQBO): ${statusCode}`);
    
    if (statusCode === 200) {
        const jsonResponse = JSON.parse(content);
        if (jsonResponse.QueryResponse && jsonResponse.QueryResponse.Invoice && jsonResponse.QueryResponse.Invoice.length > 0) {
            return jsonResponse.QueryResponse.Invoice[0];
        }
    }

    return null;
}



/**
 * Creates the payload for the QBO invoice API request.
 * @param {object} invoiceData - The invoice data.
 * @param {object} clientData - The client data.
 * @param {Array} lineItems - The line items.
 * @returns {object} - The payload for the API request.
 */
function buildInvoicePayload(invoiceData, clientData, lineItems) {
    const txnDate = invoiceData.date ? normalizeDateToISO(invoiceData.date) : "";
    const dueDate = invoiceData.dueDate ? normalizeDateToISO(invoiceData.dueDate) : "";

    const linePayload = lineItems.map(item => {
        const serviceID = item.serviceId;
        const qty = item.quantity;
        const amount = item.amount;
        const description = item.description;
        const serviceDate = item.date ? normalizeDateToISO(item.date) : "";

        return {
            DetailType: "SalesItemLineDetail",
            Amount: amount,
            SalesItemLineDetail: {
                ItemRef: { value: serviceID },
                ServiceDate: serviceDate,
                Qty: qty,
                UnitPrice: amount / qty
            },
            Description: description
        };
    });

    return {
        DocNumber: invoiceData.invoiceNumber,
        TxnDate: txnDate,
        DueDate: dueDate,
        CustomerRef: { value: clientData.qboId },
        BillEmail: { Address: clientData.payablesEmail },
        BillEmailCc: { Address: clientData.payablesEmailCc },
        BillEmailBcc: { Address: clientData.payablesEmailBcc },
        PrivateNote: `Invoice # ${invoiceData.invoiceNumber}`,
        ShipAddr: {},
        SalesTermRef: {},
        Line: linePayload
    };
}

/**
 * Normalizes date values into YYYY-MM-DD ISO format.
 * @param {string|Date} dateValue - Input date.
 * @return {string} - Normalized date string or empty string if invalid.
 */
function normalizeDateToISO(dateValue) {
  if (dateValue instanceof Date) {
    return dateValue.toISOString().split("T")[0];
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }
  logMessage("⚠️ WARNING:", `Invalid date format detected - ${dateValue}`);
  return "";
}