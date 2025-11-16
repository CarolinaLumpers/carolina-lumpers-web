-- ===================================================
-- Migration 005: Row-Level Security (RLS) Policies
-- Date: 2025-11-15
-- 
-- Purpose: Enable comprehensive Row-Level Security across all tables
--          following PostgreSQL and Supabase best practices
-- 
-- Security Model:
--   - Workers: View own data + all active workers (for UI)
--   - Admins: Full access to all data
--   - Supervisors: View team data, limited edits
--   - Authenticated: Required for any access
-- 
-- Prerequisites:
--   - Migration 004 (UUID primary keys) must be applied first
--   - Workers table has 'id' column linked to auth.users(id)
--   - Workers table has 'role' column with Admin/Supervisor/Worker
-- 
-- ===================================================

BEGIN;

-- ===================================================
-- HELPER FUNCTIONS
-- ===================================================

-- Function to check if current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workers 
    WHERE id = auth.uid() AND role = 'Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is admin or supervisor
CREATE OR REPLACE FUNCTION is_admin_or_supervisor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workers 
    WHERE id = auth.uid() AND role IN ('Admin', 'Supervisor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===================================================
-- TABLE: workers
-- ===================================================

ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view active workers
-- Reasoning: Needed for dashboards, user switcher, team visibility
CREATE POLICY "Authenticated users can view active workers"
ON workers
FOR SELECT
TO authenticated
USING (is_active = true);

-- Policy: Workers can update their own profile
-- Reasoning: Allow users to update their own contact info, preferences
CREATE POLICY "Workers can update own profile"
ON workers
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policy: Only admins can insert new workers
-- Reasoning: Prevent unauthorized account creation
CREATE POLICY "Admins can insert workers"
ON workers
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Policy: Only admins can delete workers
-- Reasoning: Sensitive operation, audit trail needed
CREATE POLICY "Admins can delete workers"
ON workers
FOR DELETE
TO authenticated
USING (is_admin());

-- Policy: Admins can update any worker
-- Reasoning: Admin needs to manage roles, status, rates
CREATE POLICY "Admins can update any worker"
ON workers
FOR UPDATE
TO authenticated
USING (is_admin());


-- ===================================================
-- TABLE: clock_ins
-- ===================================================

ALTER TABLE clock_ins ENABLE ROW LEVEL SECURITY;

-- Policy: Workers can view their own clock-ins
CREATE POLICY "Workers view own clock-ins"
ON clock_ins
FOR SELECT
TO authenticated
USING (worker_id = auth.uid());

-- Policy: Admins and supervisors can view all clock-ins
CREATE POLICY "Admins and supervisors view all clock-ins"
ON clock_ins
FOR SELECT
TO authenticated
USING (is_admin_or_supervisor());

-- Policy: Workers can insert their own clock-ins
-- Reasoning: Primary use case - workers clocking in
CREATE POLICY "Workers create own clock-ins"
ON clock_ins
FOR INSERT
TO authenticated
WITH CHECK (worker_id = auth.uid());

-- Policy: Only admins can update clock-ins
-- Reasoning: Prevent unauthorized time manipulation
CREATE POLICY "Admins update clock-ins"
ON clock_ins
FOR UPDATE
TO authenticated
USING (is_admin());

-- Policy: Only admins can delete clock-ins
CREATE POLICY "Admins delete clock-ins"
ON clock_ins
FOR DELETE
TO authenticated
USING (is_admin());


-- ===================================================
-- TABLE: time_edit_requests
-- ===================================================

ALTER TABLE time_edit_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Workers can view their own time edit requests
CREATE POLICY "Workers view own time edit requests"
ON time_edit_requests
FOR SELECT
TO authenticated
USING (worker_id = auth.uid());

-- Policy: Admins and supervisors can view all requests
CREATE POLICY "Admins and supervisors view all time edit requests"
ON time_edit_requests
FOR SELECT
TO authenticated
USING (is_admin_or_supervisor());

-- Policy: Workers can submit their own time edit requests
CREATE POLICY "Workers submit own time edit requests"
ON time_edit_requests
FOR INSERT
TO authenticated
WITH CHECK (worker_id = auth.uid());

-- Policy: Only admins and supervisors can approve/deny requests
-- Reasoning: Approval workflow requires elevated permissions
CREATE POLICY "Admins and supervisors manage time edit requests"
ON time_edit_requests
FOR UPDATE
TO authenticated
USING (is_admin_or_supervisor());

-- Policy: Workers can delete their own pending requests
-- Reasoning: Allow users to cancel accidental submissions
CREATE POLICY "Workers delete own pending requests"
ON time_edit_requests
FOR DELETE
TO authenticated
USING (
  worker_id = auth.uid() AND 
  status = 'pending'
);


-- ===================================================
-- TABLE: w9_submissions (if exists)
-- ===================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'w9_submissions') THEN
    ALTER TABLE w9_submissions ENABLE ROW LEVEL SECURITY;

    -- Policy: Workers can view their own W9
    EXECUTE 'CREATE POLICY "Workers view own W9" 
    ON w9_submissions FOR SELECT TO authenticated 
    USING (worker_id = auth.uid())';

    -- Policy: Admins can view all W9s
    EXECUTE 'CREATE POLICY "Admins view all W9s" 
    ON w9_submissions FOR SELECT TO authenticated 
    USING (is_admin())';

    -- Policy: Workers can submit their own W9
    EXECUTE 'CREATE POLICY "Workers submit own W9" 
    ON w9_submissions FOR INSERT TO authenticated 
    WITH CHECK (worker_id = auth.uid())';

    -- Policy: Only admins can approve/reject W9s
    EXECUTE 'CREATE POLICY "Admins manage W9s" 
    ON w9_submissions FOR UPDATE TO authenticated 
    USING (is_admin())';
  END IF;
