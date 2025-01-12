# **Module 1: Authentication (OAuth 2.0)**

---

### **Objective**
Establish a secure and reliable connection between Google Apps Script and QuickBooks Online using OAuth 2.0, ensuring that all interactions are authorized and encrypted.

---

### **Overview of Process**
1. The application requests permission to access QuickBooks data by redirecting users to a secure login page.
2. Upon successful login and authorization, QuickBooks generates an access token.
3. The access token is securely stored and reused for subsequent API requests until it expires, minimizing the need for repeated logins.

---

### **Action Items**

#### **1. Register the Application in QuickBooks Developer Portal**
- **Action**: Ensure the app is registered in the QuickBooks Developer Portal with accurate details.
- **Expectation**:
  - Obtain the **Client ID** and **Client Secret**.
  - Configure the Redirect URI to link QuickBooks’ authentication system with the Apps Script Web App.

#### **2. Add OAuth2 Library to Apps Script**
- **Action**: Integrate the OAuth2 library to handle the authentication flow.
- **Expectation**:
  - The library is added using the script ID: `1B8cMs8loXoHP4d4UeoL9bAp7zFks5f6OnBQ3PZvjrfFAIZcSmfJuG4ZD`.
  - Apps Script includes the required setup for OAuth2 service.

#### **3. Configure OAuth2 Service in Apps Script**
- **Action**: Write a function to define and configure the OAuth2 service.
- **Expectation**:
  - The service is configured with the following:
    - Authorization Base URL: `https://appcenter.intuit.com/connect/oauth2`
    - Token URL: `https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer`
    - Scope: `com.intuit.quickbooks.accounting`
    - Client ID and Client Secret.
  - Proper error handling for token retrieval and storage.

#### **4. Implement Authorization Flow**
- **Action**: Create a script that generates the authorization link for users to log in.
- **Expectation**:
  - A function (`doGet`) generates a secure authorization URL.
  - Redirects users to QuickBooks login for granting permissions.

#### **5. Handle Callback from QuickBooks**
- **Action**: Develop a callback function to process the response from QuickBooks after authorization.
- **Expectation**:
  - The callback function (`authCallback`) securely processes the access token.
  - Stores the token using `PropertiesService` for subsequent API requests.

#### **6. Test Authentication Process**
- **Action**: Deploy the script as a Web App and test the entire authentication flow.
- **Expectation**:
  - Access the Web App URL, click the authorization link, and log in.
  - Successfully complete the flow and verify that the message "Authorization successful!" is displayed.

---

### **Expectations for Module Completion**

1. **Secure Access**:
   - The app securely connects to QuickBooks Online using OAuth 2.0.
   - Access tokens are stored safely and used appropriately for API interactions.

2. **Error Handling**:
   - All potential errors during authentication (e.g., invalid credentials, token expiration) are addressed with meaningful error messages.

3. **Documentation**:
   - Clear logs and documentation are maintained for debugging and auditing purposes.

4. **Functional Web App**:
   - The Web App is functional, allowing users to authorize access and initiate API calls with validated tokens.

---

### **Next Steps After Module 1**
Upon successful completion of Module 1, proceed to **Module 2: Fetching Data from QuickBooks**, which focuses on retrieving and processing customer and product data to support invoice generation.

