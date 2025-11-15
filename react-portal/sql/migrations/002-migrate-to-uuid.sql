-- =====================================================
-- UUID Standardization Migration
-- Convert workers table to use UUID primary key
-- Restructure: id (VARCHAR) -> employee_id (VARCHAR)
--              auth_user_id (UUID) -> id (UUID PRIMARY KEY)
-- =====================================================

BEGIN;

-- Step 1: Drop all foreign key constraints that reference workers(id)
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_worker_id_fkey;
ALTER TABLE app_settings DROP CONSTRAINT IF EXISTS app_settings_updated_by_fkey;
ALTER TABLE clock_ins DROP CONSTRAINT IF EXISTS clock_ins_worker_id_fkey;
ALTER TABLE payroll_line_items DROP CONSTRAINT IF EXISTS payroll_line_items_worker_id_fkey;
ALTER TABLE time_edit_requests DROP CONSTRAINT IF EXISTS time_edit_requests_worker_id_fkey;
ALTER TABLE time_edit_requests DROP CONSTRAINT IF EXISTS time_edit_requests_approved_by_fkey;
ALTER TABLE w9_submissions DROP CONSTRAINT IF EXISTS fk_w9_worker;
ALTER TABLE w9_submissions DROP CONSTRAINT IF EXISTS fk_w9_reviewed_by;

-- Step 2: Rename workers.id to workers.employee_id (keep legacy text ID)
ALTER TABLE workers RENAME COLUMN id TO employee_id;

-- Step 3: Rename workers.auth_user_id to workers.id (make UUID the primary key)
ALTER TABLE workers RENAME COLUMN auth_user_id TO id;

-- Step 4: Drop old primary key constraint on employee_id
ALTER TABLE workers DROP CONSTRAINT workers_pkey;

-- Step 5: Add new primary key on id (UUID)
ALTER TABLE workers ADD PRIMARY KEY (id);

-- Step 6: Add unique constraint and index on employee_id (for lookups)
ALTER TABLE workers ADD CONSTRAINT workers_employee_id_key UNIQUE (employee_id);
CREATE INDEX idx_workers_employee_id ON workers(employee_id);

-- Step 7: Rename the auth_user_id index (now id)
DROP INDEX IF EXISTS idx_workers_auth_user_id;
-- Primary key automatically creates index, so we don't need a separate one

-- Step 8: Add UUID columns to child tables (parallel to existing TEXT columns)
-- We'll keep both during transition, then drop TEXT columns later

-- activity_logs
ALTER TABLE activity_logs ADD COLUMN worker_uuid UUID;
UPDATE activity_logs al SET worker_uuid = w.id 
FROM workers w WHERE al.worker_id = w.employee_id;

-- app_settings
ALTER TABLE app_settings ADD COLUMN updated_by_uuid UUID;
UPDATE app_settings a SET updated_by_uuid = w.id 
FROM workers w WHERE a.updated_by = w.employee_id;

-- clock_ins
ALTER TABLE clock_ins ADD COLUMN worker_uuid UUID;
UPDATE clock_ins c SET worker_uuid = w.id 
FROM workers w WHERE c.worker_id = w.employee_id;

-- payroll_line_items
ALTER TABLE payroll_line_items ADD COLUMN worker_uuid UUID;
UPDATE payroll_line_items p SET worker_uuid = w.id 
FROM workers w WHERE p.worker_id = w.employee_id;

-- time_edit_requests
ALTER TABLE time_edit_requests ADD COLUMN worker_uuid UUID;
ALTER TABLE time_edit_requests ADD COLUMN approved_by_uuid UUID;
UPDATE time_edit_requests t SET worker_uuid = w.id 
FROM workers w WHERE t.worker_id = w.employee_id;
UPDATE time_edit_requests t SET approved_by_uuid = w.id 
FROM workers w WHERE t.approved_by = w.employee_id;

-- w9_submissions
ALTER TABLE w9_submissions ADD COLUMN worker_uuid UUID;
ALTER TABLE w9_submissions ADD COLUMN reviewed_by_uuid UUID;
UPDATE w9_submissions ws SET worker_uuid = w.id 
FROM workers w WHERE ws.worker_id = w.employee_id;
UPDATE w9_submissions ws SET reviewed_by_uuid = w.id 
FROM workers w WHERE ws.reviewed_by = w.employee_id;

-- Step 9: Make UUID columns NOT NULL where appropriate
ALTER TABLE activity_logs ALTER COLUMN worker_uuid SET NOT NULL;
ALTER TABLE clock_ins ALTER COLUMN worker_uuid SET NOT NULL;
ALTER TABLE payroll_line_items ALTER COLUMN worker_uuid SET NOT NULL;
ALTER TABLE time_edit_requests ALTER COLUMN worker_uuid SET NOT NULL;
ALTER TABLE w9_submissions ALTER COLUMN worker_uuid SET NOT NULL;

-- Step 10: Drop RLS policies that reference the old columns
DROP POLICY IF EXISTS "Workers can view own W9s" ON w9_submissions;
DROP POLICY IF EXISTS "Admins can view all W9s" ON w9_submissions;
DROP POLICY IF EXISTS "Workers can submit W9" ON w9_submissions;
DROP POLICY IF EXISTS "Admins can update W9s" ON w9_submissions;

