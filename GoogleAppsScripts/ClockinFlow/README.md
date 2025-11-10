# ClockinFlow - NFC Clock-In System

**Version**: 2.1 (Optimized)  
**Last Updated**: October 17, 2025  
**Purpose**: NFC tag/QR code-based employee clock-in system with AppSheet integration

---

## Overview

ClockinFlow is a **Google Apps Script web app** that handles physical NFC tag and QR code scanning for employee clock-ins. It works **in parallel** with the GPS-based EmployeeLogin system, both writing to the same `ClockIn` sheet.

### Key Features
- ✅ NFC tag/QR code scanning for fast clock-ins
- ✅ Per-worker concurrency locks (prevents duplicate submissions)
- ✅ Work hours validation (7am - midnight)
- ✅ Duplicate scan detection (20-minute window)
- ✅ HTML report generation with clock-in history
- ✅ Batch clock-in support via AppSheet API
- ✅ Structured logging to Log sheet

---

## System Architecture

### Integration Points
```
┌──────────────────────────────────────────────────────────────┐
│                    CLOCKINFLOW ECOSYSTEM                     │
└──────────────────────────────────────────────────────────────┘

NFC Tag/QR Scan
    ↓
ClockinFlow Web App (doGet/doPost)
    ↓
┌─────────────────┬──────────────────┬──────────────────┐
│ Worker Validation│ Time Validation  │ Duplicate Check  │
│ (Workers sheet)  │ (7am-midnight)   │ (20 min window)  │
└─────────────────┴──────────────────┴──────────────────┘
    ↓
Write to ClockIn Sheet
    ├─ ClockinID (CLK-123456)
    ├─ WorkerID (CLS001)
    ├─ Date, Time
    └─ Needs Processing = TRUE ← Triggers AppSheet bot
    ↓
AppSheet Bot: "Process NFC Entries" (runs hourly at :20)
    ├─ Step 1: Query Tasks table → Set TaskID
    ├─ Step 2: Run "Update Clock Times" action
    └─ Step 3: Set Needs Processing = FALSE
    ↓
Tasks Sheet Updated
    └─ Start Time, End Time, Break populated from ClockIn
```

### Parallel System: EmployeeLogin (GPS)
```
employeeDashboard.html → EmployeeLogin API → ClockIn Sheet
    ↓                                              ↓
GPS coordinates                        Latitude, Longitude populated
Geofence validation                    Nearest Client calculated
Device detection                       Distance calculated
```

**Key Difference**: ClockinFlow leaves GPS columns empty; EmployeeLogin populates them.

---

## File Structure

```
ClockinFlow/
├── ClockinFlow.js           ← ✅ ACTIVE MAIN FILE (v2.1)
│   ├── doGet()              Entry point (clockin, report actions)
│   ├── handleClockIn()      Main clock-in handler
│   ├── validateWorkerId()   Check Workers sheet
│   ├── validateClockInRestrictions() Work hours + duplicates
│   ├── logClockIn()         Write to ClockIn sheet
│   ├── generateClockInReport() HTML report generation
│   └── logEvent()           Structured logging
│
├── BatchClockin.js          ← Batch clock-in handler (doPost)
│   ├── doPost()             Process batch submissions
│   └── callAppSheetAPI()    Create/update Tasks via API
│
├── ClockInReport.html       ← Report template (HTML)
│
├── 6_Config.js              ← Configuration constants
│   ├── SHEET_NAMES          Sheet name mappings
│   ├── COLUMNS.CLOCK_IN     Column indices
│   ├── TIME_SETTINGS        Work hours, duplicate window
│   └── APPSHEET             API credentials
│
├── 0_doGet.js               ⚠️ LEGACY (commented out)
├── 1_Clock-InHandler.js     ⚠️ LEGACY (commented out)
├── 2_WorkerValidation.js    ⚠️ LEGACY (unused)
├── 3_Clock-InLogic.js       ⚠️ LEGACY (commented out)
├── 4_ReportGeneration.js    ⚠️ LEGACY (unused)
├── 5_Utilities.js           ⚠️ LEGACY (unused)
│
├── .clasp.json              Clasp configuration
└── appsscript.json          Apps Script manifest
```

**Note**: Legacy files (0-5) are kept for reference but not actively used. All logic is in `ClockinFlow.js`.

---

## Configuration

### 6_Config.js

