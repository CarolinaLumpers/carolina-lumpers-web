-- ============================================================================
-- PHASE 6: TIME EVENTS & BREAK TRACKING MIGRATION
-- Run this entire script in Supabase SQL Editor
-- Estimated time: 30 seconds
-- ============================================================================

-- Step 1: Create time_events table (replaces clock_ins with 1 record per shift)
-- ============================================================================

CREATE TABLE IF NOT EXISTS time_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  service_id TEXT,
  
  event_date DATE NOT NULL,
  clock_in_time TIMESTAMPTZ NOT NULL,
  clock_out_time TIMESTAMPTZ,
  
  clock_in_latitude DECIMAL(10, 8),
  clock_in_longitude DECIMAL(11, 8),
  clock_out_latitude DECIMAL(10, 8),
  clock_out_longitude DECIMAL(11, 8),
  distance_from_site_miles DECIMAL(5, 2),
  site_name TEXT,
  device_info TEXT,
  
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'approved', 'needs_review')),
  approved_by UUID REFERENCES workers(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  
  edit_status TEXT DEFAULT 'confirmed' CHECK (edit_status IN ('confirmed', 'pending', 'editing', 'denied')),
  original_clock_in TIMESTAMPTZ,
  original_clock_out TIMESTAMPTZ,
  edit_reason TEXT,
  
  total_break_minutes INTEGER DEFAULT 0,
  hours_worked DECIMAL(5, 2),
  
  container_number TEXT,
  project_number TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_clock_times CHECK (clock_out_time IS NULL OR clock_out_time > clock_in_time)
);

CREATE INDEX IF NOT EXISTS idx_time_events_worker_id ON time_events(worker_id);
CREATE INDEX IF NOT EXISTS idx_time_events_client_id ON time_events(client_id);
CREATE INDEX IF NOT EXISTS idx_time_events_event_date ON time_events(event_date);
CREATE INDEX IF NOT EXISTS idx_time_events_status ON time_events(status);
CREATE INDEX IF NOT EXISTS idx_time_events_worker_date ON time_events(worker_id, event_date);

COMMENT ON TABLE time_events IS 'Simplified time tracking - one record per shift. Replaces clock_ins table.';

-- Step 2: Create break_periods table (dedicated break tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS break_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_event_id UUID NOT NULL REFERENCES time_events(id) ON DELETE CASCADE,
  
  break_start TIMESTAMPTZ NOT NULL,
  break_end TIMESTAMPTZ,
  break_minutes INTEGER,
  break_type TEXT DEFAULT 'lunch' CHECK (break_type IN ('lunch', 'rest', 'other')),
  
  break_start_latitude DECIMAL(10, 8),
  break_start_longitude DECIMAL(11, 8),
  break_end_latitude DECIMAL(10, 8),
  break_end_longitude DECIMAL(11, 8),
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_break_times CHECK (break_end IS NULL OR break_end > break_start)
);

CREATE INDEX IF NOT EXISTS idx_break_periods_time_event_id ON break_periods(time_event_id);
CREATE INDEX IF NOT EXISTS idx_break_periods_break_start ON break_periods(break_start);

COMMENT ON TABLE break_periods IS 'Dedicated break tracking. Multiple breaks allowed per time_event.';

