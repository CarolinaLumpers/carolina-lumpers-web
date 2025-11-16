# Payroll & Invoice Automation - Best Practice Plan

**Date**: November 15, 2025  
**Status**: Analysis & Planning Phase  
**Goal**: Automate QuickBooks Online (QBO) payroll bills and customer invoices

---

## 📊 Current State Analysis

### Payroll System (GoogleAppsScripts/PayrollProject)

**Architecture**: Google Apps Script → Google Sheets → QuickBooks Online

**Current Implementation**:

- **Data Source**: `Payroll LineItems` sheet (496 records)
- **Processing**: `PayrollController.js` groups by worker and week period
- **Output**: QBO Bills (Accounts Payable) for subcontractor payments
- **Trigger**: AppSheet webhook "Run Payroll" with week period parameter
- **Special Logic**: Partner distributions (1/3 share of net income) for SG-001 and DMR-002

**Schema (Google Sheets)**:

```
Payroll LineItems (15 columns):
- LineItemID (primary key)
- Date (work date)
- WorkerID (references Workers)
- ClientID (references Clients)
- ServiceID (references Services)
- TaskID (references Tasks)
- Worker Name (display name)
- LineItemDetail (description: "08:00-15:00 (0.5 hrs break)")
- Qty (hours worked)
- Check Amount (total pay for line)
- Check # (used as QBO DocNumber)
- Week Period (Sunday date for grouping)
- Last Update (timestamp)
- Start Time (for sorting)
- Run Payroll (boolean flag)
```

**QBO Bill Structure**:

```javascript
{
  DocNumber: "SG-250628",              // Check # from sheets
  TxnDate: "2025-06-23",               // Week Period (Sunday)
  DueDate: "2025-06-27",               // Next Friday
  VendorRef: { value: "123" },         // Worker's QBOID
  Line: [
    {
      Description: "2025-06-23 | 08:00-15:00 (0.5 hrs break)",
      Amount: 169.00,
      AccountRef: { value: "142", name: "Subcontractor Expense" }
    },
    // ... more line items sorted by date
    {
      Description: "2025-06-23 | Steve's 1/3 Share of $9000 Net Income",
      Amount: 3000.00,
      AccountRef: { value: "148", name: "Partner Distributions:Steve" }
    }
  ],
  APAccountRef: { value: "7", name: "Accounts Payable (A/P)" }
}
```

**Processing Flow**:

1. AppSheet webhook triggers `processPayroll(weekPeriod)`
2. Fetch active workers (Availability = 'Active')
3. Fetch payroll line items for week period
4. Group by WorkerID
5. Build one Bill per worker with all line items
6. Check if Bill exists (query by DocNumber)
7. Create new or update existing Bill in QBO
8. Add partner distribution line if worker is SG-001 or DMR-002

**Strengths** ✅:

- OAuth2 with automatic token refresh
- Duplicate prevention (checks existing Bills)
- Retry logic (3 attempts with backoff)
- Centralized logging
- Partner distribution automation
- Line items sorted chronologically
- Uses Check # as DocNumber for tracking

**Issues** ❌:

- Google Sheets as single source of truth (no Supabase sync)
- Manual trigger required via AppSheet
- No automated PDF generation for workers
- No direct integration with clock-in data
- Partner distribution hardcoded for only 2 workers
- WeeklyFinancials sheet required for net income lookup

---

### Invoice System (GoogleAppsScripts/InvoiceProject)

**Architecture**: Google Apps Script → Google Sheets → QuickBooks Online

**Current Implementation**:

- **Data Source**: Two sheets: `Invoices` (14 rows) and `Invoice LineItems` (340 rows)
- **Processing**: `Invoice_Management.js` creates/updates invoices
- **Output**: QBO Customer Invoices (Accounts Receivable)
- **Trigger**: AppSheet webhooks "Invoice_Creation" and "LineItem_Update"
- **Features**: PDF generation, email delivery, OAuth2

**Schema (Google Sheets)**:

```
Invoices (9 columns):
- Invoice# (primary key, e.g., "CLS-2025-001")
- Customer (client name)
- Date (invoice date)
- Due Date (payment due)
- Amount (total)
- Status (unpaid, paid, overdue)
- Synced? (boolean - pushed to QBO)
- Push to QBO (boolean - trigger flag)
- LastUpdated (timestamp)

Invoice LineItems (17 columns):
- LineItemID (primary key)
- Invoice# (references Invoices)
- Customer (client name)
- Week Period (date range)
- DueDate (payment due)
- Date (service date)
- Item (service name)
- LineItemDetail (description)
- Qty (quantity/hours)
- Invoice Amount (line total)
- ClientID (references Clients)
- ServiceID (references Services)
- TaskID (references Tasks)
- Worker Name (employee assigned)
- Last Update (timestamp)
- Start Time (Sorting) (for ordering)
- Synced? (boolean)
```

**QBO Invoice Structure**:

```javascript
{
  DocNumber: "CLS-2025-001",           // Invoice# from sheets
  TxnDate: "2025-02-12",               // Invoice date
  DueDate: "2025-03-12",               // Due date
  CustomerRef: { value: "456" },       // Client's QBOID
  BillEmail: { Address: "billing@client.com" },
  BillEmailCc: { Address: "manager@client.com" },
  BillEmailBcc: { Address: "accounting@cls.com" },
  Line: [
    {
      DetailType: "SalesItemLineDetail",
      Description: "Warehouse Labor - 8 hours",
      Amount: 120.00,
      SalesItemLineDetail: {
        ItemRef: { value: "1" },       // ServiceID
        ServiceDate: "2025-02-10",
        Qty: 8,
        UnitPrice: 15.00
      }
    }
    // ... more line items sorted by date
  ]
}
```

**Processing Flow**:

1. AppSheet webhook triggers event (Invoice_Creation or LineItem_Update)
2. Fetch invoice data from Invoices sheet
3. Fetch client data (QBOID, email addresses) from Clients sheet
4. Fetch all line items from Invoice LineItems sheet
5. Build invoice payload with sorted line items
6. Check if invoice exists in QBO (query by DocNumber)
7. Create new or update existing invoice
8. Generate PDF (optional)
9. Email invoice to client (optional)

**Strengths** ✅:

- Bidirectional sync (QBO → Sheets and Sheets → QBO)
- OAuth2 with automatic token refresh
- Duplicate prevention
- PDF generation with company branding
- Email delivery with CC/BCC support
- Line items sorted by service date
- Retry logic (3 attempts)
- Audit logging

**Issues** ❌:

- Google Sheets as single source of truth (no Supabase)
- Manual webhook triggers from AppSheet
- No automated invoice generation from completed tasks
- No integration with payroll system
- Limited error recovery

---

## 🔒 CRITICAL: QBO Payload Preservation Strategy

### Why This Matters

QuickBooks Online API is **extremely particular** about payload structure. Your current working payloads represent **hours of trial-and-error debugging**. Common issues:

- Field order matters in some cases
- Nested object structure must be exact
- Data types are strictly enforced (string vs number)
- Missing optional fields can cause rejections
- Extra fields can cause rejections
- Date formats must be ISO 8601 (YYYY-MM-DD)
- Decimal precision matters (2 decimal places for currency)

**One wrong field = entire Bill/Invoice rejected by QBO**

### Preservation Protocol

#### Step 1: Extract Working Payloads

**From PayrollController.js** (Lines 60-120):

```javascript
// THIS IS THE PROVEN WORKING PAYLOAD - DO NOT MODIFY STRUCTURE
const billPayload = {
  TxnDate: txnDate, // YYYY-MM-DD format
  DueDate: dueDate, // YYYY-MM-DD format
  VendorRef: {
    value: workerDetails.qboVendorId,
    name: workerDetails.displayName,
  },
  DocNumber: checkNumber, // String, e.g., "SG-250628"
  PrivateNote: checkNumber, // Same as DocNumber
  Line: formattedLineItems, // Array of line item objects
  TotalAmt: totalAmount, // Number, 2 decimal places
  CurrencyRef: { value: "USD", name: "United States Dollar" },
  APAccountRef: { value: "7", name: "Accounts Payable (A/P)" },
};

// Line item structure (also proven working)
const lineItem = {
  LineNum: index + 1, // Sequential starting at 1
  Description: `${payrollDate} | ${details}`, // "YYYY-MM-DD | Description"
  Amount: parseFloat(amount), // Number, 2 decimals
  DetailType: "AccountBasedExpenseLineDetail",
  AccountBasedExpenseLineDetail: {
    AccountRef: { value: "142", name: "Subcontractor Expense" },
    BillableStatus: "NotBillable",
    TaxCodeRef: { value: "NON" },
  },
};
```

**From QBO_API.js** (buildInvoicePayload):

```javascript
// THIS IS THE PROVEN WORKING INVOICE PAYLOAD - DO NOT MODIFY STRUCTURE
const invoicePayload = {
  DocNumber: invoiceData.invoiceNumber, // String, e.g., "CLS-2025-001"
  TxnDate: txnDate, // YYYY-MM-DD format
  DueDate: dueDate, // YYYY-MM-DD format
  CustomerRef: { value: clientData.qboId },
  BillEmail: { Address: clientData.payablesEmail },
  BillEmailCc: { Address: clientData.payablesEmailCc },
  BillEmailBcc: { Address: clientData.payablesEmailBcc },
  PrivateNote: `Invoice # ${invoiceData.invoiceNumber}`,
  ShipAddr: {}, // Empty object required
  SalesTermRef: {}, // Empty object required
  Line: linePayload,
};

// Invoice line item structure (proven working)
const invoiceLine = {
  DetailType: "SalesItemLineDetail",
  Amount: amount, // Number, 2 decimals
  SalesItemLineDetail: {
    ItemRef: { value: serviceID }, // String QBO Item ID
    ServiceDate: serviceDate, // YYYY-MM-DD format
    Qty: qty, // Number
    UnitPrice: amount / qty, // Calculated, 2 decimals
  },
  Description: description, // String
};
```

#### Step 2: Port to New System (Data Mapping Only)

**NEW FILE**: `react-portal/src/services/qbo-payloads.js`

```javascript
/**
 * QBO Payload Builders - PORTED FROM WORKING APPS SCRIPT
 *
 * ⚠️ CRITICAL: These payload structures are PROVEN WORKING
 * DO NOT modify structure, field names, or nesting
 * ONLY change how we fetch the input data
 */

/**
 * Build QBO Bill payload for payroll (PORTED from PayrollController.js)
 * @param {Object} workerDetails - { id, display_name, qbo_vendor_id, employee_id }
 * @param {Array} lineItems - Array of payroll_line_items records from Supabase
 * @param {Object} weeklyFinancials - { week_period, net_income } or null
 * @returns {Object} - QBO Bill payload (exact structure from Apps Script)
 */
