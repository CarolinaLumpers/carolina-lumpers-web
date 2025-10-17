# NFC Clock-In Integration: ClockinFlow ↔ AppSheet Bots

**Last Updated**: October 17, 2025  
**Systems**: ClockinFlow (Google Apps Script) + AppSheet Automation Bots

---

## System Overview

Carolina Lumpers operates **two parallel clock-in systems** that write to the same **ClockIn** sheet:

1. **GPS-Based Clock-In** (EmployeeLogin) - Web app with geofencing
   - Frontend: `employeeDashboard.html`
   - Backend: `GoogleAppsScripts/EmployeeLogin/`
   - Uses: GPS coordinates, device detection, distance validation

2. **NFC-Based Clock-In** (ClockinFlow) - Physical NFC tags/QR codes
   - Frontend: NFC reader hardware or QR scanner
   - Backend: `GoogleAppsScripts/ClockinFlow/`
   - Uses: Worker ID scans, no GPS required

Both systems write to the same **ClockIn** sheet in `CLS_Hub_Backend`, and AppSheet bots orchestrate the downstream processing.

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          NFC CLOCK-IN FLOW                          │
└─────────────────────────────────────────────────────────────────────┘

1️⃣  NFC Tag/QR Scan → ClockinFlow Web App
    URL: ?action=clockin&workerId=CLS001

2️⃣  ClockinFlow.js (doGet → handleClockIn)
    ├─ Validates worker (Workers sheet)
    ├─ Checks work hours (7am-midnight)
    ├─ Prevents duplicate scans (< 20 min)
    ├─ Generates ClockInID (CLK-123456)
    └─ Writes to ClockIn sheet:
        [ClockinID, WorkerID, Date, Time, Notes, TaskID, Approve, Lat, Lng, NeedsProcessing, ...]
         CLK-123456  CLS001  10/17  14:30   ""      ""      ""      ""   ""         TRUE

3️⃣  ClockIn Sheet (Row Added)
    Column J: Needs Processing = TRUE  ← ⚠️ TRIGGER FLAG

4️⃣  AppSheet Bot: "Process NFC Entries" (Hourly at :20)
    ├─ Filter: [Needs Processing] = TRUE
    ├─ For Each Row:
    │   ├─ Step 1: Set TaskID (Query Tasks table)
    │   │   └─ Finds matching task: WorkerID + Date
    │   ├─ Step 2: Update Clock-in Times (Run action on Tasks)
    │   │   └─ Calls "Update Clock Times" action
    │   └─ Step 3: Set Needs Processing = FALSE
    └─ Result: Clock-in linked to task, times updated

5️⃣  Tasks Sheet (Updated)
    TaskID gets Start Time, End Time, Break from ClockIn entries
