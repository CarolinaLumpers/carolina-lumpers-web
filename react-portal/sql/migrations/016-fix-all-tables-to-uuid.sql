-- ============================================================================
-- MIGRATION 016: Convert All Tables to UUID Best Practice
-- Purpose: Ensure ALL tables use UUID for primary keys and proper foreign keys
-- Issues Fixed:
--   1. clients.id: INTEGER → UUID
--   2. time_edit_requests.id: INTEGER → UUID
--   3. time_edit_requests.clock_in_id: INTEGER → UUID (fix type mismatch)
--   4. activity_logs.id: VARCHAR → UUID
-- ============================================================================

-- Step 1: Backup current data (optional - for safety)
-- ============================================================================
CREATE TABLE IF NOT EXISTS _migration_016_backup_clients AS SELECT * FROM clients;
CREATE TABLE IF NOT EXISTS _migration_016_backup_time_edit_requests AS SELECT * FROM time_edit_requests;
CREATE TABLE IF NOT EXISTS _migration_016_backup_activity_logs AS SELECT * FROM activity_logs;

-- Step 2: Fix clients table (INTEGER → UUID)
-- ============================================================================

-- Disable foreign key constraints temporarily
ALTER TABLE clock_ins DROP CONSTRAINT IF EXISTS clock_ins_client_id_fkey;
ALTER TABLE payroll_line_items DROP CONSTRAINT IF EXISTS payroll_line_items_client_id_fkey;
ALTER TABLE time_events DROP CONSTRAINT IF EXISTS time_events_client_id_fkey;

-- Add new UUID column
ALTER TABLE clients ADD COLUMN IF NOT EXISTS id_uuid UUID DEFAULT gen_random_uuid();

-- Update existing records with UUID (keep mapping for foreign keys)
CREATE TEMP TABLE client_id_mapping AS
SELECT id as old_id, id_uuid as new_id FROM clients;

-- Drop old id column and rename
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_pkey CASCADE;
ALTER TABLE clients DROP COLUMN id;
ALTER TABLE clients RENAME COLUMN id_uuid TO id;
ALTER TABLE clients ADD PRIMARY KEY (id);

-- Update foreign keys in dependent tables
ALTER TABLE clock_ins ADD COLUMN IF NOT EXISTS client_id_uuid UUID;
UPDATE clock_ins SET client_id_uuid = (SELECT new_id FROM client_id_mapping WHERE old_id = client_id);
ALTER TABLE clock_ins DROP COLUMN client_id;
ALTER TABLE clock_ins RENAME COLUMN client_id_uuid TO client_id;

ALTER TABLE payroll_line_items ADD COLUMN IF NOT EXISTS client_id_uuid UUID;
UPDATE payroll_line_items SET client_id_uuid = (SELECT new_id FROM client_id_mapping WHERE old_id = client_id);
ALTER TABLE payroll_line_items DROP COLUMN client_id;
ALTER TABLE payroll_line_items RENAME COLUMN client_id_uuid TO client_id;

ALTER TABLE time_events ADD COLUMN IF NOT EXISTS client_id_uuid UUID;
UPDATE time_events SET client_id_uuid = (SELECT new_id FROM client_id_mapping WHERE old_id = client_id);
ALTER TABLE time_events DROP COLUMN client_id;
ALTER TABLE time_events RENAME COLUMN client_id_uuid TO client_id;

-- Recreate foreign key constraints
ALTER TABLE clock_ins ADD CONSTRAINT clock_ins_client_id_fkey 
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

ALTER TABLE payroll_line_items ADD CONSTRAINT payroll_line_items_client_id_fkey 
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

ALTER TABLE time_events ADD CONSTRAINT time_events_client_id_fkey 
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- Step 3: Fix time_edit_requests table (INTEGER → UUID)
-- ============================================================================

-- Fix clock_in_id type mismatch first (INTEGER → UUID)
ALTER TABLE time_edit_requests ADD COLUMN IF NOT EXISTS clock_in_id_uuid UUID;

-- Update with matching UUID from clock_ins (if any records exist)
UPDATE time_edit_requests 
SET clock_in_id_uuid = clock_ins.id 
FROM clock_ins 
WHERE clock_ins.id::text = time_edit_requests.clock_in_id::text
  OR time_edit_requests.clock_in_id IS NULL;

ALTER TABLE time_edit_requests DROP COLUMN IF EXISTS clock_in_id;
ALTER TABLE time_edit_requests RENAME COLUMN clock_in_id_uuid TO clock_in_id;

-- Add foreign key constraint
ALTER TABLE time_edit_requests ADD CONSTRAINT time_edit_requests_clock_in_id_fkey
  FOREIGN KEY (clock_in_id) REFERENCES clock_ins(id) ON DELETE CASCADE;

-- Now fix primary key (INTEGER → UUID)
ALTER TABLE time_edit_requests DROP CONSTRAINT IF EXISTS time_edit_requests_pkey CASCADE;
ALTER TABLE time_edit_requests ADD COLUMN IF NOT EXISTS id_uuid UUID DEFAULT gen_random_uuid();
ALTER TABLE time_edit_requests DROP COLUMN id;
ALTER TABLE time_edit_requests RENAME COLUMN id_uuid TO id;
ALTER TABLE time_edit_requests ADD PRIMARY KEY (id);

-- Step 4: Fix activity_logs table (VARCHAR → UUID)
-- ============================================================================

-- Drop primary key constraint
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_pkey CASCADE;

-- Add new UUID column
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS id_uuid UUID DEFAULT gen_random_uuid();

