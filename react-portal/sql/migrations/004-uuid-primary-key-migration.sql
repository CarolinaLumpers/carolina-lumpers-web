-- ===================================================
-- Migration 004: UUID Primary Key Migration
-- Date: 2025-11-15
-- 
-- Purpose: Migrate from TEXT-based worker IDs to UUID-based primary keys
--          following industry best practices for authentication integration
-- 
-- Changes:
--   - workers.id (TEXT "SG-001") → workers.employee_id (business code)
--   - workers.auth_user_id (UUID) → workers.id (primary key, auth link)
--   - Update all foreign key references across related tables
-- 
-- Impact: All tables that reference workers will update their foreign keys
--         to use UUIDs instead of TEXT employee codes
-- 
-- Rollback: See bottom of file for rollback instructions
-- ===================================================

BEGIN;

-- ===================================================
-- STEP 1: Backup Current State (Safety)
-- ===================================================

-- Create backup table with current data
CREATE TABLE workers_backup_pre_uuid AS 
SELECT * FROM workers;

COMMENT ON TABLE workers_backup_pre_uuid IS 
'Backup before UUID migration on 2025-11-15. Drop after confirming success.';


-- ===================================================
-- STEP 2: Update Workers Table Structure
-- ===================================================

-- Rename current 'id' column to 'employee_id' (preserve business codes like "SG-001")
ALTER TABLE workers 
RENAME COLUMN id TO employee_id;

-- Rename 'auth_user_id' to 'id' (this becomes the new primary key)
ALTER TABLE workers 
RENAME COLUMN auth_user_id TO id;

-- Drop old primary key constraint
ALTER TABLE workers 
DROP CONSTRAINT workers_pkey;

-- Make 'id' (UUID) the new primary key
ALTER TABLE workers 
ADD PRIMARY KEY (id);

-- Ensure employee_id remains unique (business requirement)
ALTER TABLE workers 
ADD CONSTRAINT workers_employee_id_unique UNIQUE (employee_id);

-- Add index on employee_id for lookups
CREATE INDEX idx_workers_employee_id ON workers(employee_id);

-- Update foreign key reference to auth.users
ALTER TABLE workers 
ADD CONSTRAINT workers_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- ===================================================
-- STEP 3: Update clock_ins Table Foreign Keys
-- ===================================================

-- Rename current worker_id to worker_employee_id (temporary)
ALTER TABLE clock_ins 
RENAME COLUMN worker_id TO worker_employee_id;

-- Add new worker_id column as UUID
ALTER TABLE clock_ins 
ADD COLUMN worker_id UUID;

-- Populate new worker_id with UUIDs from workers table
UPDATE clock_ins 
SET worker_id = workers.id
FROM workers 
WHERE clock_ins.worker_employee_id = workers.employee_id;

-- Make worker_id NOT NULL after population
ALTER TABLE clock_ins 
ALTER COLUMN worker_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE clock_ins 
ADD CONSTRAINT clock_ins_worker_id_fkey 
FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX idx_clock_ins_worker_id ON clock_ins(worker_id);

-- Drop old column (after verification)
ALTER TABLE clock_ins 
DROP COLUMN worker_employee_id;


-- ===================================================
-- STEP 4: Update time_edit_requests Table
-- ===================================================

-- Rename current worker_id to worker_employee_id (temporary)
ALTER TABLE time_edit_requests 
RENAME COLUMN worker_id TO worker_employee_id;

-- Add new worker_id column as UUID
ALTER TABLE time_edit_requests 
ADD COLUMN worker_id UUID;

-- Populate new worker_id with UUIDs
UPDATE time_edit_requests 
SET worker_id = workers.id
FROM workers 
WHERE time_edit_requests.worker_employee_id = workers.employee_id;

-- Make worker_id NOT NULL
ALTER TABLE time_edit_requests 
ALTER COLUMN worker_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE time_edit_requests 
ADD CONSTRAINT time_edit_requests_worker_id_fkey 
FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE;

-- Update reviewed_by column (also references workers)
ALTER TABLE time_edit_requests 
RENAME COLUMN reviewed_by TO reviewed_by_employee_id;

ALTER TABLE time_edit_requests 
ADD COLUMN reviewed_by UUID;

UPDATE time_edit_requests 
SET reviewed_by = workers.id
FROM workers 
WHERE time_edit_requests.reviewed_by_employee_id = workers.employee_id;

-- Add foreign key for reviewed_by
ALTER TABLE time_edit_requests 
ADD CONSTRAINT time_edit_requests_reviewed_by_fkey 
FOREIGN KEY (reviewed_by) REFERENCES workers(id) ON DELETE SET NULL;

-- Drop old columns
ALTER TABLE time_edit_requests 
DROP COLUMN worker_employee_id,
DROP COLUMN reviewed_by_employee_id;


-- ===================================================
-- STEP 5: Update w9_submissions Table
-- ===================================================

