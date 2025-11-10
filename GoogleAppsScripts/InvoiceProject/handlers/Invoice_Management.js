/**
 * Invoice_Management.gs - Handles Invoice Operations for Invoice & QBO Sync System
 * Version: 2.2
 * Last Updated: 2025-02-12
 */

/**
 * Creates a new invoice record in Google Sheets.
 * @param {object} invoiceData - The invoice details to be added. 
 */
function createInvoice(invoiceData) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.INVOICES);
    sheet.appendRow([
        invoiceData.invoiceNumber,
        "", "", "", "",
        "Unpaid",
        "Yes",
        "Pending"
    ]);
}

/**
 * Updates an existing invoice record with modified data.
 * @param {string} invoiceNumber - The invoice number to update.
 * @param {object} updatedFields - Key-value pairs of fields to update.
 */
function updateInvoice(invoiceNumber, updatedFields) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.INVOICES);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
        if (data[i][headers.indexOf(CONFIG.COLUMNS.INVOICES.INVOICE_NUMBER)] === invoiceNumber) {
            for (const [key, value] of Object.entries(updatedFields)) {
                data[i][headers.indexOf(key)] = value;
            }
            sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
            logEvent("Invoice Updated", invoiceNumber, "Success", "Invoice updated in sheet.");
            return;
        }
    }
    logEvent("Invoice Update Failed", invoiceNumber, "Error", "Invoice not found.");
}


/**
 * Retrieves invoice data from Google Sheets.
 * @param {string} invoiceNumber - The invoice number to fetch.
 * @returns {object|null} - The invoice data or null if not found.
 */
function fetchInvoice(invoiceNumber) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.INVOICES);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
        if (data[i][headers.indexOf(CONFIG.COLUMNS.INVOICES.INVOICE_NUMBER)] === invoiceNumber) {
            const invoiceData = {
                invoiceNumber: data[i][headers.indexOf(CONFIG.COLUMNS.INVOICES.INVOICE_NUMBER)],
                customer: data[i][headers.indexOf(CONFIG.COLUMNS.INVOICES.CUSTOMER)],
                date: data[i][headers.indexOf(CONFIG.COLUMNS.INVOICES.DATE)],
                dueDate: data[i][headers.indexOf(CONFIG.COLUMNS.INVOICES.DUE_DATE)]
            };
            logEvent("Fetch Invoice", invoiceNumber, "Info", `Invoice data found: ${JSON.stringify(invoiceData)}`);
            return invoiceData;
        }
    }
    logEvent("Fetch Invoice", invoiceNumber, "Error", `Invoice not found: ${invoiceNumber}`);
    return null;
}

/**
 * Marks an invoice as 'Pushed' after successfully syncing with QBO.
 * @param {string} invoiceNumber - The internal invoice number to mark as synced.
 */
function markInvoiceAsSynced(invoiceNumber) {
    updateInvoice(invoiceNumber, { 'Push to QBO': "Pushed" });
    updateInvoiceMetadata(invoiceNumber); // Ensure metadata is updated
    logEvent("Invoice Synced", invoiceNumber, "Success", "Invoice marked as synced.");
}


/**
 * Retrieves invoices marked as 'Pending' for QBO submission.
 * @returns {Array} - List of pending invoices.
 */
function getUnsentInvoices() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.INVOICES);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const statusIndex = headers.indexOf(CONFIG.COLUMNS.INVOICES.STATUS);

    let pendingInvoices = [];
    for (let i = 1; i < data.length; i++) {
        if (data[i][statusIndex] === "Pending") {
            pendingInvoices.push(data[i][headers.indexOf(CONFIG.COLUMNS.INVOICES.INVOICE_NUMBER)]);
        }
    }
    return pendingInvoices;
}


/**
 * Retrieves line items associated with a given invoice number.
 * @param {string} invoiceNumber - The invoice number.
 * @returns {Array} - List of line items associated with the invoice.
 */
