# AppSheet Configuration - CLS_AppSheet_Application_Form

## Overview
This document captures the AppSheet-specific configuration that cannot be inspected via API or Google Sheets structure. Update this file only when you make significant changes to the AppSheet app.

**Last Updated**: October 17, 2025  
**App Name**: CLS Hub  
**App ID**: _(Available in AppSheet editor)_  
**Primary Use**: Time tracking, task management, clock-in approval workflow

---

## Quick Configuration Summary

### 📋 **Tables & Data Sources**
- [x] **ClockIn** - Google Sheet (CLS_Hub_Backend)
- [x] **Tasks** - Google Sheet (CLS_Hub_Backend)
- [x] **Applications 2** - Google Sheet (CLS_AppSheet_Application_Form)
- [x] **Batch ClockIn** - Google Sheet (CLS_Hub_Backend)
- [x] **Activity_Logs** - Google Sheet (CLS_Hub_Backend)
- [ ] _(Other tables visible in Data Explorer)_

### 🤖 **Bots (Automation)**
Document only when you create/modify bots:

| Bot Name | Trigger | Action | Purpose |
|----------|---------|--------|---------|
| **Update Clock Data in Tasks** | ClockIn table Updates | 3-step process | Sync clock-in data to Tasks sheet |
| **Auto-Create Daily NFC Tasks** | Scheduled Hourly | 2-step process | Create daily tasks from shift-start clock-ins |
| **Process NFC Entries** | Scheduled Hourly | 3-step process | Link NFC clock-ins to Tasks, update times, mark processed |

#### Bot: Update Clock Data in Tasks
- **Event Source**: App
- **Table**: ClockIn
- **Data Change Type**: Updates
- **Condition**: `[_THISROW_BEFORE].[Approve to Tasks] = "Send" <> [_THISROW_AFTER].[Approve to Tasks] = "Send"`
- **Process Steps**:
  1. **Update Clock Data in Tasks** (Event action on ClockIn)
  2. **Set Clock Times in Task** (Run data action on Tasks)
  3. **Clear Approve to Tasks** (Run data action on ClockIn)

#### Bot: Auto-Create Daily NFC Tasks
- **Event Source**: Scheduled
- **Schedule**: Hourly (at minute 15)
- **Time Zone**: (GMT-04:00) Eastern Standard Time
- **Table**: ClockIn
- **Filter Condition**: `AND([Date] = TODAY(), [ClockInType] = "Shift-Start")`
- **For Each Row**: Enabled
- **Process Steps**:
  1. **ClockIn Scan - Today's Shift-Start Entries** (Event action on ClockIn - Hourly scan)
  2. **Create Task If Not Exists** (Run data action on ClockIn)

#### Bot: Process NFC Entries
- **Event Source**: Scheduled
- **Schedule**: Hourly (at minute 20 of every hour)
- **Time Zone**: (GMT-04:00) US Eastern Standard Time
- **Table**: ClockIn
- **Filter Condition**: `[Needs Processing] = true`
- **For Each Row**: Enabled
- **Process Steps**:
  1. **Set TaskID** (Run data action - Sets column TaskID)
  2. **Update Clock-in Times** (Run action on rows - References Tasks table)
  3. **Needs Process set to FALSE** (Run data action - Sets column Needs Processing)
- **Purpose**: Automatically links unprocessed NFC clock-in entries to existing Tasks by matching WorkerID and Date, updates task times, then marks entries as processed

### ⚡ **Actions**
Document only custom actions beyond default Add/Edit/Delete:

| Action Name | Table | Type | Purpose |
|-------------|-------|------|---------|
| **Update Clock Times** | Tasks | Data: set column values | Updates Start Time, End Time, Break from ClockIn data |
| **Set TaskID** | ClockIn | Data: set column values | Matches NFC entry to Task by querying Tasks table |
| **Needs Process set to FALSE** | ClockIn | Data: set column values | Marks entry as processed to prevent reprocessing |