```javascript
const CONFIG = {
  SHEET_NAMES: {
    CLOCK_IN: "ClockIn",      // Main clock-in log
    WORKERS: "Workers",        // Employee directory
    TASKS: "Tasks",            // Task assignments
    LOG: "Log"                 // Activity log
  },
  
  COLUMNS: {
    CLOCK_IN: {
      INDICES: {
        CLOCK_IN_ID: 1,    // Column A
        WORKER_ID: 2,      // Column B
        DATE: 3,           // Column C
        TIME: 4,           // Column D
        NOTES: 5,          // Column E
        TASK_ID: 6,        // Column F (set by AppSheet)
        APPROVE: 7,        // Column G
        LAST_UPDATED: 9    // Column I
      }
    },
    WORKERS: {
      INDICES: {
        WORKER_ID: 1,      // Column A
        ROLE: 7,           // Column G
        WORKER_NAME: 19,   // Column S (Display Name)
        AVAILABILITY: 11   // Column K
      }
    }
  },
  
  TIME_SETTINGS: {
    WORK_HOURS: {
      START: 7,            // 7:00 AM
      END: 24              // Midnight
    },
    DUPLICATE_SCAN_RESTRICTION_MINUTES: 20
  },
  
  APPSHEET: {
    API_KEY: 'V2-ZHKXU-KgQG7-2R2G9-sqDXc-lylt9-QGkjy-hQnBI-NHY4x',
    APP_ID: '4a5b8255-5ee1-4473-bc44-090ac907035b',
    TABLE_NAME: 'Tasks'
  }
};
```

---

## API Endpoints

### GET ?action=clockin
**Purpose**: Process NFC/QR scan and log clock-in

**Parameters**:
- `workerId` (required) - Employee ID (e.g., "CLS001")

**Example**:
```
https://script.google.com/macros/s/{deploymentId}/exec?action=clockin&workerId=CLS001
```

**Response**: HTML report showing clock-in confirmation and history

**Flow**:
1. Validate worker exists and is active
2. Check work hours (7am-midnight)
3. Check for duplicate scan (< 20 min)
4. Generate unique ClockInID (CLK-XXXXXX)
5. Write row to ClockIn sheet
6. Return HTML report with weekly history

---

### GET ?action=report
**Purpose**: Display worker's clock-in history without logging new entry

**Parameters**:
- `workerId` (required) - Employee ID

**Example**:
```
https://script.google.com/macros/s/{deploymentId}/exec?action=report&workerId=CLS001
```

**Response**: HTML report with last 7 days of clock-ins

---

### POST (doPost)
**Purpose**: Batch clock-in creation via admin interface

**Payload**:
```json
{
  "batchClockInID": "BATCH-251017-001",
  "date": "10/17/2025",
  "startTime": "08:00",
  "endTime": "16:00",
  "lunch": true,
  "names": "John Doe, Jane Smith, Bob Johnson"
}
```

**Flow**:
1. Parse batch data
2. Query Tasks sheet for existing tasks with same batchClockInID
3. For each worker:
   - Update existing task OR create new task
4. Delete tasks for workers removed from batch
5. Call AppSheet API (Add/Edit/Delete actions)

**Response**:
```json
{
  "status": "success",
  "message": "Tasks updated/created/deleted"
}
```

---

## Data Model

### ClockIn Sheet Row (Written by ClockinFlow)
```javascript
[
  "CLK-123456",           // A: ClockinID
  "CLS001",               // B: WorkerID
  "10/17/2025",           // C: Date
  "14:30:00",             // D: Time
  "",                     // E: Notes (empty)
  "",                     // F: TaskID (filled by AppSheet bot)
  "",                     // G: Approve to Tasks (empty)
  "",                     // H: Latitude (empty - no GPS)
  "",                     // I: Longitude (empty - no GPS)
  // J: Needs Processing (TRUE - set by sheet formula or default)
]
```

### Workers Sheet Lookup
```javascript
// Validates against:
- WorkerID (Column A)
- Availability (Column K) - must be "active"
- Display Name (Column S) - for report
```

### Tasks Sheet (Updated by AppSheet)
```javascript
// AppSheet bot queries Tasks to find:
{
  TaskID: "BATCHTASK-251017-A1B2",
  Worker: "CLS001",
  Date: "10/17/2025",
  "Start Time": "",      // ← Filled by bot from ClockIn
  "End Time": "",        // ← Filled by bot from ClockIn
  "Break (Minutes)": 0   // ← Filled by bot from ClockIn
}
```

---

## Clock-In Validation Rules