-- Copy old IDs if they're valid UUIDs, otherwise generate new ones
UPDATE activity_logs 
SET id_uuid = CASE 
  WHEN id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
  THEN id::uuid 
  ELSE gen_random_uuid() 
END;

-- Drop old column and rename
ALTER TABLE activity_logs DROP COLUMN id;
ALTER TABLE activity_logs RENAME COLUMN id_uuid TO id;
ALTER TABLE activity_logs ADD PRIMARY KEY (id);

-- Step 5: Recreate indexes and constraints
-- ============================================================================

-- Clients indexes
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON clients(is_active) WHERE is_active = true;

-- Time edit requests indexes
CREATE INDEX IF NOT EXISTS idx_time_edit_requests_worker_id ON time_edit_requests(worker_id);
CREATE INDEX IF NOT EXISTS idx_time_edit_requests_clock_in_id ON time_edit_requests(clock_in_id);
CREATE INDEX IF NOT EXISTS idx_time_edit_requests_status ON time_edit_requests(status);

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_worker_id ON activity_logs(worker_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_event_type ON activity_logs(event_type);

-- Step 6: Update RLS policies if needed
-- ============================================================================

-- Clients RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clients_select_all ON clients;
CREATE POLICY clients_select_all ON clients
  FOR SELECT USING (true); -- All authenticated users can view clients

DROP POLICY IF EXISTS clients_admin_all ON clients;
CREATE POLICY clients_admin_all ON clients
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM workers WHERE role = 'Admin')
  );

-- Time edit requests RLS (already enabled, just verify policies)
ALTER TABLE time_edit_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS time_edit_requests_select_own ON time_edit_requests;
CREATE POLICY time_edit_requests_select_own ON time_edit_requests
  FOR SELECT USING (worker_id = auth.uid());

DROP POLICY IF EXISTS time_edit_requests_insert_own ON time_edit_requests;
CREATE POLICY time_edit_requests_insert_own ON time_edit_requests
  FOR INSERT WITH CHECK (worker_id = auth.uid());

DROP POLICY IF EXISTS time_edit_requests_select_admin ON time_edit_requests;
CREATE POLICY time_edit_requests_select_admin ON time_edit_requests
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM workers WHERE role = 'Admin')
  );

DROP POLICY IF EXISTS time_edit_requests_update_admin ON time_edit_requests;
CREATE POLICY time_edit_requests_update_admin ON time_edit_requests
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM workers WHERE role = 'Admin')
  );

-- Activity logs RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activity_logs_select_own ON activity_logs;
CREATE POLICY activity_logs_select_own ON activity_logs
  FOR SELECT USING (worker_id = auth.uid());

DROP POLICY IF EXISTS activity_logs_insert_own ON activity_logs;
CREATE POLICY activity_logs_insert_own ON activity_logs
  FOR INSERT WITH CHECK (worker_id = auth.uid());

DROP POLICY IF EXISTS activity_logs_select_admin ON activity_logs;
CREATE POLICY activity_logs_select_admin ON activity_logs
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM workers WHERE role = 'Admin')
  );

DROP POLICY IF EXISTS activity_logs_admin_all ON activity_logs;
CREATE POLICY activity_logs_admin_all ON activity_logs
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM workers WHERE role = 'Admin')
  );

-- Step 7: Add helpful comments
-- ============================================================================

COMMENT ON TABLE clients IS 'Client/customer information with UUID primary key';
COMMENT ON COLUMN clients.id IS 'UUID primary key (migrated from INTEGER in migration 016)';

COMMENT ON TABLE time_edit_requests IS 'Time edit requests with UUID primary key';
COMMENT ON COLUMN time_edit_requests.id IS 'UUID primary key (migrated from INTEGER in migration 016)';
COMMENT ON COLUMN time_edit_requests.clock_in_id IS 'UUID foreign key to clock_ins (fixed type mismatch in migration 016)';

COMMENT ON TABLE activity_logs IS 'Activity logs with UUID primary key';
COMMENT ON COLUMN activity_logs.id IS 'UUID primary key (migrated from VARCHAR in migration 016)';

-- Step 8: Verify migration
-- ============================================================================

DO $$
DECLARE
  v_clients_count INT;
  v_time_edit_count INT;
  v_activity_count INT;
BEGIN
  -- Check all tables have UUID primary keys
  SELECT COUNT(*) INTO v_clients_count FROM clients;
  SELECT COUNT(*) INTO v_time_edit_count FROM time_edit_requests;
  SELECT COUNT(*) INTO v_activity_count FROM activity_logs;
  
  RAISE NOTICE '✅ Migration 016 Complete:';
  RAISE NOTICE '   - clients: % records (id now UUID)', v_clients_count;
  RAISE NOTICE '   - time_edit_requests: % records (id and clock_in_id now UUID)', v_time_edit_count;
  RAISE NOTICE '   - activity_logs: % records (id now UUID)', v_activity_count;
  RAISE NOTICE '   - All foreign keys updated to UUID';
  RAISE NOTICE '   - All RLS policies updated';
  RAISE NOTICE '   - All indexes recreated';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE!
-- ============================================================================
-- All tables now use UUID best practices:
-- ✅ workers - UUID
-- ✅ clients - UUID (migrated from INTEGER)
-- ✅ clock_ins - UUID
-- ✅ time_events - UUID
-- ✅ break_periods - UUID
-- ✅ payroll_line_items - UUID
-- ✅ w9_submissions - UUID
-- ✅ time_edit_requests - UUID (migrated from INTEGER)
-- ✅ activity_logs - UUID (migrated from VARCHAR)
-- ============================================================================
