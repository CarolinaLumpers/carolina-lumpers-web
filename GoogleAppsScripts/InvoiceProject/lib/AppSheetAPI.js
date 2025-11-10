/**
 * Updates the 'LastUpdated' column in the Invoices table via the AppSheet API.
 * @param {string} invoiceId - The Invoice# that needs updating.
 */
function updateInvoiceTimestamp(invoiceId) {
    Logger.log(`Updating timestamp for invoice: ${invoiceId}`);
    var apiKey = PropertiesService.getScriptProperties().getProperty("APP_API_KEY"); // Retrieve API key dynamically
    var appId = CONFIG.APP_ID;  
    var baseUrl = CONFIG.APPSHEET_BASE_URL;

    if (!apiKey) {
        Logger.log("❌ ERROR: AppSheet API Key is missing. Set 'APP_API_KEY' in Script Properties.");
        return;
    }
    if (!invoiceId) {
        Logger.log("❌ ERROR: Missing Invoice ID.");
        return;
    }

    // Convert current time to Eastern Time (ET)
    var timestamp = getCurrentTimestamp();

    var payload = {
        "Action": "Edit",
        "Properties": {
            "Locale": "en-US",
            "Timezone": "Eastern Standard Time"
        },
        "Rows": [
            {
                "Invoice#": invoiceId,
                "LastUpdated": timestamp
            }
        ]
    };

    var options = {
        method: "POST",
        contentType: "application/json",
        headers: {
            "ApplicationAccessKey": apiKey
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
    };

    var url = `${baseUrl}${appId}/tables/Invoices/Action`;

    try {
        Logger.log("URL: " + url);
        Logger.log("Headers: " + JSON.stringify(options.headers));
        var response = UrlFetchApp.fetch(url, options);
        var responseText = response.getContentText();
        Logger.log("Payload sent to AppSheet: " + JSON.stringify(payload));
        Logger.log("Response from AppSheet: " + responseText);

        if (response.getResponseCode() === 200) {
            Logger.log("✅ Successfully updated LastUpdated for Invoice#: " + invoiceId);
        } else {
            Logger.log("❌ AppSheet API Error: " + responseText);
        }
    } catch (e) {
        Logger.log("❌ Error updating AppSheet: " + e.message);
    }
}

function testUpdateInvoiceTimestamp() {
    var testInvoiceId = "TWG-250216";
    updateInvoiceTimestamp(testInvoiceId);
}