### 1. Worker Validation
```javascript
validateWorkerId(e)
  ✓ WorkerID exists in Workers sheet
  ✓ Availability = "active"
  ✓ Display Name is not empty
  ✗ Throws error if any check fails
```

### 2. Work Hours Validation
```javascript
validateWorkHours(timestamp)
  ✓ Hour >= 7 (7:00 AM)
  ✓ Hour < 24 (Midnight)
  ✗ "Clock-in time {hour} is outside working hours (7 AM – 12 AM)"
```

### 3. Duplicate Scan Detection
```javascript
validateDuplicateScan(workerId, timestamp)
  ✓ Find last clock-in for this worker today
  ✓ Calculate time difference in minutes
  ✗ If difference < 20 minutes → "🚨 Duplicate scan detected"
  ✗ If exact same timestamp → "🚨 Duplicate scan detected"
```

### 4. Concurrency Control
```javascript
acquireWorkerLock(workerId)
  ✓ Check CacheService for existing lock
  ✗ If locked → "⏳ Worker {workerId} is being processed. Try again."
  ✓ Set 10-second soft lock in cache
```

---

## AppSheet Integration

### Bot: "Process NFC Entries"
**Schedule**: Hourly at :20  
**Filter**: `[Needs Processing] = TRUE`

#### What the Bot Does:
1. **Set TaskID**: Query Tasks table for matching WorkerID + Date
2. **Update Times**: Call "Update Clock Times" action on matched Task
3. **Mark Processed**: Set `Needs Processing = FALSE`

### AppSheet API (BatchClockin.js)
```javascript
// Direct Task creation/updates via API
POST https://api.appsheet.com/api/v2/apps/{appId}/tables/Tasks/Action

Headers:
  ApplicationAccessKey: {apiKey}

Actions:
  - Add (create new task)
  - Edit (update existing task)
  - Delete (remove task)
```

**When Used**: Batch clock-in submissions from admin interface

---

## Logging

### Structured Log Events
```javascript
logEvent(level, component, message, context)

// Example log entry in Log sheet:
[
  "10/17/2025 14:30:15",  // Timestamp
  "INFO",                 // Level
  "ClockIn",              // Component
  "Clock-in success",     // Message
  "{\"workerId\":\"CLS001\",\"clockInId\":\"CLK-123456\"}"  // Context (JSON)
]
```

### Log Levels
- **DEBUG**: Detailed validation steps
- **INFO**: Successful operations
- **WARN**: Non-critical issues
- **ERROR**: Failures requiring attention

### Key Events Logged
- Worker validation
- Duplicate scan checks
- Clock-in success/failure
- Report generation
- API calls (batch operations)

---

## Deployment

### Prerequisites
```powershell
# Install clasp
npm install -g @google/clasp

# Login to Google
clasp login
```

### Deploy Web App
```powershell
cd GoogleAppsScripts/ClockinFlow
clasp push

# Then in Apps Script Editor:
# 1. Click "Deploy" → "New deployment"
# 2. Type: Web app
# 3. Execute as: Me
# 4. Who has access: Anyone
# 5. Copy deployment URL
```

### Web App Settings
- **Execute as**: Your account (owner)
- **Who has access**: Anyone (for NFC readers)
- **URL Format**: `https://script.google.com/macros/s/{deploymentId}/exec`

### Update Deployment
```powershell
clasp push
# Auto-updates if "Execute as: Me" with latest code setting
```

---

## Testing

### Test NFC Clock-In
```bash
# Replace {webAppUrl} with your deployment URL
curl "{webAppUrl}?action=clockin&workerId=CLS001"
```

### Test Report View
```bash
curl "{webAppUrl}?action=report&workerId=CLS001"
```

### Test Batch Clock-In
```bash
curl -X POST "{webAppUrl}" \
  -H "Content-Type: application/json" \
  -d '{
    "batchClockInID": "TEST-001",
    "date": "10/17/2025",
    "startTime": "08:00",
    "endTime": "16:00",
    "lunch": true,
    "names": "CLS001, CLS002"
  }'
```

### Verify in Sheets
1. Check **ClockIn** sheet for new rows
2. Check **Log** sheet for event entries
3. Wait until :20 hour mark
4. Check **Tasks** sheet for updated times

---

## Known Issues & Limitations

### 1. Missing ClockInType Column
**Issue**: AppSheet bot queries for `ClockInType = "Shift-Start"` but ClockinFlow doesn't write this column.

**Impact**: "Update Clock Times" action may not find correct entries

**Workaround**: Manual entry in AppSheet or add column to ClockinFlow