function fetchInvoiceLineItems(invoiceNumber) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.LINE_ITEMS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const lineItems = [];

    for (let i = 1; i < data.length; i++) {
        if (data[i][headers.indexOf(CONFIG.COLUMNS.LINE_ITEMS.INVOICE_NUMBER)] === invoiceNumber) {
            lineItems.push({
                itemName: data[i][headers.indexOf(CONFIG.COLUMNS.LINE_ITEMS.ITEM_NAME)],
                date: data[i][headers.indexOf(CONFIG.COLUMNS.LINE_ITEMS.DATE)],
                serviceId: data[i][headers.indexOf(CONFIG.COLUMNS.LINE_ITEMS.SERVICE_ID)],
                quantity: data[i][headers.indexOf(CONFIG.COLUMNS.LINE_ITEMS.QUANTITY)],
                unitPrice: data[i][headers.indexOf(CONFIG.COLUMNS.LINE_ITEMS.UNIT_PRICE)],
                amount: data[i][headers.indexOf(CONFIG.COLUMNS.LINE_ITEMS.AMOUNT)],
                description: data[i][headers.indexOf(CONFIG.COLUMNS.LINE_ITEMS.DETAIL)]
            });
        }
    }

    if (lineItems.length === 0) {
        logEvent("Fetch Line Items", invoiceNumber, "Error", `No line items found for invoice: ${invoiceNumber}`);
    } else {
        logEvent("Fetch Line Items", invoiceNumber, "Info", `Line items found: ${JSON.stringify(lineItems)}`);
    }

    // Sort line items by date
    lineItems.sort((a, b) => new Date(a.date) - new Date(b.date));

    return lineItems;
}

/**
 * Updates metadata for an invoice.
 * @param {string} invoiceNumber - The invoice number to update metadata for.
 */
function updateInvoiceMetadata(invoiceNumber) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.INVOICES);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
        if (data[i][headers.indexOf(CONFIG.COLUMNS.INVOICES.INVOICE_NUMBER)] === invoiceNumber) {
            data[i][headers.indexOf(CONFIG.COLUMNS.INVOICES.LAST_UPDATED)] = new Date().toISOString();
            sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
            logEvent("Invoice Metadata Updated", invoiceNumber, "Success", "Metadata updated in sheet.");
            return;
        }
    }
    logEvent("Invoice Metadata Update Failed", invoiceNumber, "Error", "Invoice not found.");
}

/**
 * Retrieves QBO Customer ID and client billing details (To, CC, BCC) from Clients Sheet.
 * @param {string} clientId - The client ID.
 * @returns {object|null} - The client data or null if not found.
 */
function fetchClientData(clientId) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.CLIENTS);
    if (!sheet) {
        logEvent("Fetch Client Data", clientId, "Error", "Clients sheet not found.");
        return null;
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const clientIdIndex = headers.indexOf(CONFIG.COLUMNS.CLIENTS.CLIENT_ID);
    const qboIdIndex = headers.indexOf(CONFIG.COLUMNS.CLIENTS.QBO_ID);
    const payablesEmailIndex = headers.indexOf(CONFIG.COLUMNS.CLIENTS.PAYABLES_EMAIL);
    const payablesEmailCcIndex = headers.indexOf(CONFIG.COLUMNS.CLIENTS.PAYABLES_EMAIL_CC);
    const payablesEmailBccIndex = headers.indexOf(CONFIG.COLUMNS.CLIENTS.PAYABLES_EMAIL_BCC);

    for (let i = 1; i < data.length; i++) {
        if (data[i][clientIdIndex] === clientId) {
            const clientData = {
                qboId: data[i][qboIdIndex],
                payablesEmail: data[i][payablesEmailIndex],
                payablesEmailCc: data[i][payablesEmailCcIndex],
                payablesEmailBcc: data[i][payablesEmailBccIndex]
            };
            logEvent("Fetch Client Data", clientId, "Info", `Client data found: ${JSON.stringify(clientData)}`);
            return clientData;
        }
    }
    logEvent("Fetch Client Data", clientId, "Error", "Client not found.");
    return null;
}