```

---

## ClockinFlow Backend Details

### File Structure
```
ClockinFlow/
├── 0_doGet.js              ← Entry point routing (commented out)
├── 1_Clock-InHandler.js    ← handleClockIn logic (commented out)
├── 2_WorkerValidation.js   ← Worker ID validation
├── 3_Clock-InLogic.js      ← logClockIn, restrictions
├── 4_ReportGeneration.js   ← HTML report display
├── 5_Utilities.js          ← Time formatting, helpers
├── 6_Config.js             ← CONFIG object (columns, settings)
├── ClockinFlow.js          ← ✅ ACTIVE MAIN FILE (v2.1)
├── BatchClockin.js         ← Batch clock-in handler (doPost)
└── ClockInReport.html      ← Report template
```

**Active Implementation**: `ClockinFlow.js` (v2.1 - Optimized Version)

### Key Functions (ClockinFlow.js)

#### doGet(e) - Entry Point
```javascript
// Routes: ?action=clockin OR ?action=report
// Returns: HtmlService output (clock-in report)
```

#### handleClockIn(e) - Main Handler
```javascript
1. validateWorkerId(e)              // Check Workers sheet
2. acquireWorkerLock(workerId)      // Prevent concurrent submissions
3. validateClockInRestrictions()    // Work hours + duplicate check
4. logClockIn(workerId, timestamp)  // Write to ClockIn sheet
5. releaseWorkerLock(workerId)
6. Return HTML report with history
```

#### logClockIn(workerId, clockInTimestamp)
**Critical**: This writes the row that triggers AppSheet processing
```javascript
const row = [
  newClockInId,  // A: ClockinID (CLK-123456)
  workerId,      // B: WorkerID (CLS001)
  date,          // C: Date (10/17/2025)
  time,          // D: Time (14:30:00)
  '',            // E: Notes (empty)
  '',            // F: TaskID (empty until AppSheet sets it)
  '',            // G: Approve to Tasks (empty)
  '',            // H: Latitude (empty - no GPS for NFC)
  ''             // I: Longitude (empty - no GPS for NFC)
];
// ⚠️ Column J (Needs Processing) is handled by sheet formula or default
```

### Configuration (6_Config.js)

```javascript
const CONFIG = {
  SHEET_NAMES: {
    CLOCK_IN: "ClockIn",
    WORKERS: "Workers",
    TASKS: "Tasks",
    LOG: "Log"
  },
  COLUMNS: {
    CLOCK_IN: {
      INDICES: {
        CLOCK_IN_ID: 1,    // Column A
        WORKER_ID: 2,      // Column B
        DATE: 3,           // Column C
        TIME: 4,           // Column D
        NOTES: 5,          // Column E
        TASK_ID: 6,        // Column F
        APPROVE: 7,        // Column G
        LAST_UPDATED: 9    // Column I
      }
    }
  },
  TIME_SETTINGS: {
    WORK_HOURS: { START: 7, END: 24 },  // 7am - midnight
    DUPLICATE_SCAN_RESTRICTION_MINUTES: 20
  },
  APPSHEET: {
    API_KEY: 'V2-ZHKXU-KgQG7-2R2G9-sqDXc-lylt9-QGkjy-hQnBI-NHY4x',
    APP_ID: '4a5b8255-5ee1-4473-bc44-090ac907035b',
    TABLE_NAME: 'Tasks'
  }
};
```

**Note**: AppSheet API config is for `BatchClockin.js` to create/update Tasks directly.

---

## AppSheet Bot Processing

### Bot: "Process NFC Entries"

**Schedule**: Hourly at minute 20  
**Timezone**: (GMT-04:00) US Eastern Standard Time  
**Table**: ClockIn  
**Filter**: `[Needs Processing] = true`

#### Step 1: Set TaskID
**Action**: Run data action - Sets column values  
**Logic**: Query the Tasks table to find a matching task

```appsheet
TaskID = ANY(
  SELECT(
    Tasks[TaskID],
    AND(
      IN([_THISROW].[WorkerID], [Worker]),
      [Date] = [_THISROW].[Date]
    )
  )
)
```

**What it does**:
- Searches Tasks table for a row where:
  - Worker column contains this WorkerID
  - Date matches this clock-in Date
- Returns the TaskID to link the clock-in entry

**Example**:
```
ClockIn Row: WorkerID=CLS001, Date=10/17/2025
Tasks Row:   TaskID=BATCHTASK-251017-A1B2, Worker=CLS001, Date=10/17/2025
Result:      ClockIn.TaskID = "BATCHTASK-251017-A1B2"
```

#### Step 2: Update Clock-in Times
**Action**: Run action on rows  
**Referenced Table**: Tasks  
**Referenced Action**: "Update Clock Times"

**Query** (determines which Task rows to update):
```appsheet
SELECT( Tasks[TaskID], 
  AND( 
    IN([_THISROW].[WorkerID], [Worker]), 
    [Date] = [_THISROW].[Date] 
  )
)
```

**What it does**:
- Finds the Task row(s) that match this WorkerID + Date
- Runs "Update Clock Times" action on those Task rows
- That action queries ClockIn to set Start Time, End Time, Break

#### Step 3: Needs Process set to FALSE
**Action**: Run data action - Sets column values  
**Logic**: Simple flag reset

```appsheet
[Needs Processing] = FALSE
```

**What it does**:
- Marks this clock-in entry as processed
- Prevents the bot from processing it again next hour

---

## Integration with "Update Clock Times" Action

The "Update Clock Times" action (defined on Tasks table) is called by Step 2:

### Action: Update Clock Times (Tasks table)
**For a record of**: Tasks  
**Set these columns**:

#### Start Time
```appsheet
ANY(
  SELECT(
    ClockIn[Time], 
    AND(
      IN([WorkerID], [_THISROW].[Worker]), 
      [Date] = [_THISROW].[Date], 
      [ClockInType] = "Shift-Start"
    )
  )
)
```

#### End Time
```appsheet
ANY(
  SELECT(
    ClockIn[Time], 
    AND(
      IN([WorkerID], [_THISROW].[Worker]), 
      [Date] = [_THISROW].[Date], 
      [ClockInType] = "Shift-End"
    )
  )
)
```

#### Break (Minutes)
```appsheet
MAX(
  SELECT(
    ClockIn[BreakDuration], 
    AND(
      IN([WorkerID], [_THISROW].[Worker]), 
      [Date] = [_THISROW].[Date]
    )
  )
)
```

**⚠️ Note**: These queries reference `ClockInType` and `BreakDuration` columns that are **not currently written by ClockinFlow**. This may indicate:
1. Manual entry required by admins after NFC clock-in
2. Additional columns filled by AppSheet UI
3. Different NFC workflow not documented in ClockinFlow code

---

## Batch Clock-In Integration (BatchClockin.js)

ClockinFlow also includes a **batch clock-in handler** that creates Tasks directly via AppSheet API.

### doPost(e) - Batch Handler
**Endpoint**: POST to ClockinFlow web app  
**Payload**:
```json
{
  "batchClockInID": "BATCH-123",
  "date": "10/17/2025",
  "startTime": "08:00",
  "endTime": "16:00",
  "lunch": true,
  "names": "John Doe, Jane Smith"
}
```

### Process Flow
```
1. Parse batch data from POST request
2. Query Tasks sheet for existing tasks with same batchClockInID
3. For each worker:
   ├─ If task exists → Update via AppSheet API (Edit action)
   └─ If no task → Create via AppSheet API (Add action)
