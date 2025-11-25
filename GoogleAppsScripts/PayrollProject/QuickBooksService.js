/**
 * QuickBooks OAuth2 Authentication & API Calls (Refactored)
 * Uses OAuth2 for Apps Script Library
 */

// Ensure OAuth2 Library is added: 1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF

/**
 * Helper to log to the Log sheet (shared with PayrollController)
 */
function logToSheet(eventType, payload, status) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.LOG);
    if (sheet) {
      const timestamp = new Date().toISOString();
      sheet.appendRow([timestamp, eventType, JSON.stringify(payload), status]);
    }
  } catch (err) {
    // Silent fail if logging fails
  }
}

/**
 * Retrieves the OAuth2 service for QuickBooks.
 * @returns {OAuth2.Service} - The OAuth2 service.
 */
function getOAuthService() {
    return OAuth2.createService('QuickBooks')
        .setAuthorizationBaseUrl(CONFIG.AUTHORIZATION_URL)
        .setTokenUrl(CONFIG.TOKEN_URL)
        .setClientId(CONFIG.CLIENT_ID)
        .setClientSecret(CONFIG.CLIENT_SECRET)
        .setScope(CONFIG.SCOPE)
        .setCallbackFunction('authCallback')
        .setParam('response_type', 'code')
        .setParam('state', getStateToken('authCallback')) // Securely generated state token
        .setPropertyStore(PropertiesService.getUserProperties()); // Secure token storage
}

/**
 * Initiates the OAuth2 authorization flow for QuickBooks.
 */
function initiateOAuth() {
    const service = getOAuthService();
    if (!service.hasAccess()) {
        const authorizationUrl = service.getAuthorizationUrl();
        Logger.log('Open the following URL to authorize the app: %s', authorizationUrl);
    } else {
        Logger.log('Already authorized.');
    }
}

/**
 * Refreshes the QBO access token if expired.
 */
function refreshAccessToken() {
    const service = getOAuthService();

    if (!service.hasAccess()) {
        Logger.log("No access. Attempting to refresh token...");
        service.refresh();
        
        if (!service.hasAccess()) {
            Logger.log("Token refresh failed. Run `initiateOAuth()` to reauthorize.");
            return null;
        }
    }

    const accessToken = service.getAccessToken();
    PropertiesService.getScriptProperties().setProperty("QBO_ACCESS_TOKEN", accessToken);
    Logger.log("Token refreshed successfully. New Access Token: " + accessToken);
    return accessToken;
}

/**
 * Fetch an existing Bill by DocNumber from QuickBooks Online.
 * @param {string} docNumber - The DocNumber to search for.
 * @returns {object|null} - The existing bill object if found, otherwise null.
 */
function getExistingBill(docNumber) {
    const realmId = CONFIG.REALM_ID;
    const query = encodeURIComponent(`SELECT * FROM Bill WHERE DocNumber = '${docNumber}'`);
    const url = `${CONFIG.QBO_BASE_URL}${realmId}/query?query=${query}`;

    const response = callQBOApi(url, "GET");

    if (response && response.QueryResponse && response.QueryResponse.Bill) {
        return response.QueryResponse.Bill[0]; // Return the first matching bill
    }

    return null; // No existing bill found
}

/**
 * Makes an authenticated request to the QuickBooks API with automatic token refresh.
 * @param {string} endpoint - The API endpoint (e.g., `/bill`).
 * @param {string} method - HTTP method (`GET`, `POST`, `PUT`, etc.). Default is `GET`.
 * @param {object|null} payload - Request payload (for `POST/PUT` requests).
 * @returns {object|null} - The API response as JSON or `null` if the request fails.
 */