#### Action: Update Clock Times
- **Effect**: Data: set the values of some columns in this row
- **For a record of**: Tasks table
- **Do this**: Data: set the values of some columns in this row
- **Set these columns**:
  - **Start Time**: `ANY(SELECT(ClockIn[Time], AND(IN([WorkerID], [_THISROW].[Worker]), [Date] = [_THISROW].[Date], [ClockInType] = "Shift-Start")))`
  - **End Time**: `ANY(SELECT(ClockIn[Time], AND(IN([WorkerID], [_THISROW].[Worker]), [Date] = [_THISROW].[Date], [ClockInType] = "Shift-End")))`
  - **Break (Minutes)**: `MAX(SELECT(ClockIn[BreakDuration], AND(IN([WorkerID], [_THISROW].[Worker]), [Date] = [_THISROW].[Date])))`
- **Position**: Prominent

#### Action: Create task from clockin
- **Effect**: Data: add a new row to another table using values from this row
- **For a record of**: ClockIn table
- **Do this**: Data: add a new row to another table using values from this row
- **Table to add to**: Tasks
- **Set these columns**:
  - **TaskID**: `"NFC-" & [WorkerID] & "-" & TEXT([Date], "YYYY-MM-DD")`
  - **Worker**: `[WorkerID]`
  - **Start Time**: `[Time]`
  - **Date**: `[Date]`