4. Delete tasks for workers no longer in batch
5. Return success/error response
```

### AppSheet API Call
```javascript
POST https://api.appsheet.com/api/v2/apps/{appId}/tables/Tasks/Action

Headers:
  ApplicationAccessKey: {apiKey}
  Content-Type: application/json

Payload:
{
  "Action": "Add" | "Edit" | "Delete",
  "Properties": {
    "Locale": "en-US",
    "Timezone": "America/New_York"
  },
  "Rows": [
    {
      "TaskID": "BATCHTASK-251017-A1B2",
      "Worker": "CLS001",
      "Date": "10/17/2025",
      "Start Time": "08:00",
      "End Time": "16:00",
      "Break (Minutes)": 30,
      "BatchClockinID": "BATCH-123"
    }
  ]
}
```

**Result**: Tasks created/updated directly, bypassing ClockIn sheet

---

## Timing Coordination

```
:00 - Every hour starts
:15 - Bot "Auto-Create Daily NFC Tasks" runs
      (Creates tasks for Shift-Start clock-ins from today)
:20 - Bot "Process NFC Entries" runs
      (Links unprocessed clock-ins to existing tasks)
:XX - Worker scans NFC tag (any time)
      (ClockinFlow writes to ClockIn with Needs Processing = TRUE)
