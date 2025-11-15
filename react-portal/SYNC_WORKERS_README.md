# Worker Sync Tool

Scripts to synchronize workers between Google Sheets (legacy system) and Supabase (new database).

## Scripts

### 1. `sync-workers-from-sheets.js` (Main Sync Tool)

Syncs workers from Google Sheets to Supabase, automatically creating Supabase Auth accounts.

**Usage:**

```bash
# Dry run (show what would be added, no changes made)
node sync-workers-from-sheets.js

# Add missing workers only
node sync-workers-from-sheets.js --execute

# Add missing workers AND update existing ones
node sync-workers-from-sheets.js --update
```

**What it does:**
- Fetches all workers from Google Sheets `Workers` tab
- Compares with existing Supabase workers
- Identifies missing and changed workers
- In `--execute` mode: Creates Supabase Auth accounts + worker records
- In `--update` mode: Also updates existing workers with Google Sheets data

**Output Example:**
```
📊 Sync Analysis:
   Total in Sheets: 44
   Total in Supabase: 18
   Missing in Supabase: 26
   Changed (if updating): 0

➕ Missing Workers (need to be added):
   1. MA-003 - Miguel Aguirre (20aguirre25@gmail.com) [Worker, $22/hr]
   2. OD-004 - Orlando Diaz (guardadojafet4@gmail.com) [Worker, $20/hr]
   ...
```

### 2. `inspect-workers-sheet.js` (Debug Tool)

Quick script to view Google Sheets Workers tab structure.

```bash
node inspect-workers-sheet.js
```

**Output:**
- Column headers (A-Z)
- Total row count
- Sample record with all fields

### 3. `add-nataly-worker.js` (One-off Fix)

Single-use script that added Nataly Quigla (NQ-044) who was missing from Phase 1 migration.

**Note:** Only needed once, already executed.

## When to Use Sync Tool

Use `sync-workers-from-sheets.js` when:

1. **New worker added to Google Sheets** - Run `--execute` to add them to Supabase
2. **Bulk import needed** - Run `--execute` to catch up all missing workers
3. **Data changed in Google Sheets** - Run `--update` to sync changes
4. **Verify sync status** - Run without flags for dry-run report

## Column Mapping

Google Sheets → Supabase:

| Google Sheets Column | Supabase Column | Notes |
|---------------------|-----------------|-------|
| Employee ID | employee_id | Primary identifier (e.g., "SG-001") |
| Display Name | display_name | Full name |
| Email | email | Lowercase, trimmed |
| Phone | phone | Digits only |
| App Access | role | "Admin" / "Supervisor" / "Worker" |
| Hourly Rate | hourly_rate | Parsed to float |
| W9Status | w9_status | "pending" / "approved" / "rejected" |
| Primary Language | language | "en" / "es" / "pt" |
| Availability | is_active | "Active" → true |
| Work History | notes | Text field |
| WorkerID | legacy_full_id | With hash suffix |

## Authentication

For new workers, the sync script:
- Creates Supabase Auth account with email
- Sets temporary password: `Carolina2025!`
- Enables email_confirm (auto-verified)
- Sets `force_password_change: true` in user_metadata
- Links auth.uid() to workers.id (UUID)

## Error Handling

The script handles:
- ✅ Duplicate emails (reuses existing auth account)
- ✅ Invalid data (skips worker with warning)
- ✅ Network errors (reports and continues)
- ✅ Missing required fields (skips worker)

## Requirements

- `.env.local` with Supabase credentials
- `server/service-account-key.json` for Google Sheets access
- `googleapis` npm package
- `@supabase/supabase-js` npm package

## Safety Features

1. **Dry run by default** - Must explicitly use `--execute`
2. **Detailed reporting** - Shows exactly what will change
3. **Error collection** - Continues on individual failures
4. **Validation** - Requires valid email and employee_id
5. **Upsert logic** - Won't create duplicates

## Example Workflow

```bash
# 1. Check what's missing
node sync-workers-from-sheets.js

# 2. Review output, verify workers to be added

# 3. Execute if everything looks good
node sync-workers-from-sheets.js --execute

# 4. Verify in database
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('workers').select('employee_id, display_name', { count: 'exact' }).then(({ count }) => console.log('Total workers:', count));
"
```

## Future Enhancements

Possible improvements:
- Two-way sync (Supabase → Google Sheets)
- Scheduled sync (cron job)
- Conflict resolution UI
- Backup before sync
- Rollback capability
- Webhook triggers
