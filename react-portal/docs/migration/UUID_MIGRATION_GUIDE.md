# UUID Primary Key Migration Guide

**Date**: November 15, 2025  
**Status**: Ready to apply  
**Impact**: Structural change - Requires downtime  
**Estimated Time**: 5-10 minutes

---

## 📋 Overview

This migration converts the workers table from TEXT-based primary keys ("SG-001") to UUID-based primary keys linked directly to Supabase Auth. This follows industry best practices for authentication-linked databases.

### What Changes:

| Before                                     | After                                                  |
| ------------------------------------------ | ------------------------------------------------------ |
| `workers.id` = "SG-001" (TEXT, PK)         | `workers.employee_id` = "SG-001" (TEXT, business code) |
| `workers.auth_user_id` = UUID (FK)         | `workers.id` = UUID (PK, direct auth link)             |
| `clock_ins.worker_id` = "SG-001" (TEXT FK) | `clock_ins.worker_id` = UUID (FK to workers.id)        |
| All foreign keys = TEXT                    | All foreign keys = UUID (maintains auth chain)         |

### Why This Matters:

✅ **Best Practice**: Primary key = auth identity (UUID)  
✅ **Performance**: Direct auth lookups without JOINs  
✅ **Security**: Simpler RLS policies (`worker_id = auth.uid()`)  
✅ **Scalability**: UUID foreign keys maintain auth chain

---

## ⚠️ Prerequisites

### 1. Backup Your Data

```sql
-- Run in Supabase SQL Editor BEFORE migration
CREATE TABLE workers_manual_backup AS SELECT * FROM workers;
CREATE TABLE clock_ins_manual_backup AS SELECT * FROM clock_ins;
CREATE TABLE w9_submissions_manual_backup AS SELECT * FROM w9_submissions;
-- Add more tables as needed
```

### 2. Verify Current State

```sql
-- Check current workers structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'workers'
ORDER BY ordinal_position;

-- Count records (verify after migration)
SELECT 'workers' as table_name, COUNT(*) as record_count FROM workers
UNION ALL
SELECT 'clock_ins', COUNT(*) FROM clock_ins
UNION ALL
SELECT 'w9_submissions', COUNT(*) FROM w9_submissions;
```

### 3. Ensure Auth Users Exist

```sql
-- Verify all workers have Supabase Auth accounts
SELECT
  w.employee_id,
  w.display_name,
  w.email,
  w.auth_user_id,
  CASE
    WHEN w.auth_user_id IS NULL THEN '❌ Missing auth'
    ELSE '✅ Has auth'
  END as auth_status
FROM workers w
ORDER BY auth_status, employee_id;
```

**If any workers show "❌ Missing auth"**:

- Run `scripts/setup/create-all-worker-auth.js` to create auth accounts
- Or manually create auth users in Supabase Dashboard

---

## 🚀 Migration Steps

### Step 1: Apply UUID Migration

**File**: `sql/migrations/004-uuid-primary-key-migration.sql`

```powershell
# In Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Create new query
# 3. Copy entire contents of 004-uuid-primary-key-migration.sql
# 4. Click "Run" (executes in single transaction)
```

**Expected Output:**

```
NOTICE:  Verification passed: 18 workers migrated successfully
 auth_uuid | business_code | display_name | email | role
-----------+---------------+--------------+-------+------
 3b800...  | SG-001        | Steve Garay  | ...   | Admin
 ...
```

**What this does:**

- ✅ Backs up workers table automatically
- ✅ Renames columns (`id` → `employee_id`, `auth_user_id` → `id`)
- ✅ Updates all foreign keys across 7 tables
- ✅ Verifies no data loss
- ✅ Rolls back automatically if any step fails

### Step 2: Verify Migration Success

```sql
-- Check new structure
SELECT
  id as auth_uuid,
  employee_id as business_code,
  display_name,
  email,
  role
FROM workers
LIMIT 5;

-- Verify foreign keys updated
SELECT
  ci.id as clockin_id,
  ci.worker_id as auth_uuid,
  w.employee_id as business_code,
  w.display_name
FROM clock_ins ci
JOIN workers w ON ci.worker_id = w.id
LIMIT 5;

-- Check record counts match backup
SELECT
  (SELECT COUNT(*) FROM workers) as current_workers,
  (SELECT COUNT(*) FROM workers_backup_pre_uuid) as backup_workers,
  CASE
    WHEN (SELECT COUNT(*) FROM workers) = (SELECT COUNT(*) FROM workers_backup_pre_uuid)
    THEN '✅ Counts match'
    ELSE '❌ DATA LOSS!'
  END as verification;
```

### Step 3: Apply RLS Policies

**File**: `sql/migrations/005-enable-rls-policies.sql`

```powershell
# In Supabase Dashboard SQL Editor:
# 1. Create new query
# 2. Copy entire contents of 005-enable-rls-policies.sql
# 3. Click "Run"
```

**Expected Output:**

```
 schemaname | tablename | rls_enabled
------------+-----------+-------------
 public     | workers   | t
 public     | clock_ins | t
 ...
```

**What this does:**

