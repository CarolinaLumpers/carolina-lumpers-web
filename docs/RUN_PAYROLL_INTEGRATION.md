# Run Payroll Integration - Setup Guide

## Overview

The **Run Payroll** feature allows admins to process weekly payroll directly from the Employee Dashboard. It triggers the PayrollProject Google Apps Script, which creates bills in QuickBooks Online for all workers based on their approved time tracking records.

## Architecture

```
Frontend (employeeDashboard.html)
    ↓ POST request with JSON payload
Cloudflare Worker (payroll-proxy.s-garay.workers.dev)
    ↓ forwards with CORS headers
Google Apps Script Web App
(https://script.google.com/macros/s/AKfycbws-MdQRQ-ZiQ6TwtsfVtwTGOqovfW1S_86GbmCKropbUYIY0ZNcPJiJzlXS5N0Fs4jVg/exec)
    ↓ calls PayrollProject functions
QuickBooks Online API
    ↓ creates/updates Bills for workers
Workers paid via check/direct deposit
```

## Setup Steps

### 1. Deploy Cloudflare Worker

1. Go to Cloudflare Dashboard → Workers & Pages
2. Click "Create" → "Create Worker"
3. Name it: `payroll-proxy`
4. Copy code from: `cloudflare-workers/payroll-proxy.js`
5. Paste into worker editor
6. Click "Save and Deploy"
7. Note the URL: `https://payroll-proxy.s-garay.workers.dev`

### 2. Verify PayrollProject Deployment

1. Open Google Apps Script: https://script.google.com
2. Find **PayrollProject** in your projects
3. Ensure `doPost()` function exists in `WebhookHandler.js`
4. Verify web app is deployed:
   - Click "Deploy" → "Manage deployments"
   - Should see active deployment with URL ending in `...S5N0Fs4jVg/exec`
   - If not, click "New deployment":
     - Type: Web app
     - Execute as: Me (your email)
     - Who has access: Anyone
     - Click "Deploy"

### 3. Test the Integration

1. Login to dashboard as Admin
2. Navigate to **Admin Tools** tab
3. Find **Run Payroll** section
4. Week Period dropdown should auto-populate with available weeks
5. Select a week (e.g., "2024-01-20 (Current)")
6. Click **Run Payroll** button
7. Confirm the warning dialog
8. Wait 10-30 seconds for processing
9. Check results:
   - ✅ Success: "Payroll processed successfully..."
   - ❌ Error: Check console for details

### 4. Verify in QuickBooks

1. Login to QuickBooks Online
2. Go to **Expenses** → **Bills**
3. Search for bills with:
   - Check Number matching the week (e.g., "CLS-2024-01-20")
   - Vendor names matching worker names
4. Verify bill details:
   - Line items show date, task, and amount
   - Total amount matches expected payroll
   - Due date is next Friday after week period

## Usage

### Admin Workflow

1. **Review Time Tracking**
   - Check that all clock-in records for the week are approved
   - Verify any time edit requests have been processed
   - Confirm workers have correct rates in Workers sheet

2. **Run Payroll**
   - Select the week period (Saturday date)
   - Click "Run Payroll"
   - Confirm the action (cannot be undone)
   - Wait for completion message

3. **Review Bills in QuickBooks**
   - Check all workers have bills created
   - Verify amounts match expected totals
   - Process payments (check/ACH) in QuickBooks

4. **Distribute Payments**
   - Print checks or initiate ACH transfers
   - Workers receive payment on Friday (payday)

## Week Period Format

Week periods are identified by the **Saturday date** in `yyyy-MM-dd` format:
- Example: `2024-01-20` = Week ending Saturday, January 20, 2024
- Includes: Sunday 1/14 through Saturday 1/20
- Payday: Friday 1/26 (following Friday)

## Payload Structure

```json
{
  "Webhook Type": "Run Payroll",
  "Week Period": "2024-01-20"
}
```

## API Endpoints

**Production:**
- Frontend: `https://carolinalumpers.com/employeeDashboard.html`
- Proxy: `https://payroll-proxy.s-garay.workers.dev`
- Apps Script: `https://script.google.com/macros/s/AKfycbws-MdQRQ-ZiQ6TwtsfVtwTGOqovfW1S_86GbmCKropbUYIY0ZNcPJiJzlXS5N0Fs4jVg/exec`

**Development:**
- Frontend: `https://carolinalumpers.com/employeeDashboard-dev.html`
- Same proxy and Apps Script (no separate dev endpoints)

## QuickBooks Bill Structure

Each worker gets **one bill per week** with:
- **Vendor**: Worker's QBO Vendor (matched by QBOID in Workers sheet)
- **DocNumber**: Week period (e.g., "CLS-2024-01-20")
- **TxnDate**: Saturday date (week ending)
- **DueDate**: Following Friday (payday)
- **Line Items**:
  - One per work session (date + task + amount)
  - Sorted by date (oldest first)
  - Account: "Subcontractor Expense" (142)
  - TaxCode: "NON" (non-taxable)
