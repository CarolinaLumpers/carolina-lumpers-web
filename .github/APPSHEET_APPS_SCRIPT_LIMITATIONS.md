# AppSheet ↔ Apps Script Integration Limitations

**Last Updated**: October 17, 2025  
**Critical**: Understanding what AppSheet can and cannot do with Apps Script

---

## TL;DR - The Core Limitation

### ❌ **AppSheet CANNOT trigger Apps Script functions**

When you edit data in the AppSheet mobile app or web interface:
- ❌ Apps Script `onEdit()` triggers **DO NOT fire**
- ❌ Apps Script `onChange()` triggers **DO NOT fire**
- ❌ Custom Apps Script functions **CANNOT be called**
- ❌ Apps Script web apps **DO NOT receive notifications**

**Why**: AppSheet uses its own API to modify Google Sheets, bypassing Apps Script's trigger system entirely.

---

## What Works vs What Doesn't

### ✅ **What WORKS**

#### 1. Apps Script → Google Sheets → AppSheet Reads
```
Apps Script writes to sheet → AppSheet displays updated data
```
**Example**: ClockinFlow writes ClockIn row → AppSheet bot sees it

#### 2. AppSheet Bots (Scheduled)
```
Scheduled bot runs hourly → Queries sheet → Updates data
```
**Example**: "Process NFC Entries" bot runs at :20 every hour

#### 3. AppSheet Webhooks → Apps Script Web App
```
AppSheet bot → Webhook action → POST to Apps Script doPost()
```
**Example**: Bot calls external URL when status changes

#### 4. Checkbox Triggers in AppSheet
```
User checks "Send to Contacts" → AppSheet bot → Webhook → Apps Script
```
**Example**: Manual trigger column that fires webhook

---

### ❌ **What DOESN'T Work**

#### 1. AppSheet UI Edit → Apps Script Trigger
```
❌ User edits status in AppSheet → Apps Script function runs
```
**Reality**: No trigger fires. Apps Script has no idea the change happened.

#### 2. AppSheet Bot → Apps Script Function Call
```
❌ AppSheet bot → Call createWorker() in Apps Script
```
**Reality**: Bots can only do data actions (add/edit/delete rows) or webhooks.

#### 3. Real-Time Sync Both Ways
```
❌ AppSheet edit → Instant Apps Script reaction
```
**Reality**: Apps Script onChange doesn't fire for AppSheet changes.

#### 4. AppSheet Action → Apps Script Library
```
❌ AppSheet "Run Apps Script" action
```
**Reality**: This feature doesn't exist in AppSheet.

---

## Current System: How We Work Around It

### Clock-In Processing (Current)
```
ClockinFlow (Apps Script)
    ↓ Writes ClockIn row with Needs Processing = TRUE
Google Sheets (ClockIn)
    ↓ AppSheet queries every hour
AppSheet Bot "Process NFC Entries"
    ↓ Scheduled run at :20
    ↓ Filter: [Needs Processing] = TRUE
    ↓ Actions: Set TaskID, Update times, Mark processed
Google Sheets (Tasks)
    ↓ Updated by AppSheet bot
```

**Key Points**:
- ✅ Apps Script writes, AppSheet reads (works)
- ✅ AppSheet bot runs on schedule (works, but delayed)
- ❌ No instant processing (up to 60-min delay)
- ❌ Apps Script can't react to bot completion

---

### Job Application Flow (Current - BROKEN)

**What We THOUGHT Happened**:
```
❌ Admin changes status to "hired" in AppSheet
    ↓
❌ Apps Script trigger fires
    ↓
❌ createWorker() function creates Worker record
```

**What ACTUALLY Happens**:
```
✅ Admin changes status to "hired" in AppSheet
    ↓
✅ AppSheet updates Applications sheet
    ↓
❌ NOTHING ELSE HAPPENS (no trigger!)
    ↓
Manual intervention required:
  - Admin manually creates Worker in CLS_Hub_Backend
  OR
  - Admin checks "Send to Contacts" → triggers webhook
  OR
  - Scheduled bot checks for status="hired" → creates Worker
```

---

## Workaround Options

### Option 1: Scheduled Bots (Current Approach)
**How**: AppSheet bot runs every hour/day to check for changes