- **Position**: Inline
- **Attach to column**: Date
- **Condition**: `ISBLANK(SELECT(Tasks[TaskID], AND(TEXT([Worker]) = TEXT([_THISROW].[WorkerID]), [Date] = TODAY())))`
  - _(Only creates task if one doesn't already exist for this worker today)_

#### Action: Set TaskID (Used by Process NFC Entries Bot)
- **Effect**: Data: set the values of some columns in this row
- **For a record of**: ClockIn table
- **Do this**: Data: set the values of some columns in this row
- **Set these columns**:
  - **TaskID**: 
    ```appsheet
    ANY(
      SELECT(
        Tasks[TaskID],
        AND(
          IN([_THISROW].[WorkerID], [Worker]),
          [Date] = [_THISROW].[Date]
        )
      )
    )
    ```
- **Logic**: Queries the Tasks table to find a matching task where the Worker column contains this ClockIn's WorkerID and the Date matches. Returns the TaskID to link the clock-in entry to the task.

#### Action: Needs Process set to FALSE
- **Effect**: Data: set the values of some columns in this row
- **For a record of**: ClockIn table
- **Do this**: Data: set the values of some columns in this row
- **Set these columns**:
  - **Needs Processing**: `FALSE`
- **Logic**: Simple flag reset to prevent the same clock-in entry from being processed multiple times by the hourly bot.

### 🔢 **Virtual Columns**
Document only if you add computed fields not in Google Sheets:

| Table | Column Name | Formula/Type | Purpose |
|-------|-------------|--------------|---------|
| _(Example: Applications)_ | _(DaysInPipeline)_ | _(TODAY() - [submitted_date])_ | _(Track time in system)_ |
| | | | |

### 🎨 **Views (UX)**
Document only the main user-facing views:

| View Name | Type | Table | Purpose |
|-----------|------|-------|---------|
| Applications_Form | Form | Applications | New applicant intake |
| Applications_Deck | Deck | Applications | Review applicants |
| | | | |

### 🔒 **Security Filters**
Document only if you implement row-level security:

| Table | Filter Expression | Purpose |
|-------|-------------------|---------|
| _(Example: Applications)_ | _([assigned_to] = USEREMAIL())_ | _(Users see only their applicants)_ |
| | | |

### 🔗 **Integrations**
- [ ] **API Enabled?**: _(Yes/No)_
- [ ] **Webhooks**: _(None / List endpoints)_
- [ ] **External Calls**: _(None / List scripts)_

---

## Key Workflows

### 1️⃣ **Clock-In Data Sync to Tasks**
```
Worker clock-in approved → ClockIn[Approve to Tasks] = "Send" → Bot triggers → 
  Step 1: Update Clock Data in Tasks (event) → 
  Step 2: Set Clock Times in Task (queries ClockIn for Start/End/Break) → 
  Step 3: Clear Approve to Tasks (resets field to empty)
```

### 2️⃣ **Auto-Create Daily Tasks (Scheduled)**
```
Every hour at :15 → Bot scans ClockIn table → 
  Filter: Date = TODAY() AND ClockInType = "Shift-Start" → 
  For each matching row → Check if Task exists for WorkerID today → 
  If not exists → Create Task with TaskID = "NFC-{WorkerID}-{Date}"
```

### 3️⃣ **Task Time Calculation**
```
Bot runs "Update Clock Times" action → 
  SELECT ClockIn records WHERE WorkerID matches Task[Worker] AND Date matches → 
  Find "Shift-Start" ClockInType → Set Start Time → 
  Find "Shift-End" ClockInType → Set End Time → 
  MAX(BreakDuration) → Set Break (Minutes)
```

### 4️⃣ **Process NFC Entries (Hourly Automation)**
```
Every hour at :20 → Bot scans ClockIn table → 
  Filter: [Needs Processing] = true → 
  For each unprocessed row:
    Step 1: Set TaskID (Query Tasks table for matching WorkerID + Date) →
    Step 2: Update Clock-in Times (Run "Update Clock Times" action on matched Tasks) →
    Step 3: Set Needs Processing = FALSE (Mark as processed)
```

**Key Details:**
- **TaskID Matching Query**: Finds tasks where `IN([_THISROW].[WorkerID], [Worker])` AND `[Date] = [_THISROW].[Date]`
- **Referenced Action**: "Update Clock Times" from Tasks table (pulls Start Time, End Time, Break from ClockIn)
- **Idempotency**: The `Needs Processing` flag prevents duplicate processing
- **Timing**: Runs 5 minutes after "Auto-Create Daily NFC Tasks" bot (which runs at :15)
- **Integration Point**: Works in tandem with NFC clock-in system (separate from GPS-based web app clock-ins)

---

## Notes

### When to Update This File
✅ **DO update when:**
- Adding new Bots or Actions
- Creating Virtual Columns
- Changing security filters
- Adding integrations

❌ **DON'T update for:**
- Data changes (new applications)
- Minor UI tweaks
- Column order changes in views

### Quick Check Method
When someone asks "How does [feature] work?", check:
1. **This file** - AppSheet configuration
2. **DATABASE_SCHEMA.md** - Raw data structure
3. **JobApplication/Code.js** - Apps Script sync logic

---

## Configuration Details (Optional Deep Dive)

### Bot: _(Bot Name)_
**Only fill this out if you need to document complex automation:**

- **Event**: _(Data change, Schedule, Webhook)_
- **Condition**: _(When to fire)_
- **Process**: _(What it does - high level only)_
- **Tasks**: 
  - _(Task 1: e.g., "Send email to admin")_
  - _(Task 2: e.g., "Call Apps Script webhook")_

### Action: _(Action Name)_
**Only fill this out if behavior is complex:**

- **Behavior**: _(App: go to another view, Data: add/update/execute)_
- **Target**: _(Which table/view)_
- **Parameters**: _(What data is passed)_

---

## AppSheet Editor Quick Links

### Common Configuration Locations (For Your Reference)
When you need to check AppSheet settings, navigate to:

- **Data > Tables** - View columns, keys, initial values
- **Data > Columns** - Column types, formulas, constraints
- **Data > Slices** - Filtered table views
- **Automation > Bots** - Workflow automation
- **Behavior > Actions** - Custom actions
- **UX > Views** - User interface screens
- **Security > Require Sign-In** - Access control
- **Settings > Integrations** - API, webhooks

### Quick Screenshots (Optional)
If you do take screenshots, save them as:
- `.github/assets/appsheet-bots-overview.png`
- `.github/assets/appsheet-actions-list.png`

Then reference here:
- ![Bots](assets/appsheet-bots-overview.png)

---

## Change Log

| Date | Change | Modified By |
|------|--------|-------------|
| 2025-10-17 | Initial template created | AI Agent |
| 2025-10-17 | Added "Process NFC Entries" bot documentation with complete workflow | AI Agent |
| | | |

---

**Purpose**: Lightweight documentation for AppSheet-specific features not visible in Google Sheets or via API. Update only when making significant configuration changes.
