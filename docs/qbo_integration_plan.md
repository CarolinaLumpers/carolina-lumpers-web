### **Revised Modular Plan**

#### **Module 1: Authentication (OAuth 2.0)**

**Objective**: Set up secure communication between your Google Apps Script and QuickBooks Online.  
**What Happens**:

- Your app asks QuickBooks for permission to access data.
- After login, QuickBooks sends your app a token to use for making API requests (like fetching data or creating invoices).
- This token will be stored and reused until it expires.

**Steps**:

1. Register your app in the QuickBooks Developer Portal (already done).
2. Add the required Redirect URI (already done).
3. Add OAuth2 library in Apps Script and set up the service to handle:
    - Generating the authorization URL.
    - Redirecting the user back after login.
    - Storing and using the access token.
4. Test the flow by running your Apps Script.

* * *

#### **Module 2: Fetch Data from QuickBooks**

**Objective**: Retrieve data (like customers or products/services) from QuickBooks to ensure the connection works and provide the inputs for invoices.  
**What Happens**:

- You’ll use the token from Module 1 to call QuickBooks API endpoints and fetch data (e.g., customers).
- This data can be stored in Google Sheets or used directly in your script.

**Steps**:

1. Write a script to call QuickBooks API endpoints for:
    - Fetching customer data.
    - Fetching product/service data.
    - Optionally: Fetching existing invoices.
2. Format and log the data for clarity.

* * *

#### **Module 3: Create an Invoice in QuickBooks**

**Objective**: Build a script that creates a single invoice in QuickBooks based on predefined inputs.  
**What Happens**:

- You’ll send data (e.g., customer ID, product/service ID, and amounts) to QuickBooks through its API.
- QuickBooks will create the invoice and return an ID or status.

**Steps**:

1. Prepare the required data (customer and product IDs, amounts, etc.).
2. Call the `Create Invoice` API endpoint with the data.
3. Test the process manually to verify it works.

* * *

#### **Module 4: Automate Weekly Invoice Creation**

**Objective**: Schedule a script to create invoices automatically every week based on predefined rules or data stored in Google Sheets.  
**What Happens**:

- The script will run on a schedule (e.g., every Monday) to fetch data (like time logs or sales data) and generate invoices in QuickBooks.

**Steps**:

1. Set up a Google Sheet to hold:
    - Customer details.
    - Weekly tasks or amounts for invoicing.
2. Write a script to loop through the data and create invoices for each customer.
3. Automate the script to run weekly using Google Apps Script triggers.

* * *

### **Better Detailed Steps for Module 1 (Authentication)**

#### **Step 1.1: What OAuth Does**

1. You tell QuickBooks you want to access your data (via a login page).
2. QuickBooks confirms your app is trusted and asks you to log in.
3. If successful, QuickBooks sends your app a special "access token" that allows it to connect securely.

* * *

#### **Step 1.2: Setting Up the OAuth Library in Apps Script**

We’re using the OAuth2 library to handle authentication for us.

Here’s how to add the library and create the OAuth service:

    javascriptCopy code// Import the OAuth2 libraryfunction getOAuthService() { return OAuth2.createService('QuickBooks') .setAuthorizationBaseUrl('https://appcenter.intuit.com/connect/oauth2') .setTokenUrl('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer') .setClientId('<YOUR_CLIENT_ID>') // Replace with your QuickBooks Client ID .setClientSecret('<YOUR_CLIENT_SECRET>') // Replace with your QuickBooks Client Secret .setCallbackFunction('authCallback') // Handles QuickBooks' response .setPropertyStore(PropertiesService.getUserProperties()) // Stores tokens securely .setScope('com.intuit.quickbooks.accounting') // Permission for accounting tasks .setParam('response_type', 'code'); // Required by QuickBooks}

* * *

#### **Step 1.3: Initiating Authentication**

You’ll create a function to start the authentication process:

    javascriptCopy code// Generate the QuickBooks authorization linkfunction doGet() { const service = getOAuthService(); if (!service.hasAccess()) { const authorizationUrl = service.getAuthorizationUrl(); return HtmlService.createHtmlOutput(`<a href="${authorizationUrl}">Authorize QuickBooks</a>`); } return HtmlService.createHtmlOutput('Authorization successful! You can now make API calls.');}

* * *

#### **Step 1.4: Handling the Callback**

QuickBooks sends the user back to your app after logging in. This function processes the response:

    javascriptCopy code// Handle the response from QuickBooksfunction authCallback(request) { const service = getOAuthService(); const isAuthorized = service.handleCallback(request); if (isAuthorized) { return HtmlService.createHtmlOutput('Authorization successful!'); } else { return HtmlService.createHtmlOutput('Authorization denied.'); }}

* * *

### **Next Steps**

Let’s pause here and focus on **Module 1**. Your immediate goal should be to:

1. Add the OAuth2 code into your Apps Script.
2. Deploy the Web App and run the `doGet` function.
3. Test the flow to confirm you can log in and get the **“Authorization successful!”** message.