**Pros**:
- ✅ No coding required
- ✅ Works within AppSheet
- ✅ Reliable (if schedule works)

**Cons**:
- ❌ Delayed processing (not real-time)
- ❌ Cannot call Apps Script functions
- ❌ Limited to data actions only

**Best For**: Non-urgent batch processing (like NFC clock-in linking)

---

### Option 2: AppSheet Webhooks
**How**: Bot action calls external URL (Apps Script web app)

**Setup**:
```javascript
// Apps Script Web App (doPost)
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  
  if (data.action === "createWorker") {
    createWorkerFromApplication(data.applicationId);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: "success"
  }));
}
```

**AppSheet Bot**:
```
Event: Applications table data change
Condition: [status] = "hired"
Process: Call webhook
  URL: https://script.google.com/.../exec
  Method: POST
  Body: {"action": "createWorker", "applicationId": "<<[application_id]>>"}
```

**Pros**:
- ✅ Can trigger Apps Script functions
- ✅ Passes custom data
- ✅ Near real-time (bot triggers on change)

**Cons**:
- ❌ Requires web app deployment
- ❌ More complex setup
- ❌ Still depends on AppSheet bot (not instant)

**Best For**: Triggering Apps Script when AppSheet data changes

---

### Option 3: Manual Trigger Column
**How**: Checkbox column that user checks to trigger action

**Setup**:
```
AppSheet:
  - Add column "Create Worker?" (Yes/No)
  - Bot: When [Create Worker?] = TRUE
  - Action: Call webhook → Apps Script
  - Then: Set [Create Worker?] = FALSE
```

**Pros**:
- ✅ User has control
- ✅ Can trigger Apps Script
- ✅ Clear audit trail

**Cons**:
- ❌ Requires manual user action
- ❌ Not automatic
- ❌ Extra column in sheet

**Best For**: Admin-initiated actions that need Apps Script

---

### Option 4: Pure Apps Script (Recommended for Unification)
**How**: Replace AppSheet bots with Apps Script triggers

**Setup**:
```javascript
// Apps Script Installable Trigger
function onClockInEdit(e) {
  // Fires when ClockIn sheet changes
  var range = e.range;
  var sheet = range.getSheet();
  
  if (sheet.getName() !== "ClockIn") return;
  
  // Check if Needs Processing = TRUE
  var row = range.getRow();
  var needsProcessing = sheet.getRange(row, 10).getValue();
  
  if (needsProcessing === true) {
    processClockInEntry(row);
    sheet.getRange(row, 10).setValue(false); // Mark processed
  }
}
```

**Pros**:
- ✅ **Instant processing** (no delay)
- ✅ **Full Apps Script control** (can call any function)
- ✅ **No AppSheet dependency** (works even if AppSheet is down)
- ✅ **Can trigger other scripts** (chained automation)
- ✅ **Better logging** (TT_LOGGER integration)

**Cons**:
- ❌ Requires Apps Script knowledge
- ❌ More code to maintain
- ❌ Need to set up installable triggers

**Best For**: Mission-critical automation that needs to be instant and reliable

---

## Recommended Architecture: Unified Apps Script

### Current (Split System)
```
GPS Clock-In → EmployeeLogin (Apps Script) → ClockIn Sheet
NFC Clock-In → ClockinFlow (Apps Script) → ClockIn Sheet → AppSheet Bot (hourly)
```

**Problems**:
- ❌ Two separate clock-in systems
- ❌ AppSheet bot delay (up to 60 min)
- ❌ AppSheet cannot trigger Apps Script
- ❌ Duplicate detection doesn't work cross-system

---