### 2. No GPS Data
**Issue**: Latitude/Longitude columns left empty

**Impact**: No geofencing, no distance calculation, no nearest client

**Design**: Intentional - NFC tags are at known locations

### 3. Duplicate Detection Across Systems
**Issue**: ClockinFlow doesn't check if worker already clocked in via EmployeeLogin (GPS system)

**Impact**: Possible duplicate clock-ins on same day

**Workaround**: Admin review or unified validation

### 4. Needs Processing Column
**Issue**: Unclear how `Needs Processing` is set to TRUE

**Possibilities**:
- Sheet formula: `=IF(F2="", TRUE, FALSE)`
- AppSheet default value
- Missing code in ClockinFlow

**Needs**: Investigation and documentation

### 5. Legacy Code
**Issue**: Files 0-5 are commented out but still in repository

**Impact**: Confusion about which file is active

**Recommendation**: Delete or move to `/archive/` folder

---

## Refactoring Considerations

### Current Pain Points
1. **Dual Systems**: GPS (EmployeeLogin) and NFC (ClockinFlow) don't communicate
2. **Bot Dependency**: Relies on AppSheet hourly bot for TaskID assignment
3. **Delayed Processing**: Up to 1 hour delay before tasks are linked
4. **Missing Columns**: ClockInType, BreakDuration not populated
5. **API Credentials**: Hardcoded in CONFIG object
6. **No Centralized Logging**: Uses local Log sheet, not Activity_Logs

### Unified System Architecture (Proposed)

```
┌─────────────────────────────────────────────────────────────┐
│           UNIFIED CLOCK-IN API (Apps Script)                │
└─────────────────────────────────────────────────────────────┘
                          ↓
          ┌───────────────┴───────────────┐
          ↓                               ↓
    GPS Clock-In                    NFC Clock-In
    (employeeDashboard.html)        (NFC tag scan)
          ↓                               ↓
    Sends: workerId, lat, lng       Sends: workerId only
          ↓                               ↓
          └───────────────┬───────────────┘
                          ↓
              validateClockIn(data)
                ├─ Check Workers sheet
                ├─ Check work hours
                ├─ Check duplicates (ALL sources)
                ├─ Validate GPS (if provided)
                └─ Query Tasks for TaskID immediately
                          ↓
              writeToClockIn(data)
                ├─ All columns populated
                ├─ ClockInType determined by logic
                ├─ TaskID assigned immediately
                └─ No "Needs Processing" flag needed
                          ↓
              updateTaskTimes(taskId)
                ├─ Update Start/End/Break immediately
                └─ No bot delay
                          ↓
              logToActivityLogs(event)
                └─ Centralized logging with device info
```

### Benefits of Unified System
- ✅ **No bot dependency** - Immediate task assignment
- ✅ **No AppSheet limitations** - Apps Script has full control
- ✅ **No duplicate clock-ins** - Single validation layer
- ✅ **Consistent data** - All columns populated
- ✅ **Faster processing** - Real-time, not hourly
- ✅ **Centralized logging** - Activity_Logs with TT_LOGGER
- ✅ **Single codebase** - Easier maintenance
- ✅ **True automation** - Apps Script can trigger other scripts

### Migration Path

#### Phase 1: Analysis
- [x] Document current ClockinFlow behavior
- [x] Document AppSheet bot logic
- [x] Identify gaps and issues
- [ ] Map all clock-in sources
- [ ] Define unified data model

#### Phase 2: Unified API Design
- [ ] Create CLS_ClockIn_Unified.js
- [ ] Merge validation logic from both systems
- [ ] Implement immediate TaskID lookup
- [ ] Add ClockInType detection logic
- [ ] Integrate with TT_LOGGER (Activity_Logs)
- [ ] Support both GPS and non-GPS clock-ins

#### Phase 3: Frontend Updates
- [ ] Update employeeDashboard.html → new API
- [ ] Update NFC scanner → new API
- [ ] Add device detection to NFC flow
- [ ] Maintain backward compatibility (optional)

#### Phase 4: Bot Replacement
- [ ] Test unified API with sample data
- [ ] Implement Apps Script onChange trigger for ClockIn sheet
- [ ] Disable AppSheet "Process NFC Entries" bot
- [ ] Monitor for issues
- [ ] Remove bot once stable

**Why Replace Bots with Apps Script**:
- ⚠️ **AppSheet bots run on schedule** (hourly delay)
- ⚠️ **AppSheet UI changes cannot trigger Apps Script** (one-way limitation)
- ✅ **Apps Script onChange triggers are instant** (real-time processing)
- ✅ **Full control over automation logic** (no AppSheet constraints)

