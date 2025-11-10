/** 
 * QuickBooks OAuth2 Authentication & API Calls (Refactored & Simplified)
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
        .setPropertyStore(PropertiesService.getUserProperties()); // Secure token storage
}

/**
 * Initiates the OAuth2 authorization flow for QuickBooks.
 */
function initiateOAuth() {
    const service = getOAuthService();
    if (!service.hasAccess()) {
        Logger.log('🔗 Open this URL to authorize the app: ' + service.getAuthorizationUrl());
    } else {
        Logger.log('✅ Already authorized.');
    }
}

/**
 * Refreshes the QuickBooks access token if expired.
 * @returns {string|null} - The new access token or null if refresh fails.
 */
function refreshAccessToken() {
    const service = getOAuthService();
    if (!service.hasAccess()) {
        Logger.log("🔄 No access. Attempting token refresh...");
        service.refresh();
        if (!service.hasAccess()) {
            Logger.log("❌ Token refresh failed. Run `initiateOAuth()` to reauthorize.");
            return null;
        }
    }
    const accessToken = service.getAccessToken();
    if (accessToken) {
        PropertiesService.getScriptProperties().setProperty("QBO_ACCESS_TOKEN", accessToken);
        Logger.log("✅ Access Token refreshed successfully.");
    }
    return accessToken;
}

/**
 * Makes an authenticated request to QuickBooks API.
 * @param {string} endpoint - The API endpoint (e.g., `/v3/company/realmId/account`).
 * @returns {object|null} - The API response or null if request fails.
 */
function callQBOApi(endpoint) {
    const service = getOAuthService();
    let accessToken = service.getAccessToken() || refreshAccessToken();
    if (!accessToken) {
        Logger.log("❌ Could not retrieve a valid access token.");
        return null;
    }
    const url = CONFIG.QBO_BASE_URL + CONFIG.QBO_REALM_ID + endpoint;
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
        return response.getResponseCode() === 200 ? JSON.parse(response.getContentText()) : null;
    } catch (e) {
        Logger.log("❌ API Request Error: " + e.message);
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
    if (service.handleCallback(request)) {
        const accessToken = service.getAccessToken();
        if (accessToken) {
            PropertiesService.getScriptProperties().setProperty("QBO_ACCESS_TOKEN", accessToken);
            Logger.log("✅ OAuth2 Authorization Successful. Access Token stored.");
        }
        return HtmlService.createHtmlOutput('Success! You can close this tab.');
    } else {
        Logger.log("❌ OAuth2 Authorization Denied.");
        return HtmlService.createHtmlOutput('Authorization Denied.');
    }
}