export function buildPayrollBillPayload(
  workerDetails,
  lineItems,
  weeklyFinancials
) {
  // CRITICAL: Check number from first line item (same as Apps Script)
  const checkNumber = lineItems[0].check_number;
  if (!checkNumber) {
    throw new Error(
      `Missing check_number for worker ${workerDetails.employee_id}`
    );
  }

  // CRITICAL: Week period from first line item (same as Apps Script)
  const txnDate = formatDateYYYYMMDD(new Date(lineItems[0].week_period));
  const dueDate = formatDateYYYYMMDD(getNextFriday(new Date(txnDate)));

  // CRITICAL: Sort by work_date (same as Apps Script sorts by Date)
  lineItems.sort((a, b) => new Date(a.work_date) - new Date(b.work_date));

  // CRITICAL: Format line items (exact structure from Apps Script)
  const formattedLineItems = lineItems
    .map((item, index) => {
      const payrollDate = formatDateYYYYMMDD(new Date(item.work_date));
      return {
        LineNum: index + 1,
        Description: `${payrollDate} | ${item.description}`,
        Amount: parseFloat(item.amount),
        DetailType: "AccountBasedExpenseLineDetail",
        AccountBasedExpenseLineDetail: {
          AccountRef: { value: "142", name: "Subcontractor Expense" },
          BillableStatus: "NotBillable",
          TaxCodeRef: { value: "NON" },
        },
      };
    })
    .filter((item) => item.Amount > 0);

  // CRITICAL: Partner distribution logic (exact same as Apps Script)
  if (weeklyFinancials && !isNaN(weeklyFinancials.net_income)) {
    const distAmount = parseFloat((weeklyFinancials.net_income / 3).toFixed(2));

    // Steve's distribution (employee_id: SG-001)
    if (workerDetails.employee_id === "SG-001") {
      formattedLineItems.push({
        LineNum: formattedLineItems.length + 1,
        Description: `${txnDate} | Steve's 1/3 Share of $${weeklyFinancials.net_income} Net Income`,
        Amount: distAmount,
        DetailType: "AccountBasedExpenseLineDetail",
        AccountBasedExpenseLineDetail: {
          AccountRef: {
            value: "148",
            name: "Partner Distributions:Steve Distributions",
          },
          BillableStatus: "NotBillable",
          TaxCodeRef: { value: "NON" },
        },
      });
    }

    // Daniela's distribution (employee_id: DMR-002)
    if (workerDetails.employee_id === "DMR-002") {
      formattedLineItems.push({
        LineNum: formattedLineItems.length + 1,
        Description: `${txnDate} | Daniela's 1/3 Share of $${weeklyFinancials.net_income} Net Income`,
        Amount: distAmount,
        DetailType: "AccountBasedExpenseLineDetail",
        AccountBasedExpenseLineDetail: {
          AccountRef: {
            value: "149",
            name: "Partner Distributions:Daniela Distributions",
          },
          BillableStatus: "NotBillable",
          TaxCodeRef: { value: "NON" },
        },
      });
    }
  }

  // CRITICAL: Calculate total (same as Apps Script)
  const totalAmount = formattedLineItems.reduce(
    (sum, item) => sum + item.Amount,
    0
  );

  // CRITICAL: Return exact payload structure from Apps Script
  return {
    TxnDate: txnDate,
    DueDate: dueDate,
    VendorRef: {
      value: workerDetails.qbo_vendor_id,
      name: workerDetails.display_name,
    },
    DocNumber: checkNumber,
    PrivateNote: checkNumber,
    Line: formattedLineItems,
    TotalAmt: totalAmount,
    CurrencyRef: { value: "USD", name: "United States Dollar" },
    APAccountRef: { value: "7", name: "Accounts Payable (A/P)" },
  };
}

/**
 * Build QBO Invoice payload (PORTED from QBO_API.js buildInvoicePayload)
 * @param {Object} invoiceData - Invoice record from Supabase
 * @param {Object} clientData - Client record with qbo_customer_id
 * @param {Array} lineItems - Array of invoice_line_items from Supabase
 * @returns {Object} - QBO Invoice payload (exact structure from Apps Script)
 */
export function buildInvoicePayload(invoiceData, clientData, lineItems) {
  // CRITICAL: Date formatting (same as Apps Script normalizeDateToISO)
  const txnDate = invoiceData.invoice_date
    ? formatDateYYYYMMDD(new Date(invoiceData.invoice_date))
    : "";
  const dueDate = invoiceData.due_date
    ? formatDateYYYYMMDD(new Date(invoiceData.due_date))
    : "";

  // CRITICAL: Sort by service_date (same as Apps Script sorts by date)
  lineItems.sort((a, b) => new Date(a.service_date) - new Date(b.service_date));

  // CRITICAL: Format line items (exact structure from Apps Script)
  const linePayload = lineItems.map((item) => {
    const serviceDate = item.service_date
      ? formatDateYYYYMMDD(new Date(item.service_date))
      : "";
    return {
      DetailType: "SalesItemLineDetail",
      Amount: item.amount,
      SalesItemLineDetail: {
        ItemRef: { value: item.service_id },
        ServiceDate: serviceDate,
        Qty: item.quantity,
        UnitPrice: item.amount / item.quantity,
      },
      Description: item.description,
    };
  });

  // CRITICAL: Return exact payload structure from Apps Script
  return {
    DocNumber: invoiceData.invoice_number,
    TxnDate: txnDate,
    DueDate: dueDate,
    CustomerRef: { value: clientData.qbo_customer_id },
    BillEmail: { Address: clientData.billing_email },
    BillEmailCc: { Address: clientData.billing_email_cc },
    BillEmailBcc: { Address: clientData.billing_email_bcc },
    PrivateNote: `Invoice # ${invoiceData.invoice_number}`,
    ShipAddr: {},
    SalesTermRef: {},
    Line: linePayload,
  };
}