### Proposed (Unified Apps Script)
```
┌─────────────────────────────────────────────────────┐
│          Unified Clock-In API (Apps Script)         │
│  - Single doGet/doPost endpoint                     │
│  - Handles GPS and NFC                              │
│  - Immediate TaskID assignment                      │
│  - Real-time task updates                           │
│  - Cross-system duplicate detection                 │
│  - Centralized logging (Activity_Logs)              │
└─────────────────────────────────────────────────────┘
          ↓                               ↓
    GPS Frontend                    NFC Scanner
(employeeDashboard.html)          (QR/NFC hardware)
          ↓                               ↓
    Sends: workerId,              Sends: workerId
           lat, lng,                     only
           device
          ↓                               ↓
          └───────────────┬───────────────┘
                          ↓
              validateClockIn()
                ├─ Check Workers sheet
                ├─ Check work hours
                ├─ Check duplicates (ALL sources)
                ├─ Validate GPS if provided
                └─ Determine ClockInType
                          ↓
              queryTasksForMatch()
                └─ Find existing task by WorkerID + Date
                          ↓
              writeToClockIn()
                ├─ All columns populated
                ├─ TaskID assigned immediately
                └─ No "Needs Processing" flag
                          ↓
              updateTaskTimes(taskId)
                ├─ Update Start/End/Break immediately
                └─ No delay
                          ↓
              logToActivityLogs()
                └─ TT_LOGGER with full context
```

**Benefits**:
- ✅ **No AppSheet dependency** for clock-ins
- ✅ **Instant processing** (no hourly delay)
- ✅ **Single source of truth** (one validation layer)
- ✅ **Full control** (can add any logic)
- ✅ **Better logging** (Activity_Logs integration)
- ✅ **Easier debugging** (one codebase)

**When to Still Use AppSheet**:
- ✅ Mobile UI for viewing data (AppSheet is great at this)
- ✅ Admin dashboards and reports
- ✅ Form-based data entry
- ❌ NOT for automation that needs Apps Script

---

## Migration Strategy

### Phase 1: Identify All AppSheet → Apps Script Dependencies
- [ ] List all AppSheet bots
- [ ] For each bot, check if it needs Apps Script
- [ ] Document current workarounds

### Phase 2: Replace Bots with Apps Script Triggers
```javascript
// Example: Replace "Process NFC Entries" bot
function setupClockInTrigger() {
  // Delete existing triggers
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'onClockInChange') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new onChange trigger for ClockIn sheet
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.newTrigger('onClockInChange')
    .forSpreadsheet(ss)
    .onChange()
    .create();
}

function onClockInChange(e) {
  // This fires ONLY when Apps Script writes to sheet
  // NOT when AppSheet writes to sheet
  
  // Process new clock-ins immediately
  processUnprocessedClockIns();
}
```

### Phase 3: Use AppSheet Only for UI
- Keep AppSheet for mobile interface
- Use Apps Script for all automation
- AppSheet reads data, doesn't write (except direct user input)

### Phase 4: Webhook Integration (If Needed)
```javascript
// For cases where AppSheet MUST trigger Apps Script
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  
  switch(data.action) {
    case 'createWorker':
      return handleCreateWorker(data);
    case 'approveTimeEdit':
      return handleApproveTimeEdit(data);
    default:
      return errorResponse('Unknown action');
  }
}
```

---

## Key Takeaways

### 1. **AppSheet is a UI, not an automation platform**
- Great for viewing/editing data
- Limited for complex automation
- Cannot directly trigger Apps Script

### 2. **Use the right tool for the job**
- **AppSheet**: Mobile UI, dashboards, simple forms
- **Apps Script**: Automation, complex logic, integrations

### 3. **Workarounds exist but have limitations**
- Scheduled bots (delayed)
- Webhooks (complex setup)
- Manual triggers (requires user action)

### 4. **Pure Apps Script is more powerful**
- Instant processing (onChange triggers)
- Full control over logic
- Can call any function
- Better integration with other Google services

### 5. **For Carolina Lumpers specifically**
- ✅ **Unify clock-in systems** → Pure Apps Script
- ✅ **Keep AppSheet for viewing** → Great mobile UI
- ✅ **Move automation to Apps Script** → Better control
- ⚠️ **Application → Worker creation** → Needs webhook or manual process

---

## Related Documentation

- **ClockinFlow README**: `/GoogleAppsScripts/ClockinFlow/README.md`
- **NFC Integration**: `/.github/NFC_CLOCKIN_INTEGRATION.md`
- **AppSheet Configuration**: `/.github/APPSHEET_CONFIGURATION.md`
- **Database Schema**: `/.github/DATABASE_SCHEMA.md`

---

**Bottom Line**: If you need Apps Script to do something when AppSheet data changes, you MUST use webhooks or scheduled checks. AppSheet UI changes are invisible to Apps Script triggers. This is why unifying to a pure Apps Script solution makes sense for mission-critical automation.