function callQBOApi(endpoint, method = "GET", payload = null) {
    let service = getOAuthService();
    let accessToken = service.getAccessToken();

    if (!accessToken) {
        Logger.log("No access token. Attempting to refresh token...");
        accessToken = refreshAccessToken();
    }

    Logger.log("🔍 QBO_REALM_ID: " + CONFIG.REALM_ID);
    Logger.log("🔍 QBO_BASE_URL: " + CONFIG.QBO_BASE_URL);

    // Ensure proper URL formatting
    const url = `${CONFIG.QBO_BASE_URL}${CONFIG.REALM_ID}${endpoint}`;
    Logger.log("🔗 Constructed URL: " + url);

    const options = {
        method: method.toUpperCase(),
        headers: {
            "Authorization": "Bearer " + accessToken,
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        muteHttpExceptions: true
    };

    if (payload) {
        options.payload = JSON.stringify(payload);
    }

    try {
        const response = UrlFetchApp.fetch(url, options);
        const responseCode = response.getResponseCode();
        const responseText = response.getContentText();
        
        // Log detailed response for owner bills
        const isOwnerBill = payload && (payload.DocNumber?.includes('SG-001-844c9f7b') || payload.DocNumber?.includes('DMR-002-5c6334ca'));
        if (isOwnerBill) {
            logToSheet("QBO API Raw Response", {
                docNumber: payload.DocNumber,
                responseCode: responseCode,
                responseText: responseText,
                url: url,
                method: method
            }, `📡 Raw API Response for ${payload.VendorRef?.name}`);
        }
        
        const jsonResponse = JSON.parse(responseText);
        if (responseCode >= 200 && responseCode < 300) {
            return jsonResponse;
        } else {
            const errorMessage = jsonResponse?.Fault?.Error?.[0]?.Message || jsonResponse?.Fault?.Error?.[0]?.Detail || 'Unknown error';
            Logger.log(`❌ API Error (${responseCode}): ${errorMessage}`);
            
            if (isOwnerBill) {
                logToSheet("QBO API Error", {
                    docNumber: payload.DocNumber,
                    responseCode: responseCode,
                    errorMessage: errorMessage,
                    fullFault: jsonResponse?.Fault
                }, `❌ QuickBooks rejected owner bill: ${errorMessage}`);
            }
            
            return null;
        }
    } catch (e) {
        Logger.log(`❌ Exception: ${e.message}`);
        
        // Log exceptions for owner bills
        const isOwnerBill = payload && (payload.DocNumber?.includes('SG-001-844c9f7b') || payload.DocNumber?.includes('DMR-002-5c6334ca'));
        if (isOwnerBill) {
            logToSheet("QBO API Exception", {
                docNumber: payload.DocNumber,
                error: e.message,
                stack: e.stack
            }, `❌ Exception calling QuickBooks API: ${e.message}`);
        }
        
        return null;
    }
}


/**
 * Handles the OAuth2 callback for QuickBooks.
 * @param {object} request - The request object from the OAuth callback.
 * @returns {HtmlOutput} - Success or failure message.
 */
function authCallback(request) {
    const service = getOAuthService();
    const authorized = service.handleCallback(request);

    if (authorized) {
        const accessToken = service.getAccessToken();
        const tokenResponse = service.getToken(); // Get full token response

        // Extract and store the refresh token
        if (tokenResponse && tokenResponse.refresh_token) {
            PropertiesService.getScriptProperties().setProperty("QBO_REFRESH_TOKEN", tokenResponse.refresh_token);
            Logger.log("Refresh Token saved successfully.");
        } else {
            Logger.log("Warning: No refresh token received from QuickBooks.");
        }

        PropertiesService.getScriptProperties().setProperty("QBO_ACCESS_TOKEN", accessToken);
        Logger.log("OAuth2 Authorization Successful!");
        return HtmlService.createHtmlOutput('Success! You can close this tab.');
    } else {
        Logger.log("OAuth2 Authorization Denied.");
        return HtmlService.createHtmlOutput('Authorization Denied.');
    }
}

/**
 * Generates a secure OAuth2 state token.
 * @param {string} callbackFunction - The callback function name.
 * @returns {string} - The generated state token.
 */
function getStateToken(callbackFunction) {
    return ScriptApp.newStateToken()
        .withMethod(callbackFunction)
        .withTimeout(120) // Token expires in 2 hours
        .createToken();
}

/**
 * Resets stored OAuth tokens.
 */
function resetOAuthToken() {
    Logger.log("Resetting OAuth Token...");
    getOAuthService().reset();
}

/**
 * Logs the correct redirect URI for QuickBooks Developer Console.
 */
function logRedirectUri() {
    Logger.log(getOAuthService().getRedirectUri());
}

/**
 * Logs the current OAuth configuration.
 */
function logOAuthConfig() {
    const clientId = PropertiesService.getScriptProperties().getProperty("QBO_CLIENT_ID");
    const clientSecret = PropertiesService.getScriptProperties().getProperty("QBO_CLIENT_SECRET");
    const realmId = PropertiesService.getScriptProperties().getProperty("QBO_REALM_ID");
    const accessToken = PropertiesService.getScriptProperties().getProperty("QBO_ACCESS_TOKEN");
    const refreshToken = PropertiesService.getScriptProperties().getProperty("QBO_REFRESH_TOKEN");
}

// Call this function to log the OAuth configuration
logOAuthConfig();