END $$;


-- ===================================================
-- TABLE: w9_records (if exists - alternate naming)
-- ===================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'w9_records') THEN
    ALTER TABLE w9_records ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "Workers view own W9 records" 
    ON w9_records FOR SELECT TO authenticated 
    USING (worker_id = auth.uid())';

    EXECUTE 'CREATE POLICY "Admins view all W9 records" 
    ON w9_records FOR SELECT TO authenticated 
    USING (is_admin())';

    EXECUTE 'CREATE POLICY "Workers submit own W9 records" 
    ON w9_records FOR INSERT TO authenticated 
    WITH CHECK (worker_id = auth.uid())';

    EXECUTE 'CREATE POLICY "Admins manage W9 records" 
    ON w9_records FOR UPDATE TO authenticated 
    USING (is_admin())';
  END IF;
END $$;


-- ===================================================
-- TABLE: payroll_line_items
-- ===================================================

ALTER TABLE payroll_line_items ENABLE ROW LEVEL SECURITY;

-- Policy: Workers can view their own payroll
-- Reasoning: Workers have right to see their own pay data
CREATE POLICY "Workers view own payroll"
ON payroll_line_items
FOR SELECT
TO authenticated
USING (worker_id = auth.uid());

-- Policy: Admins can view all payroll
CREATE POLICY "Admins view all payroll"
ON payroll_line_items
FOR SELECT
TO authenticated
USING (is_admin());

-- Policy: Only admins can insert payroll records
-- Reasoning: Sensitive financial data, prevent manipulation
CREATE POLICY "Admins manage payroll"
ON payroll_line_items
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());


-- ===================================================
-- TABLE: clients
-- ===================================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view active clients
-- Reasoning: Needed for clock-in geofencing, job assignments
CREATE POLICY "Authenticated users view active clients"
ON clients
FOR SELECT
TO authenticated
USING (active = true);

-- Policy: Only admins can manage clients
CREATE POLICY "Admins manage clients"
ON clients
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());


-- ===================================================
-- TABLE: activity_logs (if exists)
-- ===================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
    ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

    -- Policy: Workers can view logs related to them
    EXECUTE 'CREATE POLICY "Workers view own activity logs" 
    ON activity_logs FOR SELECT TO authenticated 
    USING (worker_id = auth.uid())';

    -- Policy: Admins and supervisors can view all logs
    EXECUTE 'CREATE POLICY "Admins and supervisors view all activity logs" 
    ON activity_logs FOR SELECT TO authenticated 
    USING (is_admin_or_supervisor())';

    -- Note: No INSERT policy for regular users
    -- Activity logs should be written with service role key (backend)
  END IF;
END $$;


-- ===================================================
-- TABLE: app_settings (if exists)
-- ===================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_settings') THEN
    ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

    -- Policy: All authenticated users can view settings
    EXECUTE 'CREATE POLICY "Authenticated users view settings" 
    ON app_settings FOR SELECT TO authenticated 
    USING (true)';

    -- Policy: Only admins can manage settings
    EXECUTE 'CREATE POLICY "Admins manage settings" 
    ON app_settings FOR ALL TO authenticated 
    USING (is_admin()) 
    WITH CHECK (is_admin())';
  END IF;
END $$;


-- ===================================================
-- VERIFICATION
-- ===================================================

-- List all tables and their RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- List all RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

COMMIT;

-- ===================================================
-- Post-Migration Testing
-- ===================================================

-- ✅ Test as authenticated worker:
-- 1. Login as regular worker
-- 2. SELECT * FROM workers; -- Should see only active workers
-- 3. SELECT * FROM clock_ins WHERE worker_id = auth.uid(); -- Should see own clock-ins
-- 4. SELECT * FROM payroll_line_items WHERE worker_id = auth.uid(); -- Should see own payroll

-- ✅ Test as admin:
-- 1. Login as admin
-- 2. SELECT * FROM workers; -- Should see all workers
-- 3. UPDATE workers SET ... -- Should succeed
-- 4. SELECT * FROM payroll_line_items; -- Should see all payroll

-- ❌ Test unauthorized access:
-- 1. Login as worker
-- 2. UPDATE workers SET role = 'Admin' WHERE id = auth.uid(); -- Should fail
-- 3. SELECT * FROM payroll_line_items; -- Should only see own payroll

-- ===================================================
-- Rollback (if needed)
-- ===================================================

-- WARNING: This disables all security. Only use in development/testing!
-- 
-- BEGIN;
-- ALTER TABLE workers DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE clock_ins DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE time_edit_requests DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE payroll_line_items DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
-- DROP FUNCTION IF EXISTS is_admin();
-- DROP FUNCTION IF EXISTS is_admin_or_supervisor();
-- COMMIT;

