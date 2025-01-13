# QuickBooks Integration Details

## 1. **App Credentials (From Intuit Developer Portal)**
These are required for OAuth2 authentication and API calls:
- **Client ID**: A unique identifier for your QuickBooks app.
- **Client Secret**: A secret key to authenticate your app.

**Where to Find:**
- Log in to the [Intuit Developer Portal](https://developer.intuit.com/).
- Go to **Dashboard > Your App > Keys & OAuth**.

---

## 2. **Redirect URI**
The Redirect URI specifies where QuickBooks sends the user after successful authorization.

**What to Use:**
- For testing:  
  ```
  https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/usercallback
  ```
- Match this in both:
  - **Your script’s callback function** (e.g., `authCallback`).
  - The Redirect URI section in the Intuit Developer Portal.

---

## 3. **Scopes**
Scopes define what access your app requires. Some common scopes include:
- **`com.intuit.quickbooks.accounting`**: Access QuickBooks accounting data.
- **`com.intuit.quickbooks.payroll`**: Access payroll data.
- **`openid`**: Access user profile information.

---

## 4. **Realm ID (Company ID)**
The Realm ID identifies the QuickBooks company you’re working with.

**How to Get:**
- After authorization, the Realm ID is included as a query parameter in the callback URL.
  ```
  https://YOUR_REDIRECT_URI?code=AUTH_CODE&realmId=REALM_ID
  ```

---

## 5. **Access and Refresh Tokens**
Tokens are required to interact with the QuickBooks API:
- **Access Token**: A temporary token used for API calls.
- **Refresh Token**: Used to refresh the access token when it expires.

**How to Get:**
- After authorization, tokens are retrieved from the `/oauth2/v1/tokens/bearer` endpoint.

---

## 6. **Base API URL**
All API calls are made to the following base URLs:
- **Sandbox**:  
  ```
  https://sandbox-quickbooks.api.intuit.com/v3/company/{realmId}
  ```
- **Production**:  
  ```
  https://quickbooks.api.intuit.com/v3/company/{realmId}
  ```

---

## 7. **API Endpoints for Your Use Case**
Identify the endpoints you’ll need based on your project requirements:
- **Customers**: `/customer` (GET, POST, PUT, DELETE)
- **Invoices**: `/invoice` (GET, POST, PUT, DELETE)
- **Payroll**: `/payroll` (if enabled for your app)
- **Reports**: `/reports/{reportName}`

**Full Documentation**: [QuickBooks Online API Docs](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/most-commonly-used)

---

## 8. **Sandbox Environment Details**
Use the **sandbox environment** for testing to avoid affecting live data:
- Test company data is automatically created in the sandbox.
- Base URL:  
  ```
  https://sandbox-quickbooks.api.intuit.com/v3/company/{realmId}
  ```

---

## Checklist Before Starting:
1. **App Configuration**:
   - Client ID
   - Client Secret
   - Redirect URI
2. **Set Up Scopes**:
   - Choose appropriate scopes for your app.
3. **Test with Sandbox**:
   - Use sandbox credentials and data.
4. **Log API Requests and Responses**:
   - Debug API interactions during development.

---

Let me know if you’d like help setting up your QuickBooks app or configuring these details in your script! 😊