```

**Key Insight**: The 5-minute gap between bot runs allows:
1. Shift-Start clock-ins to create tasks first (:15)
2. Subsequent clock-ins to link to those tasks (:20)

---

## ClockIn Sheet Structure

| Column | Header | Populated By | When |
|--------|--------|--------------|------|
| A | ClockinID | ClockinFlow | On scan |
| B | WorkerID | ClockinFlow | On scan |
| C | Date | ClockinFlow | On scan |
| D | Time | ClockinFlow | On scan |
| E | Notes | ClockinFlow (empty) | On scan |
| F | TaskID | AppSheet Bot | Step 1 (:20) |
| G | Approve to Tasks | Manual/AppSheet | Admin action |
| H | Latitude | ClockinFlow (empty for NFC) | N/A |
| I | Longitude | ClockinFlow (empty for NFC) | N/A |
| J | Needs Processing | Sheet formula/default? | On row add |
| K | Nearest Client | EmployeeLogin only | GPS clock-in |
| L | Distance (mi) | EmployeeLogin only | GPS clock-in |

**Missing Columns** (referenced by AppSheet but not in schema):
- `ClockInType` ("Shift-Start" | "Shift-End") - Not written by ClockinFlow
- `BreakDuration` (minutes) - Not written by ClockinFlow

---

## Key Differences: GPS vs NFC Clock-In

| Feature | GPS Clock-In (EmployeeLogin) | NFC Clock-In (ClockinFlow) |
|---------|------------------------------|----------------------------|
| **Frontend** | employeeDashboard.html | NFC reader hardware |
| **Trigger** | Manual button tap | Physical tag scan |
| **Location** | GPS coordinates | None (empty Lat/Lng) |
| **Geofencing** | Yes (0.3 mi radius) | No |
| **Device Info** | Yes (via getDeviceInfo()) | No |
| **Validation** | Distance + work hours | Work hours only |
| **TaskID** | Can set immediately | Set by bot later |
| **Approve Flow** | Can approve to Tasks | Set Needs Processing |
| **Nearest Client** | Auto-calculated | Not calculated |
| **Processing** | Immediate (API call) | Deferred (hourly bot) |

---

## Common Workflows

### Workflow 1: Standard NFC Clock-In
```
Worker scans NFC tag → ClockinFlow validates → Writes to ClockIn →
Needs Processing = TRUE → Bot runs at :20 → Links to Task → 
Task times updated → Processing complete

