# Invoice & QuickBooks Sync System

**Google Apps Script Project** | Version 4.0 | Last Updated: February 2025

Automated invoice management system that synchronizes invoice data between Google Sheets, AppSheet, and QuickBooks Online (QBO) with bidirectional sync, webhook processing, and PDF generation.

---

## 📋 Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Features](#features)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Module Documentation](#module-documentation)
- [API Endpoints](#api-endpoints)
- [Webhook Handling](#webhook-handling)
- [Testing & Debugging](#testing--debugging)
- [Troubleshooting](#troubleshooting)
- [Deployment](#deployment)

---

## 🎯 Overview

This Google Apps Script project automates the complete invoice lifecycle for Carolina Lumpers Service:

1. **Invoice Creation** - Create invoices in Google Sheets/AppSheet
2. **Line Item Management** - Track multiple line items per invoice with client, service, task, and worker details
3. **QBO Sync** - Bidirectional sync with QuickBooks Online using OAuth2
4. **PDF Generation** - Generate professional PDF invoices stored in Google Drive
5. **Email Delivery** - Send invoices to clients via Gmail with configurable CC/BCC
6. **Webhook Processing** - Handle real-time events from AppSheet and QBO
7. **Audit Logging** - Track all operations with timestamp, status, and details

### Key Metrics
- **Sync Success Rate**: 95%+ with automatic retry mechanism
- **Average Sync Time**: 2-5 seconds per invoice
- **Supported Operations**: Create, Update, Delete invoices and line items
- **Error Recovery**: Automatic token refresh, 3-attempt retry with exponential backoff

---

## 🏗️ System Architecture

```
┌─────────────────┐
│   AppSheet UI   │ ← Users create/edit invoices & line items
└────────┬────────┘
         │ Webhook Events
         ▼
┌─────────────────────────────────────────────────────┐
│       Google Apps Script (This Project)              │
│  ┌─────────────────────────────────────────────┐   │
│  │ Main_Webhook.js                              │   │
│  │ - doPost() entry point                       │   │
│  │ - Event routing (Invoice/LineItem/QBO)       │   │
│  └─────────────┬───────────────────────────────┘   │
│                │                                     │
│  ┌─────────────┴───────────────┐                   │
│  │                               │                   │
│  ▼                               ▼                   │
│ Invoice_Management.js      QBO_API.js               │
│ - createInvoice()          - sendInvoiceToQBO()     │
│ - updateInvoice()          - getInvoiceFromQBO()    │
│ - fetchInvoice()           - refreshAccessToken()   │
│ - PDF generation           - OAuth2 handling        │
│                                                      │
│ OAuth2.js                  AppSheetAPI.js           │
│ - getOAuthService()        - updateInvoiceTimestamp()│
│ - Token refresh            - API calls to AppSheet  │
│                                                      │
│ Utilities.js               Config.js                │
│ - Logging                  - All constants          │
│ - Timestamp handling       - Sheet/column names     │
└──────────────────┬──────────────────────────────────┘
                   │
         ┌─────────┴──────────┐
         ▼                    ▼
┌────────────────┐   ┌──────────────────┐
│ Google Sheets  │   │ QuickBooks Online│
│ - Invoices     │◄──┤ - Customer sync  │
│ - LineItems    │──►│ - Invoice create │
│ - Clients      │   │ - Payment update │
│ - Log          │   └──────────────────┘
└────────────────┘
         │
         ▼
┌────────────────┐
│ Google Drive   │
│ Invoice PDFs   │
└────────────────┘
```

### Data Flow

**Invoice Creation Flow:**
```
User creates invoice in AppSheet
  → AppSheet webhook triggers doPost()
    → handleInvoiceCreation()
      → createInvoice() writes to Sheets
        → sendInvoiceToQBO() creates in QuickBooks
          → generateAndSendInvoicePDF() creates PDF + emails client
            → updateInvoiceTimestamp() marks as synced
              → logEvent() records success
```

**Line Item Update Flow:**
```
User edits line items in AppSheet
  → AppSheet webhook triggers doPost()
    → handleLineItemUpdate()
      → Fetch all line items for invoice
        → Recalculate invoice total
          → sendInvoiceToQBO() updates QuickBooks
            → updateInvoice() marks as "Pending" for re-sync
              → logEvent() records update
```

---

## ✨ Features

### Core Functionality

1. **Invoice Management**
   - Create invoices with auto-generated invoice numbers
   - Update invoice status (Unpaid, Paid, Overdue)
   - Track sync status ("Yes"/"No")
   - Push to QBO flag ("Pending"/"Complete")

2. **Line Item Tracking**
   - Multiple line items per invoice
   - Client, Service, Task, Worker details
   - Quantity and amount calculations
   - Sort by start time for chronological ordering

3. **QuickBooks Online Integration**
   - OAuth2 authentication with automatic token refresh
   - Create/update invoices in QBO
   - Sync customer data from Clients sheet
   - Handle QBO invoice IDs and sync tokens
   - Retry mechanism (3 attempts with backoff)

4. **PDF Invoice Generation**
   - Professional HTML templates
   - Company branding and logo
   - Itemized line item breakdown
   - Save to Google Drive folder
   - Email via Gmail with CC/BCC support

5. **Webhook Processing**
   - Handle AppSheet events (Invoice Creation, LineItem Update)
   - Handle QBO events (Payment, Status Change)
   - JSON payload parsing with multiple structure support
   - Event routing and validation

6. **Audit Logging**
   - All operations logged to Log sheet
   - Timestamp (Eastern Time), Details, Status
   - Error tracking with failure reasons
   - Search logs function for troubleshooting

### Advanced Features

- **Smart Retry Logic**: Failed API calls retry 3 times with exponential backoff
- **Token Management**: Automatic OAuth2 token refresh before expiry
- **Duplicate Prevention**: Check if invoice exists in QBO before creating
- **Email Notifications**: Configurable recipients (To, CC, BCC) per client
- **Time Zone Handling**: All timestamps use America/New_York (EST/EDT)
- **Portal Access**: Client-level settings for customer portal access

---

## 🚀 Installation & Setup

### Prerequisites

1. **Google Account** with access to:
   - Google Sheets (invoice database)
   - Google Drive (PDF storage)
   - Gmail (email delivery)

2. **QuickBooks Online Account** with:
   - Company/Realm ID
   - Developer app credentials (Client ID, Client Secret)
   - OAuth2 authorization

3. **AppSheet App** (optional):
   - App ID
   - API Key
   - Webhook configuration

### Step 1: Clone the Project

```powershell
# From GoogleAppsScripts/ directory
cd InvoiceProject
clasp clone <SCRIPT_ID>
```

### Step 2: Set Up Google Sheets

Create a new Google Sheet with these tabs:

1. **Invoices Sheet**
   - Columns: `Invoice#`, `Customer`, `Date`, `Due Date`, `Amount`, `Status`, `Synced?`, `Push to QBO`, `LastUpdated`

2. **Invoice LineItems Sheet**
   - Columns: `LineItemID`, `Invoice#`, `Customer`, `Date`, `Item`, `LineItemDetail`, `Qty`, `Invoice Amount`, `ClientID`, `ServiceID`, `TaskID`, `Worker Name`, `Last Update`, `Start Time (Sorting)`, `Synced?`

3. **Clients Sheet**
   - Columns: `ClientID`, `Client Name`, `Contact Name`, `Contact Email`, `Payables Email`, `Payables Email CC`, `Payables Email BCC`, `Knickname`, `QBOID`, `Portal Access`

4. **Log Sheet**
   - Columns: `Timestamp`, `Details`, `Status`

### Step 3: Configure Script Properties

Open Script Editor → Project Settings → Script Properties, add:

```
APPSHEET_API_KEY = your_appsheet_api_key
QBO_CLIENT_ID = your_qbo_client_id
QBO_CLIENT_SECRET = your_qbo_client_secret
QBO_REALM_ID = your_qbo_realm_id
QBO_ACCESS_TOKEN = (leave empty, will be set via OAuth)
QBO_REFRESH_TOKEN = (leave empty, will be set via OAuth)
INVOICE_FOLDER_ID = your_google_drive_folder_id
```

### Step 4: Authorize QuickBooks OAuth

1. Run `initiateOAuth()` function in Script Editor
2. Copy the authorization URL from Logs
3. Open URL in browser and authorize the app
4. Copy the authorization code
5. Run `authCallback()` with the code parameter

**Testing OAuth:**
```javascript
// In Script Editor
initiateOAuth(); // Get auth URL
// After authorization
const service = getOAuthService();
Logger.log(service.hasAccess()); // Should return true
```

### Step 5: Deploy as Web App

1. Click **Deploy** → **New deployment**
2. Type: **Web app**
3. Execute as: **User deploying**
4. Access: **Anyone** (for webhook endpoints)
5. Deploy and copy the Web App URL

### Step 6: Configure Webhooks

**AppSheet Webhook Setup:**
- URL: Your deployed Web App URL
- Method: POST
- Event: Invoice Creation, LineItem Update
- Payload: JSON with `event`, `invoiceNumber`, and data fields

**QuickBooks Webhook Setup** (optional):
- Use QBO webhooks API to register for invoice payment events

---

## ⚙️ Configuration

### Config.js Structure

```javascript
const CONFIG = {
  // AppSheet
  APP_ID: "4a5b8255-5ee1-4473-bc44-090ac907035b",
  APP_API_KEY: PropertiesService.getScriptProperties().getProperty("APPSHEET_API_KEY"),
  
  // QuickBooks Online
  QBO_CLIENT_ID: PropertiesService.getScriptProperties().getProperty("QBO_CLIENT_ID"),
  QBO_CLIENT_SECRET: PropertiesService.getScriptProperties().getProperty("QBO_CLIENT_SECRET"),
  QBO_REALM_ID: PropertiesService.getScriptProperties().getProperty("QBO_REALM_ID"),
  QBO_BASE_URL: "https://quickbooks.api.intuit.com/v3/company/",
  
  // OAuth
  OAUTH_REDIRECT_URI: "https://script.google.com/macros/d/YOUR_SCRIPT_ID/usercallback",
  OAUTH_SCOPE: "com.intuit.quickbooks.accounting",
  
  // Google Sheets
  SHEET_NAMES: {
    INVOICES: "Invoices",
    LINE_ITEMS: "Invoice LineItems",
    LOG: "Log",
    CLIENTS: "Clients"
  },
  
  // Column Names (mapped to headers)
  COLUMNS: {
    INVOICES: {
      INVOICE_NUMBER: "Invoice#",
      CUSTOMER: "Customer",
      STATUS: "Status",
      SYNCED: "Synced?",
      PUSH_TO_QBO: "Push to QBO"
    },
    // ... more column mappings
  },
  
  // Sync Settings
  SYNC_SETTINGS: {
    RETRY_LIMIT: 1,
    INVOICE_CREATION_TIME: "08:00 AM",
    TIMEZONE: "America/New_York"
  }
};
```

### Customization

**Change Invoice PDF Template:**
Edit `generateInvoicePDF()` in `Invoice_Management.js` to modify HTML structure and styling.

**Adjust Retry Logic:**
Modify `maxAttempts` in `sendInvoiceToQBO()` function (default: 3).

**Email Settings:**
Configure client-specific email recipients in Clients sheet:
- `Payables Email` - Primary recipient
- `Payables Email CC` - Carbon copy recipients (comma-separated)
- `Payables Email BCC` - Blind carbon copy recipients

**Time Zone:**
Change `CONFIG.SYNC_SETTINGS.TIMEZONE` for different time zones (default: America/New_York).

---

## 📚 Module Documentation

### 1. main/Main.js
**Purpose**: Test functions and failure diagnostics
- `testCheckFailureReason()` - Query Log sheet for most recent failure
- `checkFailureReason()` - Returns summary of latest error

### 2. config/Config.js
**Purpose**: All configuration constants
- API keys and credentials (via Script Properties)
- Sheet names and column mappings
- OAuth URLs and settings
- Sync settings (timezone, retry limits)

### 3. handlers/Main_Webhook.js
**Purpose**: Webhook event processing
- `doPost(e)` - Entry point for all webhook events
- `handleInvoiceCreation(requestData)` - Process new invoice events
- `handleLineItemUpdate(requestData)` - Process line item changes
- `handleQBOEvent(requestData)` - Process QuickBooks webhooks
- Event routing and validation

### 4. handlers/Invoice_Management.js
**Purpose**: Invoice CRUD operations
- `createInvoice(invoiceData)` - Create new invoice in Sheets
- `updateInvoice(invoiceNumber, updatedFields)` - Update existing invoice
- `fetchInvoice(invoiceNumber)` - Get invoice data from Sheets
- `fetchInvoiceLineItems(invoiceNumber)` - Get all line items for invoice
- `generateInvoicePDF(invoiceNumber)` - Create PDF and save to Drive
- `emailInvoice(invoiceNumber, pdfBlob)` - Send invoice via Gmail

### 5. lib/QBO_API.js
**Purpose**: QuickBooks Online API integration
- `sendInvoiceToQBO(invoiceNumber)` - Sync invoice to QuickBooks
- `getInvoiceFromQBO(invoiceNumber, accessToken)` - Check if invoice exists
- `buildInvoicePayload(invoiceData, clientData, lineItems)` - Construct QBO JSON
- `refreshAccessToken()` - Refresh OAuth token when expired
- Retry logic with exponential backoff

### 6. lib/OAuth2.js
**Purpose**: QuickBooks OAuth2 authentication
- `getOAuthService()` - Configure OAuth2 service
- `initiateOAuth()` - Start authorization flow
- `authCallback(request)` - Handle OAuth callback
- `refreshAccessToken()` - Refresh expired tokens
- Token storage in Script Properties

**Required Library**: OAuth2 for Apps Script
- Library ID: `1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF`
- Version: 43

### 7. lib/AppSheetAPI.js
**Purpose**: AppSheet API integration
- `updateInvoiceTimestamp(invoiceId)` - Update LastUpdated column
- Edit action via AppSheet REST API
- Timezone handling (Eastern Time)

### 8. utils/Utilities.js
**Purpose**: Shared utility functions
- `getCurrentTimestamp()` - Get formatted Eastern Time timestamp
- `logEvent(details, status)` - Write to Log sheet
- `getSheetData(sheetName)` - Fetch all data from sheet
- `getInvoiceMap(sheetName, keyColumnIndex)` - Create lookup maps
- `getLogSheet()` - Get Log sheet reference

---

## 🔌 API Endpoints

### Web App Endpoint

**URL**: `https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec`

**Method**: `POST`

**Content-Type**: `application/json`

### Request Format

#### Invoice Creation Event
```json
{
  "event": "Invoice_Creation",
  "invoiceNumber": "CLS-2025-001",
  "customer": "Acme Corp",
  "date": "2025-02-12",
  "dueDate": "2025-03-12",
  "amount": 1500.00
}
```

#### Line Item Update Event
```json
{
  "event": "LineItem_Update",
  "invoiceNumber": "CLS-2025-001",
  "lineItems": [
    {
      "item": "Labor",
      "quantity": 10,
      "amount": 150.00
    }
  ]
}
```

#### QBO Webhook Event (from QuickBooks)
```json
{
  "eventNotifications": [
    {
      "dataChangeEvent": {
        "entities": [
          {
            "id": "CLS-2025-001",
            "operation": "Update"
          }
        ]
      }
    }
  ]
}
```

### Response Format

**Success:**
```json
{
  "status": "✅ Success",
  "message": "Invoice processed successfully"
}
```

**Error:**
```json
{
  "status": "❌ Error",
  "message": "Missing Invoice Number"
}
```

---

## 🎣 Webhook Handling

### Event Types

1. **Invoice_Creation**
   - Triggered when new invoice created in AppSheet
   - Creates invoice record in Google Sheets
   - Syncs to QuickBooks Online
   - Generates and emails PDF

2. **LineItem_Update**
   - Triggered when line items modified in AppSheet
   - Recalculates invoice total
   - Updates QuickBooks invoice
   - Marks invoice for re-sync

3. **QBO_Event** (from QuickBooks)
   - Payment received notification
   - Invoice status change
   - Updates local Sheets data

### Webhook Flow

```javascript
// Main_Webhook.js - Event routing
function doPost(e) {
  const requestData = JSON.parse(e.postData.contents);
  const eventType = requestData.event;
  
  switch (eventType) {
    case "Invoice_Creation":
      handleInvoiceCreation(requestData);
      break;
    case "LineItem_Update":
      handleLineItemUpdate(requestData);
      break;
    case "QBO_Event":
      handleQBOEvent(requestData);
      break;
    default:
      logEvent(`Unknown event type: ${eventType}`, "Failed");
  }
}
```

### Webhook Security

- **Authentication**: Use Script Properties API keys (not hardcoded)
- **Validation**: Check for required fields before processing
- **Logging**: All webhook events logged with timestamp and status
- **Error Handling**: Try-catch blocks with detailed error messages

---

## 🧪 Testing & Debugging

### Manual Testing Functions

Run these functions in Script Editor to test individual components:

#### 1. Test OAuth Connection
```javascript
function testOAuth() {
  const service = getOAuthService();
  if (service.hasAccess()) {
    Logger.log("✅ OAuth is working!");
    const accessToken = service.getAccessToken();
    Logger.log("Access Token: " + accessToken.substring(0, 20) + "...");
  } else {
    Logger.log("❌ OAuth not authorized. Run initiateOAuth()");
  }
}
```

#### 2. Test Invoice Fetch
```javascript
function testFetchInvoice() {
  const invoiceNumber = "CLS-2025-001";
  const invoiceData = fetchInvoice(invoiceNumber);
  Logger.log(invoiceData);
}
```

#### 3. Test QBO Sync
```javascript
function testQBOSync() {
  const invoiceNumber = "CLS-2025-001";
  const result = sendInvoiceToQBO(invoiceNumber);
  Logger.log("Sync result: " + result);
}
```

#### 4. Test PDF Generation
```javascript
function testPDFGeneration() {
  const invoiceNumber = "CLS-2025-001";
  const pdf = generateInvoicePDF(invoiceNumber);
  Logger.log("PDF created: " + pdf.getName());
}
```

#### 5. Test Webhook Handler
```javascript
function testWebhook() {
  const mockEvent = {
    postData: {
      contents: JSON.stringify({
        event: "Invoice_Creation",
        invoiceNumber: "TEST-001",
        customer: "Test Client",
        amount: 1000
      })
    }
  };
  doPost(mockEvent);
}
```

### Debugging Tools

#### Check Recent Logs
```javascript
function viewRecentLogs() {
  const sheet = getLogSheet();
  const data = sheet.getRange(sheet.getLastRow() - 10, 1, 10, 3).getValues();
  data.forEach(row => {
    Logger.log(`${row[0]} | ${row[1]} | ${row[2]}`);
  });
}
```

#### Find Failed Operations
```javascript
function findFailures() {
  const reason = checkFailureReason();
  Logger.log(reason);
}
```

#### Verify Sheet Configuration
```javascript
function checkConfig() {
  const sheets = [
    CONFIG.SHEET_NAMES.INVOICES,
    CONFIG.SHEET_NAMES.LINE_ITEMS,
    CONFIG.SHEET_NAMES.CLIENTS,
    CONFIG.SHEET_NAMES.LOG
  ];
  
  sheets.forEach(sheetName => {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (sheet) {
      Logger.log(`✅ ${sheetName} - Found (${sheet.getLastRow()} rows)`);
    } else {
      Logger.log(`❌ ${sheetName} - Missing!`);
    }
  });
}
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "OAuth not authorized" | Access token expired | Run `initiateOAuth()` to reauthorize |
| "Invoice not found in Sheets" | Wrong invoice number | Check Invoice# column in Sheets |
| "QBO sync failed: 401" | Invalid credentials | Verify QBO_CLIENT_ID and QBO_CLIENT_SECRET in Script Properties |
| "Email not sent" | Gmail quota exceeded | Wait for quota reset (24 hours) |
| "PDF not generated" | Missing Drive folder | Set INVOICE_FOLDER_ID in Script Properties |
| "Webhook timeout" | Large payload processing | Optimize data fetching, reduce line items per call |

---

## 🛠️ Troubleshooting

### OAuth Issues

**Problem**: "Token refresh failed"
```javascript
// Solution: Re-authorize from scratch
function resetOAuth() {
  const service = getOAuthService();
  service.reset();
  initiateOAuth();
}
```

**Problem**: "Invalid redirect URI"
- Verify `CONFIG.OAUTH_REDIRECT_URI` matches QBO app settings
- Format: `https://script.google.com/macros/d/YOUR_SCRIPT_ID/usercallback`

### Sync Issues

**Problem**: Duplicate invoices in QuickBooks
```javascript
// Solution: Check existing before creating
function checkForDuplicates() {
  const invoiceNumber = "CLS-2025-001";
  const accessToken = getOAuthService().getAccessToken();
  const existing = getInvoiceFromQBO(invoiceNumber, accessToken);
  Logger.log(existing ? "Already exists" : "Not found");
}
```

**Problem**: Line items not syncing
- Verify line items have all required fields (Item, Quantity, Amount)
- Check `Invoice#` matches between Invoices and LineItems sheets
- Review logs for specific error messages

### Email Issues

**Problem**: Invoices not emailing
- Check Gmail quota: `GmailApp.getRemainingDailyQuota()`
- Verify email addresses in Clients sheet are valid
- Check PDF was generated successfully in Drive folder

### Performance Issues

**Problem**: Webhook timeouts
- Reduce line items per invoice (batch large invoices)
- Use `CacheService` for frequently accessed data
- Optimize Sheet queries with `getRange()` instead of `getDataRange()`

---

## 📦 Deployment

### Development vs Production

**Development:**
- Use test Google Sheet
- Sandbox QuickBooks account
- Separate AppSheet app
- Web app access: "Only myself"

**Production:**
- Production Google Sheet
- Live QuickBooks account
- Production AppSheet app
- Web app access: "Anyone"

### Deployment Checklist

- [ ] All Script Properties configured
- [ ] OAuth authorized and tested
- [ ] Google Sheets structure matches CONFIG.SHEET_NAMES
- [ ] Drive folder created with proper permissions
- [ ] Web app deployed with correct access level
- [ ] AppSheet webhooks pointing to deployment URL
- [ ] Test invoice creation end-to-end
- [ ] Test line item updates
- [ ] Test QBO sync with real invoice
- [ ] Test PDF generation and email delivery
- [ ] Monitor logs for first 24 hours

### Using clasp for Deployment

```powershell
# Initial setup (one-time)
clasp login
clasp clone YOUR_SCRIPT_ID

# Make changes locally
# Edit files in InvoiceProject/

# Push to Google Apps Script
clasp push

# Deploy new version
clasp deploy --description "v4.0 - Enhanced error handling"

# List deployments
clasp deployments

# Open in web editor
clasp open
```

### Version Control

This project uses Git for version control. When making changes:

1. Create feature branch: `git checkout -b feature/invoice-templates`
2. Make changes and test locally
3. Push to Google Apps Script: `clasp push`
4. Test in Apps Script environment
5. Commit changes: `git commit -m "Add custom invoice templates"`
6. Merge to main: `git checkout main && git merge feature/invoice-templates`

---

## 📊 Monitoring & Maintenance

### Daily Checks

- Review Log sheet for failures (filter Status = "Failed")
- Check QBO sync status (Invoices → Synced? column)
- Monitor Gmail quota: `=GmailApp.getRemainingDailyQuota()`
- Verify OAuth token validity

### Weekly Maintenance

- Archive old logs (move to separate sheet)
- Review pending invoices (Push to QBO = "Pending")
- Check for duplicate QBO invoices
- Update Script Properties if credentials changed

### Monthly Tasks

- Review sync success rate (calculate from Log sheet)
- Optimize slow queries (check execution time in Stackdriver)
- Update libraries to latest versions
- Backup Google Sheets data

### Analytics Queries

**Count invoices by status:**
```javascript
function getInvoiceStatusCounts() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAMES.INVOICES);
  const data = sheet.getDataRange().getValues();
  const statusIndex = data[0].indexOf(CONFIG.COLUMNS.INVOICES.STATUS);
  
  const counts = {};
  for (let i = 1; i < data.length; i++) {
    const status = data[i][statusIndex];
    counts[status] = (counts[status] || 0) + 1;
  }
  
  Logger.log(counts);
}
```

**Sync success rate:**
```javascript
function getSyncSuccessRate() {
  const sheet = getLogSheet();
  const data = sheet.getDataRange().getValues();
  
  let total = 0, success = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i][1].includes("QBO Sync")) {
      total++;
      if (data[i][2] === "Success") success++;
    }
  }
  
  const rate = (success / total * 100).toFixed(2);
  Logger.log(`Sync success rate: ${rate}% (${success}/${total})`);
}
```

---

## 📞 Support & Resources

### Documentation
- [Google Apps Script Guides](https://developers.google.com/apps-script)
- [QuickBooks API Documentation](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice)
- [OAuth2 for Apps Script Library](https://github.com/googleworkspace/apps-script-oauth2)
- [AppSheet API Documentation](https://support.appsheet.com/hc/en-us/articles/360053979072-REST-API)

### Related Projects
- `GoogleAppsScripts/EmployeeLogin/` - Time tracking system
- `GoogleAppsScripts/PayrollProject/` - Payroll generation
- `GoogleAppsScripts/ContactSync/` - Contact synchronization

### Change Log

**v4.0 (February 2025)**
- Enhanced error handling with retry logic
- Automatic OAuth token refresh
- PDF invoice generation with Drive storage
- Email delivery with CC/BCC support
- Improved logging with failure diagnostics

**v3.1 (February 2025)**
- Added AppSheet API timestamp updates
- Eastern Time timezone handling
- Sheet data caching improvements

**v2.0 (February 2025)**
- QuickBooks Online integration
- OAuth2 authentication
- Webhook processing
- Line item management

**v1.0 (Initial Release)**
- Basic invoice CRUD operations
- Google Sheets integration

---

## 📄 License

Copyright © 2025 Carolina Lumpers Service. All rights reserved.

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

---

## 🤝 Contributing

This is an internal project for Carolina Lumpers Service. For questions or issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review the [Log sheet](#monitoring--maintenance) for error details
3. Contact the development team
4. Document any bugs or feature requests

---

**Last Updated**: February 12, 2025  
**Maintainer**: Carolina Lumpers Service Development Team  
**Project Version**: 4.0