-- Step 3: Create trigger functions for automatic calculations
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_break_minutes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.break_end IS NOT NULL AND NEW.break_start IS NOT NULL THEN
    NEW.break_minutes := EXTRACT(EPOCH FROM (NEW.break_end - NEW.break_start)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_calculate_break_minutes
  BEFORE INSERT OR UPDATE ON break_periods
  FOR EACH ROW
  EXECUTE FUNCTION calculate_break_minutes();

CREATE OR REPLACE FUNCTION update_time_event_calculations()
RETURNS TRIGGER AS $$
DECLARE
  v_time_event_id UUID;
  v_total_breaks INTEGER;
  v_clock_in TIMESTAMPTZ;
  v_clock_out TIMESTAMPTZ;
BEGIN
  v_time_event_id := COALESCE(NEW.time_event_id, OLD.time_event_id);
  
  SELECT COALESCE(SUM(break_minutes), 0)
  INTO v_total_breaks
  FROM break_periods
  WHERE time_event_id = v_time_event_id
    AND break_minutes IS NOT NULL;
  
  SELECT clock_in_time, clock_out_time
  INTO v_clock_in, v_clock_out
  FROM time_events
  WHERE id = v_time_event_id;
  
  UPDATE time_events
  SET 
    total_break_minutes = v_total_breaks,
    hours_worked = CASE
      WHEN v_clock_out IS NOT NULL THEN
        ROUND(((EXTRACT(EPOCH FROM (v_clock_out - v_clock_in)) / 60) - v_total_breaks) / 60.0, 2)
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE id = v_time_event_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_update_time_event_on_break_change
  AFTER INSERT OR UPDATE OR DELETE ON break_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_time_event_calculations();

CREATE OR REPLACE FUNCTION recalculate_hours_on_clock_out()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_out_time IS NOT NULL AND (OLD.clock_out_time IS NULL OR NEW.clock_out_time != OLD.clock_out_time) THEN
    NEW.hours_worked := ROUND(
      ((EXTRACT(EPOCH FROM (NEW.clock_out_time - NEW.clock_in_time)) / 60) - NEW.total_break_minutes) / 60.0,
      2
    );
    NEW.status := 'completed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_recalculate_hours_on_clock_out
  BEFORE UPDATE ON time_events
  FOR EACH ROW
  WHEN (NEW.clock_out_time IS NOT NULL AND (OLD.clock_out_time IS NULL OR NEW.clock_out_time != OLD.clock_out_time))
  EXECUTE FUNCTION recalculate_hours_on_clock_out();

-- Step 4: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE time_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE break_periods ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (for re-running migration)
DROP POLICY IF EXISTS time_events_select_own ON time_events;
DROP POLICY IF EXISTS time_events_insert_own ON time_events;
DROP POLICY IF EXISTS time_events_update_own ON time_events;
DROP POLICY IF EXISTS time_events_select_admin ON time_events;
DROP POLICY IF EXISTS time_events_update_admin ON time_events;
DROP POLICY IF EXISTS break_periods_select_own ON break_periods;
DROP POLICY IF EXISTS break_periods_insert_own ON break_periods;
DROP POLICY IF EXISTS break_periods_update_own ON break_periods;
DROP POLICY IF EXISTS break_periods_admin_all ON break_periods;

-- Workers can view their own time events (using worker_id = workers.id directly)
CREATE POLICY time_events_select_own
  ON time_events FOR SELECT
  USING (
    worker_id = auth.uid()
  );

-- Workers can insert their own time events (clock in)
CREATE POLICY time_events_insert_own
  ON time_events FOR INSERT
  WITH CHECK (
    worker_id = auth.uid()
  );

-- Workers can update their own in-progress time events (clock out)
CREATE POLICY time_events_update_own
  ON time_events FOR UPDATE
  USING (
    worker_id = auth.uid()
    AND status IN ('in_progress', 'completed')
  );

-- Admins can view all time events
CREATE POLICY time_events_select_admin
  ON time_events FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM workers WHERE role = 'Admin'
    )
  );

-- Admins can update any time event (approval, edits)
CREATE POLICY time_events_update_admin
  ON time_events FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM workers WHERE role = 'Admin'
    )
  );

-- Workers can view their own breaks
CREATE POLICY break_periods_select_own
  ON break_periods FOR SELECT
  USING (
    auth.uid() IN (
      SELECT te.worker_id 
      FROM time_events te
      WHERE te.id = time_event_id
    )
  );

-- Workers can insert/update breaks for their own time events
CREATE POLICY break_periods_insert_own
  ON break_periods FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT te.worker_id 
      FROM time_events te
      WHERE te.id = time_event_id
    )
  );

CREATE POLICY break_periods_update_own
  ON break_periods FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT te.worker_id 
      FROM time_events te
      WHERE te.id = time_event_id
    )
  );

-- Admins can view/modify all breaks
CREATE POLICY break_periods_admin_all
  ON break_periods FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM workers WHERE role = 'Admin'
    )
  );

-- Step 5: Create helper views
-- ============================================================================

CREATE OR REPLACE VIEW active_shifts AS
SELECT 
  te.id,
  te.worker_id,
  w.display_name,
  te.clock_in_time,
  te.site_name,
  te.total_break_minutes,
  EXTRACT(EPOCH FROM (NOW() - te.clock_in_time)) / 60 AS minutes_elapsed,
  ROUND(((EXTRACT(EPOCH FROM (NOW() - te.clock_in_time)) / 60) - te.total_break_minutes) / 60.0, 2) AS hours_so_far
FROM time_events te
JOIN workers w ON w.id = te.worker_id
WHERE te.clock_out_time IS NULL
  AND te.status = 'in_progress';

COMMENT ON VIEW active_shifts IS 'Shows all currently active shifts with real-time hour calculation';

CREATE OR REPLACE VIEW daily_time_summary AS
SELECT 
  te.worker_id,
  w.display_name,
  te.event_date,
  COUNT(*) AS shift_count,
  SUM(te.hours_worked) AS total_hours,
  SUM(te.total_break_minutes) AS total_break_minutes,
  ARRAY_AGG(te.site_name) AS sites_worked
FROM time_events te
JOIN workers w ON w.id = te.worker_id
WHERE te.clock_out_time IS NOT NULL
GROUP BY te.worker_id, w.display_name, te.event_date
ORDER BY te.event_date DESC, w.display_name;

COMMENT ON VIEW daily_time_summary IS 'Daily rollup of hours worked per worker (for payroll calculations)';

-- ============================================================================
-- MIGRATION COMPLETE!
-- ============================================================================
-- 
-- Next steps:
-- 1. Verify tables created: SELECT * FROM time_events LIMIT 1;
-- 2. Verify views work: SELECT * FROM active_shifts;
-- 3. Test in app: node scripts/test/test-time-events.js
-- 4. Integrate TimeTracker component into dashboard
-- 
-- Benefits:
-- • 75% fewer records (1 per shift vs 4)
-- • Automatic hour calculation
-- • Clear break audit trail
-- • Handles multiple breaks per day
-- • Real-time hour tracking
-- ============================================================================