⚠️ Note: AppSheet bots run on schedule, not triggered by Apps Script
```

### Workflow 2: Batch Clock-In (Admin Creates Shift)
```
Admin submits batch form → BatchClockin.js doPost → 
AppSheet API creates Tasks directly → Workers clock in via NFC →
ClockinFlow writes ClockIn rows → Bot links to existing Tasks
```

### Workflow 3: Manual Task Creation + NFC
```
Admin creates Task manually (AppSheet) → Worker clocks in (NFC) →
ClockinFlow writes ClockIn → Bot matches by WorkerID+Date →
Sets TaskID → Updates Task times
```

---

## Missing Pieces & Questions

### 1. ClockInType Column
**Issue**: AppSheet queries for `ClockInType = "Shift-Start"` and `"Shift-End"`, but:
- Not documented in ClockIn schema (DATABASE_SCHEMA.md)
- Not written by ClockinFlow.js
- Not written by EmployeeLogin backend

**Possible Solutions**:
- Manual entry by admins in AppSheet UI
- Additional column not yet documented
- Feature under development

### 2. BreakDuration Column
**Issue**: Referenced in "Update Clock Times" action but:
- Not in ClockIn schema
- Not written by either clock-in system

**Possible Solutions**:
- Calculated field in AppSheet
- Manual entry
- Uses "Break (Minutes)" from Tasks (not ClockIn)

### 3. Needs Processing Default Value
**Question**: How is `Needs Processing` set to TRUE when ClockinFlow creates a row?

**Possible Answers**:
- Sheet formula in column J: `=IF(F2="", TRUE, FALSE)` (if TaskID empty)
- AppSheet default value setting
- ClockinFlow writes it (not shown in code)

### 4. GPS vs NFC Reconciliation
**Question**: How do you prevent duplicate entries when a worker:
- Clocks in via GPS (EmployeeLogin)
- Also scans NFC tag (ClockinFlow)

**Current Safeguards**:
- ClockinFlow: 20-minute duplicate scan restriction (per worker)
- EmployeeLogin: Similar duplicate detection
- But systems don't check each other's entries

---

## AppSheet Limitations

### Critical Limitation: No Apps Script Triggers
**AppSheet UI changes CANNOT trigger Apps Script functions directly.**

**What This Means**:
- ❌ Changing status in AppSheet app does NOT call Apps Script
- ❌ Adding/editing rows in AppSheet does NOT fire Apps Script triggers
- ❌ AppSheet bots cannot call Apps Script functions

**Workarounds**:
1. **AppSheet Bots** - Scheduled automation (hourly, daily)
2. **AppSheet Webhooks** - Call external URLs (can hit Apps Script web app)
3. **Manual Sync** - Checkbox columns that trigger AppSheet actions
4. **Google Sheets Triggers** - onChange/onEdit in Apps Script (but AppSheet bypasses these)

**Current System Impact**:
- ✅ ClockinFlow writes to sheet → AppSheet bot processes (scheduled)
- ❌ AppSheet status change → Apps Script worker creation (NOT POSSIBLE)
- ✅ Sheet formula triggers AppSheet bot → Bot updates data (works)

---

## Recommendations

### 1. Document Missing Columns
Add to DATABASE_SCHEMA.md:
```markdown
| M | ClockInType | String | "Shift-Start" or "Shift-End" |
| N | BreakDuration | Number | Break minutes for this entry |
```

### 2. Centralize Clock-In Logic
Consider:
- Single clock-in API endpoint
- Both GPS and NFC call same backend
- Unified duplicate detection
- Consistent column population

### 3. Add ClockInType to ClockinFlow
Update `logClockIn()` to include:
```javascript
const row = [
  newClockInId, workerId, date, time,
  '',              // Notes
  '',              // TaskID
  '',              // Approve
  '',              // Latitude
  '',              // Longitude
  '',              // Needs Processing (let sheet formula handle)
  '',              // Nearest Client
  '',              // Distance
  'Shift-Start'    // ClockInType ← ADD THIS
];
```

### 4. Unified Logging
Both systems should log to Activity_Logs:
```javascript
// ClockinFlow should use centralized logging too
TT_LOGGER.logClockIn(workerData, {
  siteName: 'NFC Scan',
  clockinID: newClockInId,
  device: 'NFC Reader'
});
```

---

## Deployment & Maintenance

### ClockinFlow Deployment
```powershell
cd GoogleAppsScripts/ClockinFlow
clasp push
# Publish as web app with:
# - Execute as: Me
# - Who has access: Anyone
```

### Testing NFC Clock-In
```
1. Get NFC web app URL from Apps Script deployment
2. Test URL: {webAppUrl}?action=clockin&workerId=CLS001
3. Check ClockIn sheet for new row
4. Wait for :20 to verify bot processes it
5. Check Tasks sheet for updated times
```

### Monitoring
- **ClockinFlow Logs**: Log sheet in CLS_Hub_Backend
- **AppSheet Bot Runs**: AppSheet > Automation > Bot history
- **API Calls**: Apps Script execution logs

---

## Related Documentation

- **Frontend GPS Clock-In**: `carolina-lumpers-web/README.md`
- **EmployeeLogin Backend**: `GoogleAppsScripts/EmployeeLogin/README.md`
- **AppSheet Configuration**: `.github/APPSHEET_CONFIGURATION.md`
- **Database Schema**: `.github/DATABASE_SCHEMA.md`
- **Main Instructions**: `.github/copilot-instructions.md`

---

**Last Updated**: October 17, 2025  
**Maintainer**: Carolina Lumpers Development Team
