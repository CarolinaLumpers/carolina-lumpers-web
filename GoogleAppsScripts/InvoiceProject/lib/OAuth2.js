/** 
 * QuickBooks OAuth2 Authentication & API Calls (Refactored)
 * Uses OAuth2 for Apps Script Library
 */

// Ensure OAuth2 Library is added: 1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF

/**
 * Retrieves the OAuth2 service for QuickBooks.
 * @returns {OAuth2.Service} - The OAuth2 service.
 */
function getOAuthService() {
    return OAuth2.createService('QuickBooks')
        .setAuthorizationBaseUrl(CONFIG.OAUTH_AUTHORIZATION_URL)
        .setTokenUrl(CONFIG.OAUTH_TOKEN_URL)
        .setClientId(CONFIG.QBO_CLIENT_ID)
        .setClientSecret(CONFIG.QBO_CLIENT_SECRET)
        .setScope(CONFIG.OAUTH_SCOPE)
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
 * Makes an authenticated request to QuickBooks API.
 * @param {string} endpoint - The API endpoint (e.g., `/v3/company/realmId/account`).
 * @returns {object} - The API response.
 */
function callQBOApi(endpoint) {
    const service = getOAuthService();
    let accessToken = service.getAccessToken();

    if (!accessToken) {
        accessToken = refreshAccessToken();
        if (!accessToken) {
            Logger.log("Error: Could not retrieve new access token.");
            return null;
        }
    }

    const realmId = CONFIG.QBO_REALM_ID;
    const url = CONFIG.QBO_BASE_URL + realmId + endpoint;
    
    const options = {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + accessToken,
            "Accept": "application/json"
        },
        muteHttpExceptions: true
    };

    try {
        const response = UrlFetchApp.fetch(url, options);
        const contentType = response.getHeaders()['Content-Type'];

        if (contentType && contentType.includes('application/json')) {
            return JSON.parse(response.getContentText());
        } else if (contentType && contentType.includes('application/xml')) {
            const xmlResponse = response.getContentText();
            Logger.log("XML Response: " + xmlResponse);
            return xmlResponse; // Handle XML response as needed
        } else {
            Logger.log("Unexpected response format: " + response.getContentText());
            return null;
        }
    } catch (e) {
        Logger.log("API Request Failed: " + e.message);
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

    Logger.log(`Client ID: ${clientId}`);
    Logger.log(`Client Secret: ${clientSecret}`);
    Logger.log(`Realm ID: ${realmId}`);
    Logger.log(`Access Token: ${accessToken}`);
    Logger.log(`Refresh Token: ${refreshToken}`);
}

// Call this function to log the OAuth configuration
logOAuthConfig();