-- Step 10b: Drop old TEXT worker_id columns
ALTER TABLE activity_logs DROP COLUMN worker_id;
ALTER TABLE app_settings DROP COLUMN updated_by;
ALTER TABLE clock_ins DROP COLUMN worker_id;
ALTER TABLE payroll_line_items DROP COLUMN worker_id;
ALTER TABLE time_edit_requests DROP COLUMN worker_id;
ALTER TABLE time_edit_requests DROP COLUMN approved_by;
ALTER TABLE w9_submissions DROP COLUMN worker_id;
ALTER TABLE w9_submissions DROP COLUMN reviewed_by;

-- Step 11: Rename UUID columns to original names
ALTER TABLE activity_logs RENAME COLUMN worker_uuid TO worker_id;
ALTER TABLE app_settings RENAME COLUMN updated_by_uuid TO updated_by;
ALTER TABLE clock_ins RENAME COLUMN worker_uuid TO worker_id;
ALTER TABLE payroll_line_items RENAME COLUMN worker_uuid TO worker_id;
ALTER TABLE time_edit_requests RENAME COLUMN worker_uuid TO worker_id;
ALTER TABLE time_edit_requests RENAME COLUMN approved_by_uuid TO approved_by;
ALTER TABLE w9_submissions RENAME COLUMN worker_uuid TO worker_id;
ALTER TABLE w9_submissions RENAME COLUMN reviewed_by_uuid TO reviewed_by;

-- Step 12: Recreate foreign key constraints (now referencing workers.id as UUID)
ALTER TABLE activity_logs 
  ADD CONSTRAINT activity_logs_worker_id_fkey 
  FOREIGN KEY (worker_id) REFERENCES workers(id);

ALTER TABLE app_settings 
  ADD CONSTRAINT app_settings_updated_by_fkey 
  FOREIGN KEY (updated_by) REFERENCES workers(id);

ALTER TABLE clock_ins 
  ADD CONSTRAINT clock_ins_worker_id_fkey 
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE;

ALTER TABLE payroll_line_items 
  ADD CONSTRAINT payroll_line_items_worker_id_fkey 
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE;

ALTER TABLE time_edit_requests 
  ADD CONSTRAINT time_edit_requests_worker_id_fkey 
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE;

ALTER TABLE time_edit_requests 
  ADD CONSTRAINT time_edit_requests_approved_by_fkey 
  FOREIGN KEY (approved_by) REFERENCES workers(id);

ALTER TABLE w9_submissions 
  ADD CONSTRAINT fk_w9_worker 
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE;

ALTER TABLE w9_submissions 
  ADD CONSTRAINT fk_w9_reviewed_by 
  FOREIGN KEY (reviewed_by) REFERENCES workers(id) ON DELETE SET NULL;

-- Step 13: Recreate indexes on foreign key columns for performance
CREATE INDEX idx_activity_logs_worker_id ON activity_logs(worker_id);
CREATE INDEX idx_app_settings_updated_by ON app_settings(updated_by);
CREATE INDEX idx_clock_ins_worker_id ON clock_ins(worker_id);
CREATE INDEX idx_payroll_line_items_worker_id ON payroll_line_items(worker_id);
CREATE INDEX idx_time_edit_requests_worker_id ON time_edit_requests(worker_id);
CREATE INDEX idx_time_edit_requests_approved_by ON time_edit_requests(approved_by);
CREATE INDEX idx_w9_submissions_worker_id ON w9_submissions(worker_id);
CREATE INDEX idx_w9_submissions_reviewed_by ON w9_submissions(reviewed_by);

-- Step 14: Update RLS policies to use new structure
-- Workers table policies remain the same (auth.uid() matches workers.id)

-- w9_submissions policies - update to use workers.id directly
DROP POLICY IF EXISTS "Workers can view own W9s" ON w9_submissions;
DROP POLICY IF EXISTS "Admins can view all W9s" ON w9_submissions;
DROP POLICY IF EXISTS "Workers can submit W9" ON w9_submissions;
DROP POLICY IF EXISTS "Admins can update W9s" ON w9_submissions;

CREATE POLICY "Workers can view own W9s" ON w9_submissions
  FOR SELECT 
  USING (worker_id = auth.uid());

CREATE POLICY "Admins can view all W9s" ON w9_submissions
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE id = auth.uid() 
      AND role IN ('Admin', 'Supervisor')
    )
  );

CREATE POLICY "Workers can submit W9" ON w9_submissions
  FOR INSERT 
  WITH CHECK (worker_id = auth.uid());

CREATE POLICY "Admins can update W9s" ON w9_submissions
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE id = auth.uid() 
      AND role = 'Admin'
    )
  );

-- Step 15: Add comments for documentation
COMMENT ON COLUMN workers.id IS 'UUID primary key from Supabase Auth (auth.uid())';
COMMENT ON COLUMN workers.employee_id IS 'Legacy text ID for display and Google Sheets sync (e.g., SG-001, YBQp-043)';

COMMIT;

-- Verification queries (run separately after commit):
-- SELECT id, employee_id, display_name FROM workers LIMIT 5;
-- SELECT COUNT(*) FROM workers WHERE id IS NOT NULL;
-- SELECT COUNT(*) FROM clock_ins c JOIN workers w ON c.worker_id = w.id;