#### Phase 5: Cleanup
- [ ] Archive ClockinFlow legacy files
- [ ] Update documentation
- [ ] Remove APPSHEET.API_KEY from config
- [ ] Consolidate Log sheet → Activity_Logs

---

## Comparison: Current vs Proposed

| Feature | Current (ClockinFlow + Bots) | Proposed (Unified API) |
|---------|------------------------------|------------------------|
| **TaskID Assignment** | Hourly bot (up to 60 min delay) | Immediate (on clock-in) |
| **Duplicate Detection** | Per-system (GPS or NFC only) | Cross-system (all sources) |
| **ClockInType** | Not populated | Determined by logic |
| **GPS Data** | Empty for NFC | Optional (when available) |
| **Processing Time** | Deferred (next bot run) | Real-time |
| **Logging** | Local Log sheet | Centralized Activity_Logs |
| **Device Tracking** | None | Full device info |
| **Maintenance** | 2 systems + AppSheet bots | Single codebase |
| **Dependencies** | AppSheet API + Bots | Apps Script only |
| **Code Files** | 11 files (6 legacy) | 1 unified file |

---

## Related Documentation

- **NFC Integration Overview**: `/.github/NFC_CLOCKIN_INTEGRATION.md`
- **AppSheet Configuration**: `/.github/APPSHEET_CONFIGURATION.md`
- **Database Schema**: `/.github/DATABASE_SCHEMA.md`
- **EmployeeLogin (GPS System)**: `/GoogleAppsScripts/EmployeeLogin/README.md`
- **Main Instructions**: `/.github/copilot-instructions.md`

---

## Quick Reference

### Common Tasks

#### Check Last Clock-In
```javascript
// In Apps Script
var data = SpreadsheetApp.getActiveSpreadsheet()
  .getSheetByName("ClockIn")
  .getDataRange()
  .getValues();
var lastRow = data[data.length - 1];
Logger.log(lastRow); // [ClockinID, WorkerID, Date, Time, ...]
```

#### Manually Trigger Bot Logic
```javascript
// Simulate what AppSheet bot does
function manualProcessNFCEntry(clockInId) {
  var clockInSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ClockIn");
  var tasksSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Tasks");
  
  // Find clock-in row
  var clockInData = clockInSheet.getDataRange().getValues();
  var row = clockInData.find(r => r[0] === clockInId);
  
  var workerId = row[1];
  var date = row[2];
  
  // Find matching task
  var tasksData = tasksSheet.getDataRange().getValues();
  var taskRow = tasksData.find(r => r[14] === workerId && r[2] === date);
  
  if (taskRow) {
    Logger.log("Found task: " + taskRow[0]);
    // Would update Start Time, End Time, Break here
  }
}
```

#### View Logs
```javascript
// Recent logs
function viewRecentLogs() {
  var logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Log");
  var data = logSheet.getDataRange().getValues();
  var recent = data.slice(-10); // Last 10 entries
  recent.forEach(row => {
    Logger.log(`${row[0]} [${row[1]}] ${row[2]}: ${row[3]}`);
  });
}
```

---

## Support & Maintenance

### Monitoring
- Check **Log** sheet daily for ERROR entries
- Monitor **ClockIn** sheet for stuck `Needs Processing = TRUE`
- Verify AppSheet bot runs successfully (AppSheet dashboard)

### Troubleshooting

**Problem**: Clock-in fails with "Worker ID not found"
- **Check**: Workers sheet has WorkerID in Column A
- **Check**: Availability = "active" in Column K

**Problem**: "Duplicate scan detected" error
- **Check**: Last clock-in time (must be > 20 min ago)
- **Solution**: Wait or clear cache: `CacheService.getScriptCache().remove('clockin-{workerId}')`

**Problem**: TaskID never gets populated
- **Check**: AppSheet bot enabled and running
- **Check**: Matching task exists in Tasks sheet
- **Check**: Worker ID in Tasks.Worker column matches ClockIn.WorkerID

**Problem**: Batch clock-in fails
- **Check**: AppSheet API key is valid
- **Check**: Workers exist in Workers sheet
- **Check**: Date format is MM/DD/YYYY

---

**Last Updated**: October 17, 2025  
**Maintainer**: Carolina Lumpers Development Team  
**Status**: ⚠️ PRODUCTION - Refactoring Planned
