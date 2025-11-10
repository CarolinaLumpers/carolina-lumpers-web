# TimeEditRequests Sheet Setup Guide

## Problem
If the Time Edit Requests feature shows "undefined" values, the Google Sheets `TimeEditRequests` sheet either:
1. Doesn't exist yet
2. Has incorrect column headers
3. Has columns in the wrong order

## Solution: Manual Sheet Setup

### Step 1: Open Your Google Sheet
Open the Carolina Lumpers Service spreadsheet:
`https://docs.google.com/spreadsheets/d/1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk/edit`

### Step 2: Check for TimeEditRequests Sheet
Look at the tabs at the bottom. If you see a sheet named **TimeEditRequests**, click on it.

### Step 3: Verify Column Headers
The **first row** must have these exact column names (case-sensitive):

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| RequestID | EmployeeID | RecordID | OriginalTime | RequestedTime | RequestedDateTime | Reason | Status | SubmittedAt | ReviewedAt |

### Step 4: If Sheet Doesn't Exist - Create It
1. Click the **+** button at the bottom left to create a new sheet
2. Right-click the new sheet tab → Rename → Enter: `TimeEditRequests`
3. In row 1, columns A-J, enter the headers exactly as shown above
4. **Make row 1 bold** (select row 1 → Ctrl+B or Format → Bold)

### Step 5: If Sheet Exists But Headers Are Wrong
1. **Delete all data** from the sheet (or rename the old sheet to `TimeEditRequests_OLD`)
2. Create a new `TimeEditRequests` sheet
3. Add the headers as shown in Step 4

### Step 6: Auto-Creation Option
Alternatively, you can trigger auto-creation by:
1. Submitting a test time edit request from the employee dashboard
2. The backend code will automatically create the sheet with correct headers

## Column Definitions

| Column | Description | Example |
|--------|-------------|---------|
| **RequestID** | Unique identifier (auto-generated) | `EDIT-A3B2C1D4` |
| **EmployeeID** | Worker ID submitting the request | `CLS001` |
| **RecordID** | ClockinID being edited | `CLK-12345678` |
| **OriginalTime** | Current time in the ClockIn record | `08:15:00 AM` |
| **RequestedTime** | New time requested by worker | `08:00:00 AM` |
| **RequestedDateTime** | Full date/time requested | `10/16/2025 08:00:00 AM` |
| **Reason** | Worker's explanation | `Forgot to clock in on time` |
| **Status** | Current status | `pending`, `approved`, `denied: <reason>` |
| **SubmittedAt** | When request was submitted | `2025-10-16T14:30:00.000Z` |
| **ReviewedAt** | When admin reviewed | `2025-10-16T15:00:00.000Z` (or blank) |

## Testing

After setting up the sheet:

1. **Login as admin** to the employee dashboard
2. Navigate to **Admin Tools** tab
3. Click **Load Pending Requests**
4. You should see either:
   - ✅ "No pending time edit requests found" (if no requests exist)
   - ✅ A table with proper data (if requests exist)
   - ❌ An error message with details if something is still wrong

## Troubleshooting

### Still seeing "undefined" values?
1. Check that column names are **exactly** as shown (case-sensitive, no extra spaces)
2. Ensure headers are in **row 1**
3. Verify sheet name is exactly `TimeEditRequests` (no spaces, no typos)
4. Check browser console for error messages (F12 → Console tab)

### Backend auto-creation not working?
The sheet should auto-create when a worker submits a time edit request. If it doesn't:
1. Check backend logs in Google Apps Script (View → Logs)
2. Verify the `SHEET_ID` in `CLS_EmployeeLogin_Config.js` is correct
3. Ensure the script has permission to modify the spreadsheet

## Related Files

- **Backend Logic**: `GoogleAppsScripts/EmployeeLogin/CLS_EmployeeLogin_ClockIn.js`
  - `handleTimeEditRequest_()` - Creates sheet and records
  - `getTimeEditRequests_()` - Reads and returns data
  - `handleApproveTimeEdit_()` - Approves requests
  - `handleDenyTimeEdit_()` - Denies requests

- **Frontend UI**: `carolina-lumpers-web/employeeDashboard.html`
  - `loadTimeEditRequests()` - Displays data in admin tab
  - `approveTimeEditRequest()` - Admin approval action
  - `denyTimeEditRequest()` - Admin denial action

## Quick Fix Script (Apps Script Console)

If you want to manually create the sheet via Apps Script:

```javascript
function createTimeEditRequestsSheet() {
  const SHEET_ID = '1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk';
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  // Delete old sheet if exists
  const oldSheet = ss.getSheetByName('TimeEditRequests');
  if (oldSheet) {
    ss.deleteSheet(oldSheet);
  }
  
  // Create new sheet
  const editSheet = ss.insertSheet('TimeEditRequests');
  editSheet.getRange(1, 1, 1, 10).setValues([[
    'RequestID', 'EmployeeID', 'RecordID', 'OriginalTime', 
    'RequestedTime', 'RequestedDateTime', 'Reason', 'Status', 
    'SubmittedAt', 'ReviewedAt'
  ]]);
  editSheet.getRange(1, 1, 1, 10).setFontWeight('bold');
  
  Logger.log('✅ TimeEditRequests sheet created successfully');
}
```

Run this function from the Apps Script editor (Extensions → Apps Script → Run → createTimeEditRequestsSheet).