-- Check if w9_submissions exists (might be w9_records)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'w9_submissions') THEN
    -- Rename current worker_id to worker_employee_id
    ALTER TABLE w9_submissions 
    RENAME COLUMN worker_id TO worker_employee_id;

    -- Add new worker_id as UUID
    ALTER TABLE w9_submissions 
    ADD COLUMN worker_id UUID;

    -- Populate with UUIDs
    UPDATE w9_submissions 
    SET worker_id = workers.id
    FROM workers 
    WHERE w9_submissions.worker_employee_id = workers.employee_id;

    -- Make NOT NULL
    ALTER TABLE w9_submissions 
    ALTER COLUMN worker_id SET NOT NULL;

    -- Add foreign key
    ALTER TABLE w9_submissions 
    ADD CONSTRAINT w9_submissions_worker_id_fkey 
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE;

    -- Drop old column
    ALTER TABLE w9_submissions 
    DROP COLUMN worker_employee_id;
  END IF;
END $$;


-- ===================================================
-- STEP 6: Update w9_records Table (if exists)
-- ===================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'w9_records') THEN
    -- Rename current worker_id
    ALTER TABLE w9_records 
    RENAME COLUMN worker_id TO worker_employee_id;

    -- Add new worker_id as UUID
    ALTER TABLE w9_records 
    ADD COLUMN worker_id UUID;

    -- Populate with UUIDs
    UPDATE w9_records 
    SET worker_id = workers.id
    FROM workers 
    WHERE w9_records.worker_employee_id = workers.employee_id;

    -- Make NOT NULL
    ALTER TABLE w9_records 
    ALTER COLUMN worker_id SET NOT NULL;

    -- Add foreign key
    ALTER TABLE w9_records 
    ADD CONSTRAINT w9_records_worker_id_fkey 
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE;

    -- Update reviewed_by column
    ALTER TABLE w9_records 
    RENAME COLUMN reviewed_by TO reviewed_by_employee_id;

    ALTER TABLE w9_records 
    ADD COLUMN reviewed_by UUID;

    UPDATE w9_records 
    SET reviewed_by = workers.id
    FROM workers 
    WHERE w9_records.reviewed_by_employee_id = workers.employee_id;

    -- Add foreign key for reviewed_by
    ALTER TABLE w9_records 
    ADD CONSTRAINT w9_records_reviewed_by_fkey 
    FOREIGN KEY (reviewed_by) REFERENCES workers(id) ON DELETE SET NULL;

    -- Drop old columns
    ALTER TABLE w9_records 
    DROP COLUMN worker_employee_id,
    DROP COLUMN reviewed_by_employee_id;
  END IF;
END $$;


-- ===================================================
-- STEP 7: Update payroll_line_items Table
-- ===================================================

-- Rename current worker_id
ALTER TABLE payroll_line_items 
RENAME COLUMN worker_id TO worker_employee_id;

-- Add new worker_id as UUID
ALTER TABLE payroll_line_items 
ADD COLUMN worker_id UUID;

-- Populate with UUIDs
UPDATE payroll_line_items 
SET worker_id = workers.id
FROM workers 
WHERE payroll_line_items.worker_employee_id = workers.employee_id;

-- Make NOT NULL
ALTER TABLE payroll_line_items 
ALTER COLUMN worker_id SET NOT NULL;

-- Add foreign key
ALTER TABLE payroll_line_items 
ADD CONSTRAINT payroll_line_items_worker_id_fkey 
FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX idx_payroll_line_items_worker_id ON payroll_line_items(worker_id);

-- Drop old column
ALTER TABLE payroll_line_items 
DROP COLUMN worker_employee_id;


-- ===================================================
-- STEP 8: Verification Queries
-- ===================================================

-- Count records to ensure no data loss
DO $$
DECLARE
  backup_count INTEGER;
  current_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO backup_count FROM workers_backup_pre_uuid;
  SELECT COUNT(*) INTO current_count FROM workers;
  
  IF backup_count != current_count THEN
    RAISE EXCEPTION 'Data loss detected! Backup: %, Current: %', backup_count, current_count;
  END IF;
  
  RAISE NOTICE 'Verification passed: % workers migrated successfully', current_count;
END $$;

-- Show sample of migrated data
SELECT 
  id AS auth_uuid,
  employee_id AS business_code,
  display_name,
  email,
  role
FROM workers
ORDER BY created_at
LIMIT 5;

COMMIT;

-- ===================================================
-- Post-Migration Notes
-- ===================================================

-- ✅ After successful migration:
-- 1. Test application functionality
-- 2. Verify RLS policies work with new structure
-- 3. Update application code to query by employee_id (not id)
-- 4. Drop backup table: DROP TABLE workers_backup_pre_uuid;

-- ❌ ROLLBACK (Only if needed immediately after migration):
-- 
-- WARNING: This rollback is only safe if no new data was created after migration
-- 
-- BEGIN;
-- DROP TABLE IF EXISTS workers CASCADE;
-- ALTER TABLE workers_backup_pre_uuid RENAME TO workers;
-- -- Recreate all foreign keys manually
-- ROLLBACK;