- ✅ Enables RLS on all tables
- ✅ Creates helper functions (`is_admin()`, `is_admin_or_supervisor()`)
- ✅ Implements role-based policies
- ✅ Protects sensitive data (payroll, W9s)

### Step 4: Test RLS Policies

```sql
-- Test as authenticated user (simulate worker login)
-- This should work:
SELECT * FROM workers WHERE is_active = true;

-- This should fail (only admins can see all payroll):
SELECT * FROM payroll_line_items;
-- Expected: Returns only own payroll or empty (if you're not admin)

-- Test admin functions
SELECT is_admin(); -- Should return true for admin, false for others
```

---

## 🧪 Testing Checklist

After migration, verify:

- [ ] **Workers Table**

  - [ ] `id` column is now UUID (not TEXT)
  - [ ] `employee_id` column exists with business codes
  - [ ] Record count matches pre-migration
  - [ ] All emails unique and present

- [ ] **Foreign Keys**

  - [ ] `clock_ins.worker_id` is UUID
  - [ ] `time_edit_requests.worker_id` is UUID
  - [ ] `w9_submissions.worker_id` is UUID (if table exists)
  - [ ] `payroll_line_items.worker_id` is UUID

- [ ] **RLS Policies**

  - [ ] Workers table shows "Enabled" in Supabase Dashboard
  - [ ] Admins can view all data
  - [ ] Workers can only see their own payroll
  - [ ] Workers can view all active workers (for UI)

- [ ] **Application Testing**
  - [ ] Login still works
  - [ ] Dashboard loads worker list
  - [ ] Clock-ins display correctly
  - [ ] Payroll shows only own records (non-admins)

---

## 🔄 Rollback (Emergency Only)

**⚠️ WARNING**: Only use immediately after migration if critical failure occurs.

```sql
BEGIN;

-- Drop new structure
DROP TABLE IF EXISTS workers CASCADE;

-- Restore from backup
ALTER TABLE workers_backup_pre_uuid RENAME TO workers;

-- Manually recreate foreign keys (simplified example)
ALTER TABLE clock_ins
ADD CONSTRAINT clock_ins_worker_id_fkey
FOREIGN KEY (worker_id) REFERENCES workers(id);

-- Repeat for other tables...

COMMIT;
```

**Better approach**: Contact support for assistance. Automatic backup created during migration.

---

## 📝 Post-Migration Tasks

### 1. Update Application Code

**Files to update:**

- `src/services/supabase.js` - Change queries
- React components using worker data
- Migration scripts

**Example changes:**

```javascript
// ❌ Old: Query by TEXT id
.eq('id', 'SG-001')

// ✅ New: Query by employee_id for business codes
.eq('employee_id', 'SG-001')

// ✅ Or query by UUID for auth-based lookups
.eq('id', authUser.id)
```

### 2. Drop Backup Tables (After 7 Days)

```sql
-- Only after confirming everything works!
DROP TABLE IF EXISTS workers_backup_pre_uuid;
DROP TABLE IF EXISTS workers_manual_backup;
-- Drop other manual backups...
```

### 3. Update Documentation

- [ ] Update `MIGRATION_PROGRESS.md` with completion status
- [ ] Document any issues encountered
- [ ] Update API documentation with new column names

---

## 🆘 Troubleshooting

### Issue: "foreign key constraint fails"

**Cause**: Some workers missing Supabase Auth accounts  
**Fix**: Run `scripts/setup/create-all-worker-auth.js` before migration

### Issue: "data loss detected"

**Cause**: Transaction error during migration  
**Fix**: Migration auto-rolls back. Check error message, fix issue, retry

### Issue: RLS blocks all access

**Cause**: User not authenticated or role mismatch  
**Fix**:

```sql
-- Temporarily disable RLS for debugging (DEV ONLY!)
ALTER TABLE workers DISABLE ROW LEVEL SECURITY;

-- Check user role
SELECT id, email, role FROM workers WHERE email = 'your-email@example.com';

-- Re-enable RLS
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
```

### Issue: Application queries fail

**Cause**: Code still using old column names  
**Fix**: Update queries from `.eq('id', 'SG-001')` to `.eq('employee_id', 'SG-001')`

---

## ✅ Success Criteria

Migration is successful when:

1. ✅ All workers have UUID primary keys
2. ✅ Record counts match pre-migration
3. ✅ Foreign keys updated across all tables
4. ✅ RLS policies enabled on all tables
5. ✅ Application login works
6. ✅ Dashboard displays correct data
7. ✅ Workers see only their own sensitive data

---

## 📚 Related Files

- **Migration SQL**: `sql/migrations/004-uuid-primary-key-migration.sql`
- **RLS SQL**: `sql/migrations/005-enable-rls-policies.sql`
- **Updated Schema**: `sql/schemas/supabase-schema.sql`
- **Setup Scripts**: `scripts/setup/create-all-worker-auth.js`
- **Migration Progress**: `docs/migration/MIGRATION_PROGRESS.md`

---

## 🎯 Next Phase

After successful UUID migration and RLS:

- **Phase 3**: Migrate time edit requests
- **Phase 4**: Migrate clock-ins data
- **Phase 5**: Migrate payroll data

Each phase will benefit from the clean UUID structure established here.
