# Payroll Processing & PDF Report System

**Google Apps Script Project** | Version 3.0 | Last Updated: October 2025

Automated payroll processing system that syncs worker payroll data between Google Sheets, AppSheet, and QuickBooks Online (QBO) with automated bill creation, PDF report generation, and webhook-driven workflows.

---

## 📋 Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Features](#features)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Module Documentation](#module-documentation)
- [API Endpoints & Webhooks](#api-endpoints--webhooks)
- [Payroll Processing Workflow](#payroll-processing-workflow)
- [PDF Report Generation](#pdf-report-generation)
- [Testing & Debugging](#testing--debugging)
- [Troubleshooting](#troubleshooting)
- [Deployment](#deployment)

---

## 🎯 Overview

This Google Apps Script project automates the complete payroll lifecycle for Carolina Lumpers Service:

1. **Payroll Line Item Tracking** - Track worker hours, rates, and earnings per task
2. **Automated Bill Creation** - Generate QuickBooks Online (QBO) Bills (Accounts Payable) for subcontractor payments
3. **Partner Distribution** - Calculate and add owner profit distributions (1/3 share of weekly net income)
4. **PDF Report Generation** - Create mobile-optimized PDF payroll summaries in English, Spanish, or Portuguese
5. **Email Delivery** - Send PDF reports to workers via Gmail
6. **Webhook Processing** - Handle real-time events from AppSheet for payroll runs and report generation
7. **Audit Logging** - Track all operations with timestamp, status, and context data

### Key Metrics
- **Processing Time**: 5-10 seconds per worker bill
- **Supported Languages**: English, Spanish, Portuguese (auto-detected from worker profile)
- **Weekly Payroll**: Processes all active workers for specified week period
- **QuickBooks Sync**: Creates/updates Bills with line-by-line detail
- **Error Recovery**: Automatic OAuth token refresh, detailed logging

---

## 🏗️ System Architecture

```
┌─────────────────┐
│   AppSheet UI   │ ← Admins trigger "Run Payroll" or "Generate PDF Report"
└────────┬────────┘
         │ Webhook Events
         ▼
┌─────────────────────────────────────────────────────────────┐
│       Google Apps Script (This Project)                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ WebhookHandler.js - doPost()                         │   │
│  │ - Route "Run Payroll" → processPayroll()             │   │
│  │ - Route "Generate PDF Report" → generatePdfReport()  │   │
│  └─────────────┬───────────────────────────────────────┘   │
│                │                                             │
│  ┌─────────────┴──────────────┐                            │
│  │                              │                            │
│  ▼                              ▼                            │
│ PayrollController.js      PdfReportGenerator.js             │
│ - processPayroll()        - generateWorkerPdfReport()       │
│ - groupLineItemsByWorker()- getWorkerPayrollData()          │
│ - buildBillPayloads()     - HTML template generation        │
│ - findExistingBill()      - Multilingual support            │
│                                                              │
│ SheetsService.js          QuickBooksService.js              │
│ - getActiveWorkers()      - callQBOApi()                    │
│ - getPayrollLineItems()   - getOAuthService()               │
│ - appendLogEntry()        - refreshAccessToken()            │
│                           - getExistingBill()               │
│                                                              │
│ Config/Config.js          Config/constants.js               │
│ - All configuration       - Column name reference           │
│ - Sheet/column mappings   - Constants list                  │
└────────────────┬────────────────────────────────────────────┘
                 │
       ┌─────────┴──────────┐
       ▼                    ▼
┌──────────────┐   ┌──────────────────┐
│Google Sheets │   │QuickBooks Online │
│- Workers     │◄──┤- Create/Update   │
│- Payroll     │──►│  Bills (A/P)     │
│  LineItems   │   │- Vendor sync     │
│- Log         │   │- Partner distrib │
│- Weekly      │   └──────────────────┘
│  Financials  │            │
└──────┬───────┘            │
       │                    │
       ▼                    ▼
┌──────────────┐   ┌──────────────────┐
│ Google Drive │   │   Gmail Send     │
│ PDF Reports  │──►│ Email to Workers │
└──────────────┘   └──────────────────┘
```

### Data Flow

**Payroll Processing Flow:**
```
Admin triggers "Run Payroll" webhook in AppSheet (Week Period: 2025-10-13)
  → doPost() receives webhook payload
    → processPayroll('2025-10-13')
      → getActiveWorkers() from Sheets (filter Availability = 'Active')
        → getPayrollLineItems() from Sheets (filter by Week Period)
          → groupLineItemsByWorker() groups by WorkerID
            → buildBillPayloads() creates QBO Bill JSON
              → findExistingBill() checks if Bill exists (by Check #)
                → callQBOApi() creates or updates Bill in QuickBooks
                  → appendLogEntry() logs success/failure
                    → Returns 200 OK to AppSheet
```

**PDF Report Generation Flow:**
```
Admin/Worker triggers "Generate PDF Report" in AppSheet
  → doPost() receives webhook payload with WorkerID, Worker Name, Send Report date
    → getWeekPeriod() calculates Sunday date from trigger date
      → generateWorkerPdfReport(workerId, workerName, weekPeriod)
        → getWorkerPayrollData() fetches line items + preferred language
          → HTML template generation (English/Spanish/Portuguese)
            → Convert HTML to PDF blob
              → Save to Google Drive folder
                → Email PDF via Gmail
                  → Return PDF URL to AppSheet
```

---

## ✨ Features

### Core Functionality

1. **Payroll Line Item Management**
   - Track hours worked per task
   - Store worker ID, client, service, task details
   - Weekly pay period grouping (Sunday-Saturday)
   - Check number assignment
   - Last update timestamps

2. **QuickBooks Bill Creation**
   - One Bill per worker per week
   - Line-by-line detail with date and task description
   - DocNumber = Check number for tracking
   - Due date = Next Friday after week period
   - Account: Subcontractor Expense (142)
   - Vendor: Synced by WorkerID → QBOID

3. **Partner Distribution**
   - Calculate 1/3 share of weekly net income
   - Add as separate line item to owner's bill (Steve: SG-001-844c9f7b)
   - Source: WeeklyFinancials sheet (Net Income column)
   - Description: "Steve's 1/3 Share of $X Net Income"

4. **PDF Report Generation**
   - Mobile-optimized layout (responsive design)
   - Company branding (logo, colors)
   - Multilingual: English, Spanish, Portuguese
   - Total hours, total earnings, average hourly pay
   - Itemized breakdown by date and task
   - Save to Google Drive
   - Email to worker

5. **Webhook Processing**
   - "Run Payroll" - Process all workers for specified week
   - "Generate PDF Report" - Create worker-specific PDF
   - JSON payload parsing and validation
   - Error handling with detailed logging

6. **Audit Logging**
   - All operations logged to Log sheet
   - Columns: Timestamp, LogLevel, Message, ContextData
   - Track webhook events, API calls, errors
   - Search logs for troubleshooting

### Advanced Features

- **Smart Worker Filtering**: Only process active workers (Availability = 'Active')
- **Duplicate Prevention**: Check if Bill exists before creating (by DocNumber)
- **Token Management**: Automatic OAuth2 token refresh for QuickBooks
- **Date Calculations**: Auto-calculate due dates (next Friday) and week periods (Sunday)
- **Multilingual Support**: Auto-detect worker's primary language for PDF reports
- **Image Embedding**: Company logo embedded as base64 in PDF
- **HTML to PDF**: Professional formatting with CSS styling
- **Email Integration**: Gmail API for PDF delivery

---

## 🚀 Installation & Setup

### Prerequisites

1. **Google Account** with access to:
   - Google Sheets (payroll database)
   - Google Drive (PDF storage)
   - Gmail (email delivery)

2. **QuickBooks Online Account** with:
   - Company/Realm ID
   - Developer app credentials (Client ID, Client Secret)
   - OAuth2 authorization

3. **AppSheet App** (optional but recommended):
   - App ID
   - API Key
   - Webhook configuration

### Step 1: Clone the Project

```powershell
# From GoogleAppsScripts/ directory
cd PayrollProject
clasp clone <SCRIPT_ID>
```

### Step 2: Set Up Google Sheets

Create a new Google Sheet with these tabs:

1. **Workers Sheet**
   - Columns: `WorkerID`, `Employee ID`, `First Name`, `Last Name`, `Email`, `Phone`, `Role`, `ServiceItem`, `Hourly Rate`, `Flat Rate Bonus`, `Availability`, `App Access`, `ApplicationID`, `Primary Language`, `Work History`, `Photo`, `Docs`, `Column 1`, `Display Name`, `QBOID`
   - **Critical**: `Availability` must be "Active" for payroll processing
   - **Critical**: `QBOID` must match QuickBooks Vendor ID for Bill creation

2. **Payroll LineItems Sheet**
   - Columns: `LineItemID`, `Date`, `WorkerID`, `ClientID`, `ServiceID`, `TaskID`, `Worker Name`, `LineItemDetail`, `Qty`, `Check Amount`, `Check #`, `Week Period`, `Last Update`
   - **Critical**: `Week Period` must be Sunday date (e.g., 2025-10-13)
   - **Critical**: `Check #` is used as Bill DocNumber in QuickBooks

3. **WeeklyFinancials Sheet** (for partner distribution)
   - Columns: `Week Period`, `Net Income`
   - Example: `2025-10-13`, `9000.00`

4. **Log Sheet**
   - Columns: `Timestamp`, `LogLevel`, `Message`, `ContextData`
   - Auto-populated by system

### Step 3: Configure Script Properties

Open Script Editor → Project Settings → Script Properties, add:

```
QBO_CLIENT_ID = your_qbo_client_id
QBO_CLIENT_SECRET = your_qbo_client_secret
QBO_REALM_ID = your_qbo_realm_id
QBO_REDIRECT_URI = https://script.google.com/macros/d/YOUR_SCRIPT_ID/usercallback
QBO_BASE_URL = https://quickbooks.api.intuit.com/v3/company/
QBO_TOKEN_URL = https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer
QBO_AUTHORIZATION_URL = https://appcenter.intuit.com/connect/oauth2
QBO_SCOPE = com.intuit.quickbooks.accounting

APP_ID = your_appsheet_app_id (optional)
API_KEY = your_appsheet_api_key (optional)

SPREADSHEET_ID = your_google_sheet_id (the main payroll sheet)
```

### Step 4: Authorize QuickBooks OAuth

1. Run `initiateOAuth()` function in Script Editor
2. Copy the authorization URL from Logs
3. Open URL in browser and authorize the app
4. The callback will automatically handle token storage

**Testing OAuth:**
```javascript
// In Script Editor
initiateOAuth(); // Get auth URL and authorize in browser
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

### Step 6: Configure Webhooks in AppSheet

**Webhook 1: Run Payroll**
- URL: Your deployed Web App URL
- Method: POST
- Event: Manual trigger (button in AppSheet)
- Payload:
  ```json
  {
    "Webhook Type": "Run Payroll",
    "Week Period": "<<[Week Period]>>"
  }
  ```

**Webhook 2: Generate PDF Report**
- URL: Your deployed Web App URL
- Method: POST
- Event: Manual trigger (button in AppSheet)
- Payload:
  ```json
  {
    "Webhook Type": "Generate PDF Report",
    "WorkerID": "<<[WorkerID]>>",
    "Worker Name": "<<[Display Name]>>",
    "Send Report": "<<[Today]>>"
  }
  ```

---

## ⚙️ Configuration

### Config/Config.js Structure

```javascript
const CONFIG = {
  // QuickBooks API Configuration
  CLIENT_ID: scriptProperties.getProperty('QBO_CLIENT_ID'),
  CLIENT_SECRET: scriptProperties.getProperty('QBO_CLIENT_SECRET'),
  REALM_ID: scriptProperties.getProperty('QBO_REALM_ID'),
  REDIRECT_URI: scriptProperties.getProperty('QBO_REDIRECT_URI'),
  QBO_BASE_URL: scriptProperties.getProperty('QBO_BASE_URL'),
  TOKEN_URL: scriptProperties.getProperty('QBO_TOKEN_URL'),
  AUTHORIZATION_URL: scriptProperties.getProperty('QBO_AUTHORIZATION_URL'),
  SCOPE: scriptProperties.getProperty('QBO_SCOPE'),

  // AppSheet API Configuration (optional)
  APP_ID: scriptProperties.getProperty('APP_ID'),
  API_KEY: scriptProperties.getProperty('API_KEY'),

  // Sheets Configuration
  SPREADSHEET_ID: scriptProperties.getProperty('SPREADSHEET_ID'),
  SHEETS: {
    WORKERS: "Workers",
    LOG: "Log",
    PAYROLL_LINE_ITEMS: "Payroll LineItems"
  },
  
  // Column Mappings (see Config/constants.js for full list)
  COLUMNS: {
    WORKERS: {
      WORKER_ID: "WorkerID",
      QBO_VENDOR_ID: "QBOID",
      AVAILABILITY: "Availability",
      PRIMARY_LANGUAGE: "Primary Language",
      // ... 15+ more columns
    },
    PAYROLL_LINE_ITEMS: {
      LINE_ITEM_ID: "LineItemID",
      WORKER_ID: "WorkerID",
      WEEK_PERIOD: "Week Period",
      CHECK_NUMBER: "Check #",
      CHECK_AMOUNT: "Check Amount",
      QTY: "Qty",
      DETAILS: "LineItemDetail",
      PAYROLL_DATE: "Date",
      // ... more columns
    }
  },
  
  // QuickBooks Account References
  ACCOUNTS: {
    EXPENSE_ACCOUNT: {
      value: "142",
      name: "Subcontractor Expense"
    },
    AP_ACCOUNT: {
      value: "7",
      name: "Accounts Payable (A/P)"
    }
  }
};
```

### Customization

**Change QuickBooks Accounts:**
Edit `CONFIG.ACCOUNTS` in `Config/Config.js` to use different expense or AP accounts.

**Modify PDF Template:**
Edit HTML template in `PdfReportGenerator.js` (`generateWorkerPdfReport()` function) to customize:
- Company logo (change `imageId` variable)
- Colors and styling (modify CSS in `<style>` block)
- Layout and sections
- Language translations

**Adjust Partner Distribution:**
Edit `buildBillPayloads()` in `PayrollController.js`:
- Change worker ID check: `if (workerId === "SG-001-844c9f7b")`
- Change share calculation: `const distAmount = parseFloat((thisWeek.NetIncome / 3).toFixed(2))`
- Add additional partners by repeating the logic

**Change Week Period Logic:**
Edit `getWeekPeriod()` in `WebhookHandler.js` to adjust how week periods are calculated from trigger dates.

**Time Zone:**
System uses `America/New_York` (EST/EDT) - configured in `appsscript.json`.

---

## 📚 Module Documentation

### 1. WebhookHandler.js
**Purpose**: Entry point for all webhook events

**Key Functions:**
- `doPost(e)` - Handle incoming POST requests from AppSheet
  - Routes to `processPayroll()` for payroll runs
  - Routes to `generateWorkerPdfReport()` for PDF generation
  - Validates payload structure
  - Returns JSON response to AppSheet

- `createResponse(statusCode, message)` - Format HTTP response
- `getWeekPeriod(date)` - Calculate Sunday date for week period
- `logEvent(eventType, payload, message)` - Wrapper for logging

**Webhook Payload Examples:**

```javascript
// Run Payroll
{
  "Webhook Type": "Run Payroll",
  "Week Period": "2025-10-13" // Sunday date
}

// Generate PDF Report
{
  "Webhook Type": "Generate PDF Report",
  "WorkerID": "CLS001",
  "Worker Name": "John Doe",
  "Send Report": "2025-10-17" // Any date in the week
}
```

### 2. PayrollController.js
**Purpose**: Core payroll processing logic

**Key Functions:**
- `processPayroll(weekPeriod)` - Main payroll processing function
  - Fetches active workers and payroll line items
  - Filters by week period
  - Groups line items by worker
  - Builds Bill payloads
  - Creates/updates Bills in QuickBooks

- `groupLineItemsByWorker(lineItems)` - Group line items by WorkerID
- `buildBillPayloads(groupedLineItems, workerLookup)` - Construct QBO Bill JSON
  - Sorts line items by date
  - Formats descriptions: `YYYY-MM-DD | Task Detail`
  - Adds partner distribution line for owner
  - Calculates totals

- `findExistingBill(docNumber)` - Query QuickBooks for existing Bill by Check #
- `getWeeklyFinancialsFromSheet()` - Fetch weekly net income for distributions
- `getNextFriday(date)` - Calculate due date (next Friday from week period)

**Bill Payload Structure:**
```javascript
{
  DocNumber: "12345", // Check number
  VendorRef: { value: "123" }, // QBOID from Workers sheet
  TxnDate: "2025-10-13", // Week period Sunday
  DueDate: "2025-10-18", // Next Friday
  Line: [
    {
      LineNum: 1,
      Description: "2025-10-14 | Warehouse Labor - 8 hours",
      Amount: 120.00,
      DetailType: "AccountBasedExpenseLineDetail",
      AccountBasedExpenseLineDetail: {
        AccountRef: { value: "142", name: "Subcontractor Expense" },
        BillableStatus: "NotBillable",
        TaxCodeRef: { value: "NON" }
      }
    },
    // ... more line items
    {
      LineNum: 5,
      Description: "2025-10-13 | Steve's 1/3 Share of $9000 Net Income",
      Amount: 3000.00,
      DetailType: "AccountBasedExpenseLineDetail",
      AccountBasedExpenseLineDetail: {
        AccountRef: { value: "142", name: "Subcontractor Expense" },
        BillableStatus: "NotBillable",
        TaxCodeRef: { value: "NON" }
      }
    }
  ],
  APAccountRef: { value: "7", name: "Accounts Payable (A/P)" }
}
```

### 3. PdfReportGenerator.js
**Purpose**: Generate mobile-optimized PDF payroll reports

**Key Functions:**
- `generateWorkerPdfReport(workerId, workerName, weekPeriod)` - Main PDF generation
  - Fetches worker payroll data
  - Detects preferred language (English/Spanish/Portuguese)
  - Loads company logo from Google Drive
  - Generates HTML template
  - Converts to PDF blob
  - Saves to Drive
  - Emails to worker

- `getWorkerPayrollData(workerId, weekPeriod)` - Fetch payroll line items
  - Returns: `{ payrollData: [...], preferredLanguage: 'en' }`

**PDF Template Features:**
- Responsive design (mobile-first)
- Large font sizes for readability (14px base)
- Company branding with embedded logo
- Summary section: Total hours, total earnings, avg hourly pay
- Itemized table: Date, Task, Hours, Amount
- Footer with contact information
- Multilingual labels

**Language Support:**
```javascript
// Label translations in generateWorkerPdfReport()
const labels = {
  en: {
    title: "Payroll Report",
    weekPeriod: "Week Period",
    totalHours: "Total Hours",
    totalAmount: "Total Amount",
    avgHourlyPay: "Average Hourly Pay",
    date: "Date",
    task: "Task/Description",
    hours: "Hours",
    amount: "Amount"
  },
  es: {
    title: "Informe de Nómina",
    weekPeriod: "Período Semanal",
    totalHours: "Total Horas",
    totalAmount: "Monto Total",
    avgHourlyPay: "Pago Promedio por Hora",
    date: "Fecha",
    task: "Tarea/Descripción",
    hours: "Horas",
    amount: "Monto"
  },
  pt: {
    title: "Relatório de Folha de Pagamento",
    weekPeriod: "Período Semanal",
    totalHours: "Total de Horas",
    totalAmount: "Valor Total",
    avgHourlyPay: "Pagamento Médio por Hora",
    date: "Data",
    task: "Tarefa/Descrição",
    hours: "Horas",
    amount: "Valor"
  }
};
```

### 4. QuickBooksService.js
**Purpose**: QuickBooks Online API integration

**Key Functions:**
- `getOAuthService()` - Configure OAuth2 service using OAuth2 library
- `initiateOAuth()` - Start authorization flow (get auth URL)
- `authCallback(request)` - Handle OAuth callback, store tokens
- `refreshAccessToken()` - Refresh expired access token
- `callQBOApi(endpoint, method, payload)` - Make authenticated API calls
  - Automatic token refresh
  - Error handling
  - JSON parsing
  - Logging

- `getExistingBill(docNumber)` - Query QuickBooks for existing Bill

**Required Library**: OAuth2 for Apps Script
- Library ID: `1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF`
- Version: 43

**API Call Example:**
```javascript
// Create a Bill
const billPayload = { /* ... Bill JSON ... */ };
const response = callQBOApi('/bill', 'POST', billPayload);

// Query for existing Bill
const query = `SELECT * FROM Bill WHERE DocNumber = '12345'`;
const response = callQBOApi(`/query?query=${encodeURIComponent(query)}`, 'GET');
```

### 5. SheetsService.js
**Purpose**: Google Sheets data access layer

**Key Functions:**
- `getActiveWorkers()` - Fetch workers with Availability = 'Active'
  - Returns array of worker objects
  - Validates required columns exist
  - Filters out blank rows

- `getPayrollLineItems()` - Fetch all payroll line items
  - Returns array of line item objects
  - Validates required columns exist

- `appendLogEntry(logLevel, message, contextData)` - Write to Log sheet
  - Columns: Timestamp, LogLevel, Message, ContextData
  - Auto-converts objects to JSON strings

**Helper Functions:**
- `validateRequiredColumns(headers, requiredColumns, sheetName)` - Check columns exist
- `isBlankRow(row)` - Detect empty rows to skip
- `mapWorkersById(workers)` - Create lookup table keyed by WorkerID

### 6. Config/Config.js
**Purpose**: Central configuration management

**Contents:**
- QuickBooks API credentials (from Script Properties)
- AppSheet API credentials (from Script Properties)
- Spreadsheet ID
- Sheet names (Workers, Log, Payroll LineItems)
- Column name mappings (Workers, Payroll LineItems)
- QuickBooks account references (expense, AP)

**Pattern**: All sensitive data stored in Script Properties, not hardcoded.

### 7. Config/constants.js
**Purpose**: Quick reference list of all CONFIG paths

**Contents:**
- Complete list of all CONFIG object paths
- Used for documentation and IDE autocomplete
- Example: `CONFIG.COLUMNS.WORKERS.WORKER_ID`

---

## 🔌 API Endpoints & Webhooks

### Web App Endpoint

**URL**: `https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec`

**Method**: `POST`

**Content-Type**: `application/json`

### Webhook 1: Run Payroll

**Purpose**: Process payroll for all active workers for a specific week

**Trigger**: Manual button in AppSheet or scheduled automation

**Request:**
```json
{
  "Webhook Type": "Run Payroll",
  "Week Period": "2025-10-13"
}
```

**Response (Success):**
```json
{
  "status": 200,
  "message": "Payroll processed"
}
```

**Processing:**
1. Fetch active workers (Availability = 'Active')
2. Fetch payroll line items for week period
3. Group line items by WorkerID
4. Build Bill payloads (one per worker)
5. Check if Bill exists in QuickBooks (by Check #)
6. Create new Bill or update existing Bill
7. Log all operations

### Webhook 2: Generate PDF Report

**Purpose**: Create and email PDF payroll report for one worker

**Trigger**: Manual button in AppSheet (per worker)

**Request:**
```json
{
  "Webhook Type": "Generate PDF Report",
  "WorkerID": "CLS001",
  "Worker Name": "John Doe",
  "Send Report": "2025-10-17"
}
```

**Response (Success):**
```json
{
  "success": true,
  "pdfUrl": "https://drive.google.com/file/d/FILE_ID/view"
}
```

**Response (Error):**
```json
{
  "status": 400,
  "message": "Missing required fields"
}
```

**Processing:**
1. Calculate week period (Sunday) from "Send Report" date
2. Fetch worker's payroll data for week
3. Detect worker's preferred language
4. Generate HTML template with translations
5. Convert HTML to PDF
6. Save PDF to Google Drive
7. Email PDF to worker
8. Return Drive URL

---

## 💼 Payroll Processing Workflow

### Week Period Calculation

All payroll is grouped by **Sunday date** of the week:

```javascript
// Example: October 14, 2025 (Monday) → Week Period: October 13, 2025 (Sunday)
function getWeekPeriod(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diff = d.getDate() - day; // Go back to Sunday
  return new Date(d.setDate(diff));
}
```

### Bill Creation Logic

**One Bill per Worker per Week:**
- DocNumber = Check # from Payroll LineItems sheet
- Vendor = QBOID from Workers sheet
- TxnDate = Week Period (Sunday)
- DueDate = Next Friday after week period
- Line Items = All payroll line items for that worker for that week

**Line Item Sorting:**
Line items are sorted by `Date` column (ascending) so chronological order is preserved in QuickBooks.

**Line Item Description Format:**
```
YYYY-MM-DD | Task Detail
```
Example: `2025-10-14 | Warehouse Labor - 8 hours at $15/hr`

### Partner Distribution Logic

**Trigger**: If WorkerID = "SG-001-844c9f7b" (Steve)

**Calculation**:
1. Look up week in WeeklyFinancials sheet
2. Get Net Income for that week
3. Calculate 1/3 share: `distAmount = netIncome / 3`
4. Add as separate line item with description: `"YYYY-MM-DD | Steve's 1/3 Share of $X Net Income"`

**Example:**
- Week Period: 2025-10-13
- Net Income: $9,000
- Steve's Share: $3,000 (added to his Bill)

### Update vs Create

**Logic**:
1. Query QuickBooks: `SELECT * FROM Bill WHERE DocNumber = 'CHECK_NUMBER'`
2. If Bill found:
   - Add `Id` and `SyncToken` to payload
   - POST to `/bill` (QuickBooks treats this as update)
3. If Bill not found:
   - POST to `/bill` without `Id` (creates new Bill)

**Why this matters**: Prevents duplicate Bills if webhook is triggered multiple times.

---

## 📄 PDF Report Generation

### Mobile-Optimized Design

**Features:**
- Responsive layout adapts to small screens
- Large font sizes (14px base, 40px headlines)
- Touch-friendly spacing
- Company logo at 200px max width
- Table layout with word wrap for long descriptions

### Multilingual Support

**Language Detection**:
```javascript
// From Workers sheet "Primary Language" column
const preferredLanguage = workerData.PRIMARY_LANGUAGE || 'en';
// Supported: 'en' (English), 'es' (Spanish), 'pt' (Portuguese)
```

**Fallback**: If language not recognized, defaults to English.

### PDF Generation Process

1. **Fetch Data**: Get payroll line items for worker and week
2. **Load Logo**: Fetch company logo from Drive, convert to base64
3. **Calculate Totals**: Sum hours, sum amounts, calculate avg hourly pay
4. **Generate HTML**: Build HTML string with CSS and dynamic content
5. **Convert to PDF**: `HtmlService.createHtmlOutput(html).getBlob()`
6. **Save to Drive**: `DriveApp.createFile(pdfBlob).setName(filename)`
7. **Email**: `GmailApp.sendEmail(worker.email, subject, body, { attachments: [pdfBlob] })`

### PDF Filename Format

```
Payroll_Report_WORKERNAME_YYYY-MM-DD.pdf
```

Example: `Payroll_Report_JohnDoe_2025-10-13.pdf`

### Email Template

**Subject**: `Payroll Report for Week of YYYY-MM-DD`

**Body**:
```
Hello [Worker Name],

Your payroll report for the week of [Week Period] is attached.

Total Hours: X.XX
Total Earnings: $XXX.XX
Average Hourly Pay: $XX.XX

If you have any questions, please contact us.

Best regards,
Carolina Lumpers Service
```

---

## 🧪 Testing & Debugging

### Manual Testing Functions

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

#### 2. Test Payroll Processing
```javascript
function testPayrollProcessing() {
  const weekPeriod = "2025-10-13"; // Sunday date
  processPayroll(weekPeriod);
  // Check Apps Script logs for detailed output
}
```

#### 3. Test Worker Data Fetch
```javascript
function testWorkerFetch() {
  const workers = getActiveWorkers();
  Logger.log(`Found ${workers.length} active workers`);
  workers.forEach(w => {
    Logger.log(`- ${w['Display Name']} (${w.WorkerID}) - QBOID: ${w.QBOID}`);
  });
}
```

#### 4. Test Payroll Line Items Fetch
```javascript
function testLineItemsFetch() {
  const lineItems = getPayrollLineItems();
  Logger.log(`Found ${lineItems.length} payroll line items`);
  
  // Filter by week period
  const weekPeriod = "2025-10-13";
  const filtered = lineItems.filter(item => 
    formatDateYYYYMMDD(parseDate(item['Week Period'])) === weekPeriod
  );
  Logger.log(`${filtered.length} items for week ${weekPeriod}`);
}
```

#### 5. Test PDF Generation
```javascript
function testPDFGeneration() {
  const workerId = "CLS001";
  const workerName = "John Doe";
  const weekPeriod = "2025-10-13";
  
  const pdfUrl = generateWorkerPdfReport(workerId, workerName, weekPeriod);
  Logger.log(`PDF URL: ${pdfUrl}`);
}
```

#### 6. Test Webhook Handler
```javascript
function testWebhook() {
  // Test Run Payroll webhook
  const mockEvent1 = {
    postData: {
      contents: JSON.stringify({
        "Webhook Type": "Run Payroll",
        "Week Period": "2025-10-13"
      })
    }
  };
  doPost(mockEvent1);
  
  // Test PDF Generation webhook
  const mockEvent2 = {
    postData: {
      contents: JSON.stringify({
        "Webhook Type": "Generate PDF Report",
        "WorkerID": "CLS001",
        "Worker Name": "John Doe",
        "Send Report": "2025-10-17"
      })
    }
  };
  doPost(mockEvent2);
}
```

#### 7. Test QuickBooks Bill Creation
```javascript
function testBillCreation() {
  const billPayload = {
    DocNumber: "TEST123",
    VendorRef: { value: "123" }, // Replace with real QBOID
    TxnDate: "2025-10-13",
    DueDate: "2025-10-18",
    Line: [
      {
        LineNum: 1,
        Description: "Test Line Item",
        Amount: 100.00,
        DetailType: "AccountBasedExpenseLineDetail",
        AccountBasedExpenseLineDetail: {
          AccountRef: { value: "142", name: "Subcontractor Expense" },
          BillableStatus: "NotBillable",
          TaxCodeRef: { value: "NON" }
        }
      }
    ],
    APAccountRef: { value: "7", name: "Accounts Payable (A/P)" }
  };
  
  const response = callQBOApi('/bill', 'POST', billPayload);
  Logger.log(JSON.stringify(response, null, 2));
}
```

### Debugging Tools

#### Check Recent Logs
```javascript
function viewRecentLogs() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEETS.LOG);
  const lastRow = sheet.getLastRow();
  const data = sheet.getRange(Math.max(1, lastRow - 20), 1, 20, 4).getValues();
  
  data.forEach(row => {
    Logger.log(`${row[0]} | ${row[1]} | ${row[2]} | ${row[3]}`);
  });
}
```

#### Validate Sheet Structure
```javascript
function validateSheets() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  
  // Check Workers sheet
  const workersSheet = ss.getSheetByName(CONFIG.SHEETS.WORKERS);
  if (workersSheet) {
    const headers = workersSheet.getRange(1, 1, 1, workersSheet.getLastColumn()).getValues()[0];
    Logger.log(`✅ Workers sheet found with ${workersSheet.getLastRow()} rows`);
    Logger.log(`   Headers: ${headers.join(', ')}`);
  } else {
    Logger.log(`❌ Workers sheet not found`);
  }
  
  // Check Payroll LineItems sheet
  const lineItemsSheet = ss.getSheetByName(CONFIG.SHEETS.PAYROLL_LINE_ITEMS);
  if (lineItemsSheet) {
    Logger.log(`✅ Payroll LineItems sheet found with ${lineItemsSheet.getLastRow()} rows`);
  } else {
    Logger.log(`❌ Payroll LineItems sheet not found`);
  }
  
  // Check Log sheet
  const logSheet = ss.getSheetByName(CONFIG.SHEETS.LOG);
  if (logSheet) {
    Logger.log(`✅ Log sheet found with ${logSheet.getLastRow()} entries`);
  } else {
    Logger.log(`❌ Log sheet not found`);
  }
}
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "OAuth not authorized" | Access token expired | Run `initiateOAuth()` to reauthorize |
| "Worker not found" | QBOID missing in Workers sheet | Add QuickBooks Vendor ID to QBOID column |
| "No payroll line items" | Week Period format wrong | Ensure Week Period is Sunday date (YYYY-MM-DD) |
| "Bill creation failed: 401" | Invalid credentials | Verify QBO_CLIENT_ID and QBO_CLIENT_SECRET |
| "PDF not generated" | Missing Drive permissions | Check Google Drive API is enabled |
| "Email not sent" | Gmail quota exceeded | Wait for quota reset (24 hours) or use service account |
| "Webhook timeout" | Too many workers | Process in batches or increase timeout |
| "Partner distribution wrong" | Net Income missing | Add week to WeeklyFinancials sheet |

---

## 🛠️ Troubleshooting

### OAuth Issues

**Problem**: "Token refresh failed"
```javascript
// Solution: Re-authorize from scratch
function resetOAuth() {
  const service = getOAuthService();
  service.reset();
  PropertiesService.getScriptProperties().deleteProperty("QBO_REFRESH_TOKEN");
  initiateOAuth();
}
```

**Problem**: "Invalid redirect URI"
- Verify `QBO_REDIRECT_URI` in Script Properties matches QBO app settings
- Format: `https://script.google.com/macros/d/YOUR_SCRIPT_ID/usercallback`

### Payroll Processing Issues

**Problem**: No Bills created in QuickBooks
1. Check if workers have `QBOID` populated in Workers sheet
2. Verify `Availability` = "Active" for workers
3. Check Week Period format (must be Sunday date)
4. Review Log sheet for error messages

**Problem**: Duplicate Bills in QuickBooks
- Ensure Check # is unique per worker per week
- Verify `findExistingBill()` logic is working
- Check if DocNumber matches Check # exactly

**Problem**: Line items in wrong order
- Payroll LineItems must have `Date` column populated
- System sorts by Date before creating Bill

### PDF Generation Issues

**Problem**: PDF not generated
- Verify Google Drive API is enabled (see appsscript.json)
- Check worker has payroll data for specified week
- Review Log sheet for errors

**Problem**: Wrong language in PDF
- Check Workers sheet `Primary Language` column
- Supported: 'en', 'es', 'pt' (case-insensitive)
- Defaults to English if not recognized

**Problem**: Company logo not showing
- Verify `imageId` in `PdfReportGenerator.js` is correct
- Check Drive file permissions (script must have access)
- Use base64 encoding (already implemented)

### Webhook Issues

**Problem**: Webhook returns 400 error
- Check JSON payload structure matches expected format
- Verify required fields are present (Webhook Type, etc.)
- Check Content-Type header is application/json

**Problem**: Webhook times out
- Reduce number of workers being processed
- Check for infinite loops in code
- Review Log sheet for hung operations

### Performance Issues

**Problem**: Slow payroll processing
- Batch API calls instead of individual calls
- Use `SpreadsheetApp.openById()` once, not per function
- Cache worker lookup tables

**Problem**: Memory limit exceeded
- Process workers in batches
- Clear unused variables
- Avoid loading entire sheets into memory

---

## 📦 Deployment

### Development vs Production

**Development:**
- Use test Google Sheet with sample data
- Sandbox QuickBooks account
- Separate AppSheet app
- Web app access: "Only myself"
- Script Properties: DEV_ prefix

**Production:**
- Production Google Sheet with live data
- Live QuickBooks account
- Production AppSheet app
- Web app access: "Anyone"
- Script Properties: Production values

### Deployment Checklist

- [ ] All Script Properties configured
- [ ] OAuth authorized and tested
- [ ] Google Sheets structure matches CONFIG.SHEETS
- [ ] Workers have QBOID populated
- [ ] Payroll LineItems have Week Period and Check #
- [ ] WeeklyFinancials sheet exists (if using partner distribution)
- [ ] Web app deployed with correct access level
- [ ] AppSheet webhooks configured and tested
- [ ] Test payroll run with 1-2 workers
- [ ] Test PDF generation for 1 worker
- [ ] Monitor logs for first week of production use

### Using clasp for Deployment

```powershell
# Initial setup (one-time)
clasp login
clasp clone YOUR_SCRIPT_ID

# Make changes locally in PayrollProject/

# Push to Google Apps Script
clasp push

# Deploy new version
clasp deploy --description "v3.0 - Multilingual PDF reports"

# List deployments
clasp deployments

# Open in web editor
clasp open
```

### Batch Scripts

This project includes PowerShell scripts for multi-project management:

- `clone-all.ps1` - Clone all project files from Google
- `pull-all.ps1` - Pull latest changes from all projects
- `push-all.ps1` - Push local changes to all projects

**Usage:**
```powershell
# From PayrollProject/ directory
.\push-all.ps1  # Push all files to Google Apps Script
```

### Version Control

This project uses Git for version control:

1. Create feature branch: `git checkout -b feature/pdf-improvements`
2. Make changes and test locally
3. Push to Google Apps Script: `clasp push`
4. Test in Apps Script environment
5. Commit changes: `git commit -m "Add multilingual PDF support"`
6. Merge to main: `git checkout main && git merge feature/pdf-improvements`

---

## 📊 Monitoring & Maintenance

### Daily Checks

- Review Log sheet for errors (filter LogLevel = "ERROR")
- Verify OAuth token validity: `getOAuthService().hasAccess()`
- Check QuickBooks Bills created for previous day
- Monitor Gmail quota if sending many reports

### Weekly Maintenance

- Archive old log entries (move to separate archive sheet)
- Review payroll processing for previous week
- Verify all workers have Bills in QuickBooks
- Check for missing QBOID values in Workers sheet

### Monthly Tasks

- Review sync success rate (count success vs error logs)
- Update OAuth refresh token if needed
- Review and update PDF templates
- Backup Google Sheets data
- Update Script Properties if credentials changed

### Analytics Queries

**Count Bills created per week:**
```javascript
function countBillsByWeek() {
  const logSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.LOG);
  const data = logSheet.getDataRange().getValues();
  
  const billCounts = {};
  data.forEach(row => {
    const message = row[2]; // Message column
    if (message.includes("Bill:")) {
      const date = new Date(row[0]).toISOString().split('T')[0];
      billCounts[date] = (billCounts[date] || 0) + 1;
    }
  });
  
  Logger.log(billCounts);
}
```

**PDF generation success rate:**
```javascript
function pdfSuccessRate() {
  const logSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.LOG);
  const data = logSheet.getDataRange().getValues();
  
  let total = 0, success = 0;
  data.forEach(row => {
    const message = row[2];
    if (message.includes("PDF")) {
      total++;
      if (message.includes("✅") || message.includes("created successfully")) {
        success++;
      }
    }
  });
  
  const rate = (success / total * 100).toFixed(2);
  Logger.log(`PDF success rate: ${rate}% (${success}/${total})`);
}
```

---

## 📞 Support & Resources

### Documentation
- [Google Apps Script Guides](https://developers.google.com/apps-script)
- [QuickBooks API Documentation](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/bill)
- [OAuth2 for Apps Script Library](https://github.com/googleworkspace/apps-script-oauth2)
- [AppSheet Webhooks](https://help.appsheet.com/en/articles/961332-webhook-actions)

### Related Projects
- `GoogleAppsScripts/EmployeeLogin/` - Time tracking system (provides payroll data)
- `GoogleAppsScripts/InvoiceProject/` - Invoice generation and QBO sync
- `GoogleAppsScripts/ContactSync/` - Contact synchronization

### Change Log

**v3.0 (October 2025)**
- Multilingual PDF reports (English, Spanish, Portuguese)
- Mobile-optimized PDF layout
- Improved error handling and logging
- Partner distribution automation
- Bill update logic (check for existing)

**v2.0 (2025)**
- QuickBooks Bill creation
- OAuth2 authentication
- Webhook processing
- Audit logging

**v1.0 (Initial Release)**
- Basic payroll line item tracking
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

**Last Updated**: October 17, 2025  
**Maintainer**: Carolina Lumpers Service Development Team  
**Project Version**: 3.0  
**Dependencies**: OAuth2 Library v43, Google Apps Script Runtime V8