- **Special Line Items** (if applicable):
  - Partner distributions (Steve/Daniela 1/3 share of net income)
  - Account: "Partner Distributions:Steve/Daniela" (148/149)

## Error Handling

### Common Errors

**"No payroll line items found"**
- Cause: No approved time tracking records for the week
- Fix: Approve clock-in records in Admin Reports

**"QBO Vendor ID missing for Worker ID"**
- Cause: Worker not synced to QuickBooks as Vendor
- Fix: Run VendorSync first (QuickBooks Sync section)

**"Failed to create bill"**
- Cause: QuickBooks API error (duplicate, validation, etc.)
- Fix: Check QuickBooks for existing bill, manually delete if duplicate

**"Proxy error"**
- Cause: Cloudflare Worker not deployed or misconfigured
- Fix: Verify worker URL matches dashboard code

**"Authorization error"**
- Cause: PayrollProject OAuth2 token expired
- Fix: Re-authenticate PayrollProject with QuickBooks (run `initiateOAuth()`)

### Debugging Steps

1. **Check Browser Console**
   ```javascript
   // Look for these logs:
   🔄 Triggering Run Payroll: {...}
   📥 Payroll response: {...}
   ```

2. **Check Apps Script Logs**
   - Open PayrollProject in Apps Script
   - View → Executions
   - Check recent `doPost` executions
   - Look for errors or incomplete runs

3. **Check Activity_Logs Sheet**
   - Look for "Webhook Received" events
   - Verify payload has correct "Webhook Type" and "Week Period"
   - Check for error messages

4. **Test Directly**
   ```bash
   curl -X POST https://payroll-proxy.s-garay.workers.dev \
     -H "Content-Type: application/json" \
     -d '{"Webhook Type":"Run Payroll","Week Period":"2024-01-20"}'
   ```

## Security

- **Authentication**: Only users with `App Access = "Admin"` role can see Run Payroll UI
- **Confirmation**: Double confirmation dialog before running (cannot undo)
- **Audit Trail**: All payroll runs logged in Activity_Logs sheet with timestamp
- **Rate Limiting**: Cloudflare Worker has built-in DDoS protection
- **OAuth2**: PayrollProject uses OAuth2 for secure QuickBooks API access

## Data Sources

1. **Workers Sheet** (QBOID column)
   - Maps WorkerID to QuickBooks Vendor ID
   - Must run VendorSync first if new workers

2. **Payroll LineItems Sheet**
   - Contains all work sessions with amounts
   - Filtered by Week Period
   - Grouped by WorkerID for bill creation

3. **WeeklyFinancials Sheet** (optional)
   - Net Income per week
   - Used for partner distribution calculations
   - Only applies to Steve (SG-001) and Daniela (DMR-002)

## Troubleshooting

### Week Period Dropdown Empty

**Symptom**: Dropdown shows "No payroll periods found"

**Causes**:
- No data in Payroll LineItems sheet
- Backend `payrollWeekPeriods` action not returning data
- API connectivity issue

**Fix**:
1. Check Payroll LineItems sheet has records
2. Test API call: `https://cls-proxy.s-garay.workers.dev/?action=payrollWeekPeriods&workerId=ADMIN_ID`
3. Verify EmployeeLogin project has `payrollWeekPeriods` action

### Bills Not Appearing in QuickBooks

**Symptom**: Success message shown but no bills in QuickBooks

**Causes**:
- QuickBooks OAuth2 token expired
- Worker missing QBOID in Workers sheet
- API rate limit exceeded

**Fix**:
1. Check Apps Script execution logs for API errors
2. Verify QBOID column populated for all workers
3. Re-authenticate OAuth2: Run `initiateOAuth()` in PayrollProject
4. Wait 1 hour if rate limit hit (500 requests/minute)

### Duplicate Bills Created

**Symptom**: Multiple bills for same worker/week

**Causes**:
- Button clicked multiple times
- Script didn't find existing bill (search failed)

**Fix**:
1. Delete duplicate bills manually in QuickBooks
2. Re-run payroll if needed (will update existing bills via SyncToken)

## Related Documentation

- VendorSync Integration: `VendorSync/README.md`
- PayrollProject: `GoogleAppsScripts/PayrollProject/README.md`
- Employee Dashboard: `carolina-lumpers-web/README.md`
- Cloudflare Workers: `cloudflare-workers/README.md`

## Support

For issues with:
- **Frontend UI**: Check `employeeDashboard.html` triggerRunPayroll() function
- **Cloudflare Worker**: Check `payroll-proxy.s-garay.workers.dev` logs
- **PayrollProject**: Check Apps Script execution logs
- **QuickBooks**: Check QBO Bill creation permissions and OAuth2 status