// CRITICAL: Helper functions (ported from Apps Script)
function formatDateYYYYMMDD(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getNextFriday(dateObj) {
  const nextFriday = new Date(dateObj);
  const dayOfWeek = nextFriday.getDay();
  const offset = (12 - dayOfWeek) % 7 || 7;
  nextFriday.setDate(nextFriday.getDate() + offset);
  return nextFriday;
}
```

#### Step 3: Validation Tests

**NEW FILE**: `react-portal/tests/qbo-payload-validation.test.js`

```javascript
/**
 * QBO Payload Validation Tests
 *
 * CRITICAL: These tests ensure new payloads match Apps Script payloads exactly
 */

import {
  buildPayrollBillPayload,
  buildInvoicePayload,
} from "../src/services/qbo-payloads";

describe("QBO Payload Validation", () => {
  test("Payroll Bill payload matches Apps Script structure", () => {
    // Input data (from Supabase)
    const workerDetails = {
      id: "624652a2-830c-43d5-b76a-cfeff1c8270a",
      employee_id: "SG-001",
      display_name: "Steve Garay",
      qbo_vendor_id: "123",
    };

    const lineItems = [
      {
        work_date: "2025-06-23",
        description: "08:00-15:00 (0.5 hrs break)",
        amount: 169,
        week_period: "2025-06-28",
        check_number: "SG-250628",
      },
    ];

    const weeklyFinancials = {
      week_period: "2025-06-23",
      net_income: 9000,
    };

    // Generate payload
    const payload = buildPayrollBillPayload(
      workerDetails,
      lineItems,
      weeklyFinancials
    );

    // CRITICAL: Validate exact structure
    expect(payload).toHaveProperty("TxnDate");
    expect(payload).toHaveProperty("DueDate");
    expect(payload).toHaveProperty("VendorRef.value", "123");
    expect(payload).toHaveProperty("VendorRef.name", "Steve Garay");
    expect(payload).toHaveProperty("DocNumber", "SG-250628");
    expect(payload).toHaveProperty("PrivateNote", "SG-250628");
    expect(payload).toHaveProperty("Line");
    expect(payload).toHaveProperty("TotalAmt");
    expect(payload).toHaveProperty("CurrencyRef.value", "USD");
    expect(payload).toHaveProperty("APAccountRef.value", "7");

    // CRITICAL: Validate line item structure
    expect(payload.Line[0]).toHaveProperty("LineNum", 1);
    expect(payload.Line[0]).toHaveProperty("Description");
    expect(payload.Line[0]).toHaveProperty("Amount", 169);
    expect(payload.Line[0]).toHaveProperty(
      "DetailType",
      "AccountBasedExpenseLineDetail"
    );
    expect(payload.Line[0].AccountBasedExpenseLineDetail).toHaveProperty(
      "AccountRef.value",
      "142"
    );
    expect(payload.Line[0].AccountBasedExpenseLineDetail).toHaveProperty(
      "BillableStatus",
      "NotBillable"
    );
    expect(payload.Line[0].AccountBasedExpenseLineDetail).toHaveProperty(
      "TaxCodeRef.value",
      "NON"
    );

    // CRITICAL: Validate partner distribution added
    expect(payload.Line[1]).toHaveProperty("Description");
    expect(payload.Line[1].Description).toContain("Steve's 1/3 Share");
    expect(payload.Line[1]).toHaveProperty("Amount", 3000);
    expect(payload.Line[1].AccountBasedExpenseLineDetail).toHaveProperty(
      "AccountRef.value",
      "148"
    );

    // CRITICAL: Validate total calculation
    expect(payload.TotalAmt).toBe(3169); // 169 + 3000
  });

  test("Invoice payload matches Apps Script structure", () => {
    // Input data (from Supabase)
    const invoiceData = {
      invoice_number: "CLS-2025-001",
      invoice_date: "2025-02-12",
      due_date: "2025-03-12",
    };

    const clientData = {
      qbo_customer_id: "456",
      billing_email: "billing@client.com",
      billing_email_cc: "manager@client.com",
      billing_email_bcc: "accounting@cls.com",
    };

    const lineItems = [
      {
        service_date: "2025-02-10",
        service_id: "1",
        description: "Warehouse Labor - 8 hours",
        quantity: 8,
        amount: 120.0,
      },
    ];

    // Generate payload
    const payload = buildInvoicePayload(invoiceData, clientData, lineItems);

    // CRITICAL: Validate exact structure
    expect(payload).toHaveProperty("DocNumber", "CLS-2025-001");
    expect(payload).toHaveProperty("TxnDate", "2025-02-12");
    expect(payload).toHaveProperty("DueDate", "2025-03-12");
    expect(payload).toHaveProperty("CustomerRef.value", "456");
    expect(payload).toHaveProperty("BillEmail.Address", "billing@client.com");
    expect(payload).toHaveProperty("BillEmailCc.Address", "manager@client.com");
    expect(payload).toHaveProperty(
      "BillEmailBcc.Address",
      "accounting@cls.com"
    );
    expect(payload).toHaveProperty("PrivateNote", "Invoice # CLS-2025-001");
    expect(payload).toHaveProperty("ShipAddr");
    expect(payload).toHaveProperty("SalesTermRef");
    expect(payload).toHaveProperty("Line");

    // CRITICAL: Validate line item structure
    expect(payload.Line[0]).toHaveProperty("DetailType", "SalesItemLineDetail");
    expect(payload.Line[0]).toHaveProperty("Amount", 120.0);
    expect(payload.Line[0]).toHaveProperty(
      "Description",
      "Warehouse Labor - 8 hours"
    );
    expect(payload.Line[0].SalesItemLineDetail).toHaveProperty(
      "ItemRef.value",
      "1"
    );
    expect(payload.Line[0].SalesItemLineDetail).toHaveProperty(
      "ServiceDate",
      "2025-02-10"
    );
    expect(payload.Line[0].SalesItemLineDetail).toHaveProperty("Qty", 8);
    expect(payload.Line[0].SalesItemLineDetail).toHaveProperty(
      "UnitPrice",
      15.0
    );
  });
});
```

#### Step 4: Deployment Checklist

Before sending ANY payload to production QBO:

- [ ] Payload builder ported character-by-character from Apps Script
- [ ] All field names match exactly (case-sensitive)
- [ ] Nesting structure matches exactly
- [ ] Data types match (string vs number, especially for IDs)
- [ ] Date formats are YYYY-MM-DD (ISO 8601)
- [ ] Currency amounts have 2 decimal places
- [ ] LineNum starts at 1 and increments sequentially
- [ ] Partner distribution logic matches exactly (1/3 calculation, account IDs)
- [ ] Empty objects (`{}`) included where Apps Script includes them
- [ ] Unit tests pass comparing new vs old payload structure
- [ ] Test payload sent to QBO sandbox and accepted
- [ ] Logged payload compared byte-by-byte with Apps Script log
- [ ] Admin manually reviewed first 5 payloads before automation

**If ANY test fails → DO NOT DEPLOY**

---

## 🎯 Best Practice Analysis

### ❌ Anti-Patterns in Current System

1. **Google Sheets as Database**

   - Problem: Not designed for transactional data
   - Impact: No referential integrity, slow queries, manual schema updates
   - Best Practice: Use PostgreSQL (Supabase) as primary database

2. **Dual System Maintenance**

   - Problem: Payroll and Invoice systems are completely separate
   - Impact: No shared data models, duplicate logic, inconsistent patterns
   - Best Practice: Unified API layer with shared schemas

3. **Manual Triggering**

   - Problem: Requires admin to trigger "Run Payroll" and invoice creation
   - Impact: Prone to human error, delays, forgotten runs
   - Best Practice: Automated scheduling with business rules

4. **Hardcoded Business Logic**

   - Problem: Partner distribution only for 2 workers, check # format hardcoded
   - Impact: Not scalable, requires code changes for new partners
   - Best Practice: Configuration-driven with database tables

5. **No Data Validation**

   - Problem: Can push incomplete data to QBO (missing QBOID, invalid dates)
   - Impact: Failed syncs, manual cleanup required
   - Best Practice: Pre-flight validation before QBO API calls

6. **Limited Error Handling**

   - Problem: Retry logic exists but no notification system
   - Impact: Silent failures, data inconsistencies
   - Best Practice: Alert notifications, error queue, manual review UI

7. **No Audit Trail**
   - Problem: Can't track which line items were included in which QBO bill/invoice
   - Impact: Difficult to reconcile, can't replay failed syncs
   - Best Practice: Store QBO IDs, sync status, timestamps per line item

---

### ✅ Best Practices for New System

#### 1. **Architecture: Supabase-First Design**

```
┌─────────────────────────────────────────────────────────────┐
│                    Supabase PostgreSQL                      │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐ │
│  │ payroll_       │  │ invoice_       │  │ qbo_sync_    │ │
│  │ line_items     │  │ line_items     │  │ log          │ │
│  │ (395 records)  │  │ (new table)    │  │ (audit)      │ │
│  └────────────────┘  └────────────────┘  └──────────────┘ │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐ │
│  │ workers        │  │ invoices       │  │ clients      │ │
│  │ (18 records)   │  │ (new table)    │  │ (new table)  │ │
│  └────────────────┘  └────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                 Node.js/React Portal API                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Unified QBO Service                                  │   │
│  │ - createPayrollBills(weekPeriod)                     │   │
│  │ - createCustomerInvoices(weekPeriod)                 │   │
│  │ - syncWorkerPayments()                               │   │
│  │ - syncClientPayments()                               │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Validation Layer                                     │   │
│  │ - validatePayrollData()                              │   │
│  │ - validateInvoiceData()                              │   │
│  │ - checkQBOIDExists()                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Error Handling & Retry                               │   │
│  │ - retryQueue (failed syncs)                          │   │
│  │ - notificationService (alerts)                       │   │
│  │ - auditLog (complete history)                        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                   QuickBooks Online API                     │
│  - Bills (Accounts Payable - Worker payments)              │
│  - Invoices (Accounts Receivable - Client billing)         │
│  - Vendors (Workers with QBOID sync)                        │
│  - Customers (Clients with QBOID sync)                      │
└─────────────────────────────────────────────────────────────┘
```

#### 2. **Database Schema: Unified Model**

**New Tables Needed**:

```sql
-- Invoice Headers
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,        -- "CLS-2025-001"
  client_id UUID REFERENCES clients(id),
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  qbo_invoice_id TEXT,                        -- QuickBooks Invoice ID
  qbo_sync_token TEXT,                        -- For updates
  qbo_synced_at TIMESTAMPTZ,
  qbo_sync_status TEXT CHECK (qbo_sync_status IN ('pending', 'synced', 'failed')),
  qbo_sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice Line Items
CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  task_id UUID,                               -- References tasks (if exists)
  service_date DATE NOT NULL,
  service_id TEXT,                            -- QBO Service Item ID
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  worker_id UUID REFERENCES workers(id),      -- Who performed the work
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients Table (if not exists)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT UNIQUE NOT NULL,             -- "CNT-001-TWG"
  client_name TEXT NOT NULL,
  qbo_customer_id TEXT,                       -- QuickBooks Customer ID
  billing_email TEXT,
  billing_email_cc TEXT,
  billing_email_bcc TEXT,
  payment_terms TEXT,                         -- Net 30, Net 60, etc.
  portal_access BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- QBO Sync Audit Log
CREATE TABLE qbo_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL,                    -- 'payroll_bill', 'customer_invoice'
  entity_type TEXT NOT NULL,                  -- 'payroll_line_items', 'invoice'
  entity_id UUID NOT NULL,                    -- References payroll or invoice id
  qbo_id TEXT,                                -- QuickBooks ID returned
  qbo_doc_number TEXT,                        -- DocNumber used
  sync_status TEXT CHECK (sync_status IN ('pending', 'success', 'failed', 'retrying')),
  sync_error TEXT,
  attempt_count INT DEFAULT 1,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns to existing payroll_line_items
ALTER TABLE payroll_line_items ADD COLUMN IF NOT EXISTS qbo_bill_id TEXT;
ALTER TABLE payroll_line_items ADD COLUMN IF NOT EXISTS qbo_synced_at TIMESTAMPTZ;
ALTER TABLE payroll_line_items ADD COLUMN IF NOT EXISTS qbo_sync_status TEXT CHECK (qbo_sync_status IN ('pending', 'synced', 'failed'));
```

**Key Principles**:

- UUID primary keys everywhere (already established)
- Foreign keys with CASCADE for referential integrity
- QBO IDs stored for bidirectional sync
- Sync status tracked per record
- Timestamps for audit trail
- Check constraints for valid values

#### 3. **Automated Scheduling: Business Rules**

**Payroll Automation**:

- **Trigger**: Every Monday at 9:00 AM (after week ends Sunday)
- **Rule**: Process payroll for previous week (last Sunday)
- **Validation**:
  - All clock-ins approved
  - No pending time edit requests
  - All workers have QBOID in Supabase
  - Check # generated and unique
- **Process**:
  1. Group payroll line items by worker + week period
  2. Calculate totals and partner distributions
  3. Validate data (QBOID exists, amounts > 0)
  4. Create QBO Bills (one per worker)
  5. Update payroll records with QBO Bill ID
  6. Generate worker PDF reports
  7. Email PDF to workers
  8. Log all operations
- **Error Handling**:
  - Failed syncs go to retry queue (3 attempts)
  - Admin notification if still failed
  - Manual review UI in React Portal

**Invoice Automation**:

- **Trigger**: On task completion + "Billable" flag = true
- **Rule**: Auto-generate invoice line items from completed tasks
- **Process**:
  1. When task marked "completed" and "Billable"
  2. Create invoice line item linked to task
  3. Group line items by client + week period
  4. Auto-create draft invoice when week ends
  5. Admin reviews and approves invoice
  6. On approval, sync to QBO
  7. Generate PDF and email to client
- **Validation**:
  - Client has QBOID
  - All line items have service_id (QBO Item)
  - Total amount matches sum of line items
  - Email addresses valid
- **Error Handling**:
  - Same retry queue as payroll
  - Admin notification for failures
  - Can manually re-trigger sync from UI

#### 4. **Configuration-Driven Logic**

**Partner Distribution Configuration**:

```sql
-- New table for flexible partner splits
CREATE TABLE partner_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(id) NOT NULL,
  distribution_type TEXT CHECK (distribution_type IN ('percentage', 'fixed')),
  percentage DECIMAL(5,2),                    -- e.g., 33.33 for 1/3
  qbo_account_id TEXT NOT NULL,               -- QBO account number
  qbo_account_name TEXT NOT NULL,             -- "Partner Distributions:Steve"
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data
INSERT INTO partner_distributions (worker_id, distribution_type, percentage, qbo_account_id, qbo_account_name)
VALUES
  ('624652a2-830c-43d5-b76a-cfeff1c8270a', 'percentage', 33.33, '148', 'Partner Distributions:Steve Distributions'),
  ('4781be7c-3930-4b54-a4be-9aaac54315bb', 'percentage', 33.33, '149', 'Partner Distributions:Daniela Distributions');
```

**QBO Configuration**:

```javascript
// config/qbo-config.js
export const QBO_CONFIG = {
  PAYROLL: {
    EXPENSE_ACCOUNT: { value: "142", name: "Subcontractor Expense" },
    AP_ACCOUNT: { value: "7", name: "Accounts Payable (A/P)" },
    DUE_DATE_OFFSET_DAYS: 5, // Bills due next Friday (5 days after Sunday)
    TAX_CODE: "NON",
  },
  INVOICES: {
    INCOME_ACCOUNT: { value: "1", name: "Services" }, // Example
    AR_ACCOUNT: { value: "2", name: "Accounts Receivable (A/R)" },
    DEFAULT_TERMS: "Net 30",
    TAX_CODE: "NON",
  },
  OAUTH: {
    TOKEN_REFRESH_BUFFER_MINUTES: 10, // Refresh 10 min before expiry
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000, // Exponential backoff base
  },
};
```

#### 5. **Validation Layer: Pre-Flight Checks**

```javascript
// services/qbo-validation.js

class QBOValidator {
  async validatePayrollData(payrollLineItems, workers) {
    const errors = [];

    for (const item of payrollLineItems) {
      // Check worker exists
      const worker = workers.find((w) => w.id === item.worker_id);
      if (!worker) {
        errors.push(`Worker not found: ${item.worker_id}`);
        continue;
      }

      // Check QBOID exists
      if (!worker.qbo_vendor_id) {
        errors.push(`Worker ${worker.display_name} missing QBO Vendor ID`);
      }

      // Check amounts
      if (item.amount <= 0) {
        errors.push(`Invalid amount for line item ${item.id}: ${item.amount}`);
      }

      // Check hours
      if (item.hours <= 0 || item.hours > 24) {
        errors.push(`Invalid hours for line item ${item.id}: ${item.hours}`);
      }

      // Check dates
      if (!item.work_date || !item.week_period) {
        errors.push(`Missing dates for line item ${item.id}`);
      }

      // Check check number format
      if (!item.check_number || !item.check_number.match(/^[A-Z]+-\d{6}$/)) {
        errors.push(`Invalid check number format: ${item.check_number}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async validateInvoiceData(invoice, lineItems, client) {
    const errors = [];

    // Check client exists
    if (!client) {
      errors.push(`Client not found: ${invoice.client_id}`);
      return { valid: false, errors };
    }

    // Check QBOID
    if (!client.qbo_customer_id) {
      errors.push(`Client ${client.client_name} missing QBO Customer ID`);
    }

    // Check line items
    if (lineItems.length === 0) {
      errors.push(`Invoice ${invoice.invoice_number} has no line items`);
    }

    // Validate totals
    const calculatedTotal = lineItems.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    if (Math.abs(calculatedTotal - invoice.total_amount) > 0.01) {
      errors.push(
        `Invoice total mismatch: ${invoice.total_amount} vs ${calculatedTotal}`
      );
    }

    // Validate dates
    if (invoice.due_date < invoice.invoice_date) {
      errors.push(`Due date before invoice date`);
    }

    // Validate email
    if (!client.billing_email || !this.isValidEmail(client.billing_email)) {
      errors.push(`Invalid billing email: ${client.billing_email}`);
    }

    return { valid: errors.length === 0, errors };
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
```

#### 6. **Error Handling: Comprehensive Strategy**

**Retry Queue Pattern**:

```javascript
// services/qbo-retry-queue.js

class QBORetryQueue {
  constructor(supabase) {
    this.supabase = supabase;
    this.maxAttempts = 3;
    this.retryDelays = [1000, 5000, 15000]; // Exponential backoff
  }

  async addToQueue(syncType, entityId, error) {
    await this.supabase.from("qbo_sync_log").insert({
      sync_type: syncType,
      entity_id: entityId,
      sync_status: "failed",
      sync_error: error.message,
      attempt_count: 1,
    });
  }

  async processRetryQueue() {
    // Fetch failed syncs with attempt_count < maxAttempts
    const { data: failedSyncs } = await this.supabase
      .from("qbo_sync_log")
      .select("*")
      .eq("sync_status", "failed")
      .lt("attempt_count", this.maxAttempts);

    for (const sync of failedSyncs) {
      const delay = this.retryDelays[sync.attempt_count - 1];
      await this.sleep(delay);

      try {
        if (sync.sync_type === "payroll_bill") {
          await this.retryPayrollBill(sync);
        } else if (sync.sync_type === "customer_invoice") {
          await this.retryCustomerInvoice(sync);
        }
      } catch (err) {
        // Update attempt count
        await this.supabase
          .from("qbo_sync_log")
          .update({
            attempt_count: sync.attempt_count + 1,
            sync_error: err.message,
            synced_at: new Date(),
          })
          .eq("id", sync.id);

        // If max attempts reached, send admin notification
        if (sync.attempt_count + 1 >= this.maxAttempts) {
          await this.notifyAdmin(sync, err);
        }
      }
    }
  }

  async notifyAdmin(sync, error) {
    // Send email/Slack notification to admin
    console.error(`QBO Sync Failed After ${sync.attempt_count} Attempts:`, {
      syncType: sync.sync_type,
      entityId: sync.entity_id,
      error: error.message,
    });

    // TODO: Implement email/Slack notification
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

**Manual Review UI**:

```javascript
// React Portal component: FailedSyncsPanel.jsx

function FailedSyncsPanel() {
  const [failedSyncs, setFailedSyncs] = useState([]);

  useEffect(() => {
    loadFailedSyncs();
  }, []);

  async function loadFailedSyncs() {
    const { data } = await supabase
      .from("qbo_sync_log")
      .select("*")
      .eq("sync_status", "failed")
      .gte("attempt_count", 3)
      .order("synced_at", { ascending: false });

    setFailedSyncs(data);
  }

  async function retrySync(syncId) {
    // Reset attempt count and retry manually
    await supabase
      .from("qbo_sync_log")
      .update({
        sync_status: "pending",
        attempt_count: 0,
      })
      .eq("id", syncId);

    // Trigger retry
    await fetch("/api/qbo/retry", {
      method: "POST",
      body: JSON.stringify({ syncId }),
    });

    loadFailedSyncs();
  }

  return (
    <div className="failed-syncs-panel">
      <h2>Failed QBO Syncs</h2>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Entity ID</th>
            <th>Error</th>
            <th>Attempts</th>
            <th>Last Attempt</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {failedSyncs.map((sync) => (
            <tr key={sync.id}>
              <td>{sync.sync_type}</td>
              <td>{sync.entity_id}</td>
              <td>{sync.sync_error}</td>
              <td>{sync.attempt_count}</td>
              <td>{new Date(sync.synced_at).toLocaleString()}</td>
              <td>
                <button onClick={() => retrySync(sync.id)}>Retry</button>
                <button onClick={() => viewDetails(sync.id)}>Details</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 🚀 Implementation Plan

### Phase 6: Invoice Schema Migration (NEW)

**Goal**: Create invoice and client tables in Supabase

**Tasks**:

1. Create Migration 009: Invoices and Clients tables
2. Add invoice_line_items table
3. Add qbo_sync_log table
4. Export invoice data from Google Sheets
5. Import invoices and line items to Supabase
6. Add indexes and RLS policies

**Deliverables**:

- `sql/migrations/009-create-invoice-tables.sql`
- `scripts/migration/fetch-invoices.js`
- `scripts/migration/import-invoices.js`
- ~350+ invoice line item records migrated

---

### Phase 7: QBO Integration API (NEW)

**Goal**: Build unified QBO service layer in React Portal

⚠️ **CRITICAL REQUIREMENT**: **PRESERVE EXISTING QBO PAYLOADS EXACTLY**

Your current payloads in `PayrollController.js` and `QBO_API.js` represent **hours of testing and debugging**. The new system MUST:

- **Reuse exact payload structure** from working Apps Script code
- **Only change data source** (Google Sheets → Supabase queries)
- **Preserve all field names, nesting, and data types**
- **Keep existing validation logic** for amounts, dates, and references
- **Maintain partner distribution calculation** (1/3 share logic)
- **Test against QBO sandbox** before touching production

**Migration Strategy**:

1. **Copy, don't rewrite** - Port working payload builders from Apps Script
2. **Data mapping only** - Change only how we fetch data, not how we format it
3. **Side-by-side validation** - Compare new payloads byte-by-byte with old
4. **Incremental deployment** - Test one Bill/Invoice before bulk processing

**Tasks**:

1. Create `services/qbo-service.js` with OAuth2
2. **PORT (not rewrite)** `buildBillPayloads()` from PayrollController.js
3. **PORT (not rewrite)** `buildInvoicePayload()` from QBO_API.js
4. Add validation layer (pre-existing logic only)
5. Add retry queue logic (preserve existing retry patterns)
6. Create admin UI for failed syncs
7. Add partner distribution configuration (preserve calculation logic)

**Deliverables**:

- `react-portal/src/services/qbo-service.js` (with ported payload builders)
- `react-portal/src/services/qbo-payloads.js` (**EXACT COPY** of working payload logic)
- `react-portal/src/services/qbo-validation.js`
- `react-portal/src/services/qbo-retry-queue.js`
- `react-portal/src/components/admin/QBOSyncPanel.jsx`
- `react-portal/src/components/admin/FailedSyncsPanel.jsx`
- `tests/qbo-payload-comparison.test.js` (validates payloads match exactly)

**Testing Protocol**:

1. **Unit tests**: Generate payloads with same input data, compare JSON output
2. **Integration tests**: Send test Bill/Invoice to QBO sandbox, verify acceptance
3. **Payload logging**: Log every payload before sending, compare with Apps Script logs
4. **Manual review**: Admin approves first 5 Bills/Invoices before automation

**Technology Stack**:

- Node.js backend for OAuth2 token management
- Supabase Edge Functions for scheduled jobs (alternative to cron)
- React Portal UI for manual triggers and review
- **Apps Script as reference** - Keep running parallel for first month

---

### Phase 8: Automated Scheduling (NEW)

**Goal**: Set up automated payroll and invoice generation

**Tasks**:

1. Create Supabase Edge Function for weekly payroll
2. Create Supabase Edge Function for invoice generation
3. Set up cron schedules (pg_cron or external service)
4. Add email notification system
5. Create worker PDF reports
6. Implement admin alerts for failures

**Deliverables**:

- `supabase/functions/run-payroll/index.ts`
- `supabase/functions/generate-invoices/index.ts`
- `supabase/functions/process-retry-queue/index.ts`
- Cron configuration (Supabase Dashboard or external)

---

### Phase 9: Parallel Operation & Validation (UPDATED)

**Goal**: Run both systems side-by-side for validation period

⚠️ **CRITICAL**: Do NOT deprecate Apps Script until proven identical results

**Tasks**:

1. **Week 1-2**: Run both systems, compare QBO results
   - Apps Script creates Bills (production)
   - New system creates Bills (QBO sandbox)
   - Manual comparison of Bill IDs, amounts, line items
2. **Week 3-4**: Switch to new system primary, Apps Script backup
   - New system creates Bills (production)
   - Apps Script runs but doesn't submit (logs only)
   - Compare logs to verify identical payloads
3. **Month 2**: New system only, Apps Script on standby
   - Monitor for any QBO sync failures
   - Apps Script code remains deployable
   - Can revert if issues found
4. **Month 3+**: Full deprecation (only if 100% success rate)
   - Disable GoogleAppsScripts webhooks
   - Archive old Google Sheets data
   - Document lessons learned

**Rollback Plan**:

- If QBO rejects new payloads → Revert to Apps Script immediately
- If sync failures exceed 5% → Pause new system, debug
- Keep Apps Script deployment ID active for 6 months minimum

**Success Criteria for Deprecation**:

- ✅ 100 consecutive successful Bills with no rejections
- ✅ Zero payload-related errors for 30 days
- ✅ All Bills match Apps Script output exactly
- ✅ Admin confidence in new system (manual approval)

---

## 📋 Decision Points

### Critical Questions to Answer:

1. **Migration Timing**: When do you want to start migrating invoices?

   - Option A: Now (Phase 6 immediately after payroll complete)
   - Option B: After testing payroll QBO sync thoroughly
   - **Recommendation**: Option B - validate payroll integration first

2. **QBO OAuth Location**: Where should OAuth tokens be stored?

   - Option A: Supabase (encrypted columns in config table)
   - Option B: Environment variables (server-side only)
   - Option C: Google Secret Manager
   - **Recommendation**: Option A for simplicity, Option C for production security

3. **Scheduling Method**: How to trigger automated runs?

   - Option A: Supabase pg_cron (built-in PostgreSQL)
   - Option B: External cron service (Vercel Cron, GitHub Actions)
   - Option C: Node.js cron jobs in React Portal server
   - **Recommendation**: Option A (pg_cron) - simplest, no external dependencies

4. **Legacy Apps Script**: Keep or deprecate?

   - Option A: Full deprecation after migration complete
   - Option B: Keep as backup for 6 months
   - **Recommendation**: Option B - run parallel for validation period

5. **Error Notification**: How to alert admins?
   - Option A: Email only
   - Option B: In-app notifications (React Portal)
   - Option C: Slack integration
   - **Recommendation**: Option A + B (email + in-app), Option C nice-to-have

---

## 📊 Success Metrics

**Automation Rate**:

- Target: 95% of payroll runs fully automated (no manual intervention)
- Target: 90% of invoices auto-generated from completed tasks

**Error Rate**:

- Target: <5% QBO sync failures
- Target: 100% of failures resolved within 24 hours

**Time Savings**:

- Current: ~2 hours/week manual payroll + invoice processing
- Target: <15 minutes/week for review and approval

**Data Integrity**:

- Target: 100% of QBO records traceable to Supabase records
- Target: Zero duplicate bills/invoices in QBO

---

## 🔄 Next Steps

1. **Review this document** - Confirm architecture and approach
2. **Answer decision points** - Choose options for each question
3. **Prioritize phases** - Decide order of implementation
4. **Start Phase 6** - Create invoice tables and migrate data
5. **Build QBO service** - Unified API for payroll + invoices

**Estimated Timeline**:

- Phase 6 (Invoice Migration): 1-2 days
- Phase 7 (QBO Integration): 2-3 days
- Phase 8 (Automation): 1-2 days
- Phase 9 (Deprecation): 1 day
- **Total**: ~1-2 weeks for complete automation

---

## 📝 Notes

- All code examples follow established UUID architecture from Phases 1-5
- Supabase RLS policies assumed for security (workers see own data, admins see all)
- React Portal UI components integrate with existing dashboard
- OAuth2 token refresh handled automatically (existing pattern from Apps Script)
- Partner distributions configurable via database (no hardcoded logic)

**Ready to proceed?** Let me know which decision points you'd like to discuss first, or if you're ready to start Phase 6 (Invoice Migration).
