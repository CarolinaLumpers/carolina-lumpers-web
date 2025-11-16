-- Migration 015: Create time_events and break_periods tables
-- Purpose: Replace ClockIn table with simplified time tracking + dedicated break tracking
-- Benefits: 75% fewer records, automatic hour calculation, clear break audit trail

-- ============================================================================
-- 1. CREATE time_events TABLE (replaces clock_ins - 1 record per shift, not 4!)
-- ============================================================================

CREATE TABLE IF NOT EXISTS time_events (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  service_id TEXT, -- References Services sheet in Google Sheets
  
  -- Core time tracking
  event_date DATE NOT NULL,
  clock_in_time TIMESTAMPTZ NOT NULL,
  clock_out_time TIMESTAMPTZ, -- NULL if still clocked in
  
  -- Location data (GPS verification)
  clock_in_latitude DECIMAL(10, 8),
  clock_in_longitude DECIMAL(11, 8),
  clock_out_latitude DECIMAL(10, 8),
  clock_out_longitude DECIMAL(11, 8),
  distance_from_site_miles DECIMAL(5, 2),
  site_name TEXT,
  
  -- Device tracking
  device_info TEXT, -- e.g., "iPhone - Safari"
  
  -- Status and approval
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'approved', 'needs_review')),
  approved_by UUID REFERENCES workers(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  
  -- Time edit tracking
  edit_status TEXT DEFAULT 'confirmed' CHECK (edit_status IN ('confirmed', 'pending', 'editing', 'denied')),
  original_clock_in TIMESTAMPTZ,
  original_clock_out TIMESTAMPTZ,
  edit_reason TEXT,
  
  -- Calculated fields (auto-updated by trigger)
  total_break_minutes INTEGER DEFAULT 0, -- Sum of all break_periods
  hours_worked DECIMAL(5, 2), -- (clock_out - clock_in) - breaks
  
  -- Job details
  container_number TEXT,
  project_number TEXT,
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT valid_clock_times CHECK (clock_out_time IS NULL OR clock_out_time > clock_in_time)
);

-- Indexes for common queries
CREATE INDEX idx_time_events_worker_id ON time_events(worker_id);
CREATE INDEX idx_time_events_client_id ON time_events(client_id);
CREATE INDEX idx_time_events_event_date ON time_events(event_date);
CREATE INDEX idx_time_events_status ON time_events(status);
CREATE INDEX idx_time_events_worker_date ON time_events(worker_id, event_date);

-- ============================================================================
-- 2. CREATE break_periods TABLE (dedicated break tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS break_periods (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to time_event
  time_event_id UUID NOT NULL REFERENCES time_events(id) ON DELETE CASCADE,
  
  -- Break timing
  break_start TIMESTAMPTZ NOT NULL,
  break_end TIMESTAMPTZ, -- NULL if break still in progress
  
  -- Calculated duration (in minutes)
  break_minutes INTEGER, -- Auto-calculated when break_end is set
  
  -- Break type (optional categorization)
  break_type TEXT DEFAULT 'lunch' CHECK (break_type IN ('lunch', 'rest', 'other')),
  
  -- Location tracking (optional - to verify they stayed on-site)
  break_start_latitude DECIMAL(10, 8),
  break_start_longitude DECIMAL(11, 8),
  break_end_latitude DECIMAL(10, 8),
  break_end_longitude DECIMAL(11, 8),
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_break_times CHECK (break_end IS NULL OR break_end > break_start),
  CONSTRAINT break_within_shift CHECK (
    break_start >= (SELECT clock_in_time FROM time_events WHERE id = time_event_id)
    AND (break_end IS NULL OR break_end <= COALESCE(
      (SELECT clock_out_time FROM time_events WHERE id = time_event_id),
      NOW()
    ))
  )
);

-- Indexes for performance
CREATE INDEX idx_break_periods_time_event_id ON break_periods(time_event_id);
CREATE INDEX idx_break_periods_break_start ON break_periods(break_start);

-- ============================================================================
-- 3. TRIGGERS FOR AUTOMATIC CALCULATIONS
-- ============================================================================

-- Function to calculate break minutes when break ends
CREATE OR REPLACE FUNCTION calculate_break_minutes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.break_end IS NOT NULL AND NEW.break_start IS NOT NULL THEN
    NEW.break_minutes := EXTRACT(EPOCH FROM (NEW.break_end - NEW.break_start)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_break_minutes
  BEFORE INSERT OR UPDATE ON break_periods
  FOR EACH ROW
  EXECUTE FUNCTION calculate_break_minutes();

-- Function to update total_break_minutes and hours_worked on time_events
CREATE OR REPLACE FUNCTION update_time_event_calculations()
RETURNS TRIGGER AS $$
DECLARE
  v_time_event_id UUID;
  v_total_breaks INTEGER;
  v_clock_in TIMESTAMPTZ;
  v_clock_out TIMESTAMPTZ;
  v_total_minutes INTEGER;
BEGIN
  -- Get the time_event_id (works for INSERT, UPDATE, DELETE)
  v_time_event_id := COALESCE(NEW.time_event_id, OLD.time_event_id);
  
  -- Calculate total break minutes for this time event
  SELECT COALESCE(SUM(break_minutes), 0)
  INTO v_total_breaks
  FROM break_periods
  WHERE time_event_id = v_time_event_id
    AND break_minutes IS NOT NULL;
  
  -- Get clock times
  SELECT clock_in_time, clock_out_time
  INTO v_clock_in, v_clock_out
  FROM time_events
  WHERE id = v_time_event_id;
  
  -- Update time_events record
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

CREATE TRIGGER trg_update_time_event_on_break_change
  AFTER INSERT OR UPDATE OR DELETE ON break_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_time_event_calculations();

-- Trigger to recalculate hours_worked when clock_out_time changes
CREATE OR REPLACE FUNCTION recalculate_hours_on_clock_out()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_out_time IS NOT NULL AND NEW.clock_out_time != OLD.clock_out_time THEN
    NEW.hours_worked := ROUND(
      ((EXTRACT(EPOCH FROM (NEW.clock_out_time - NEW.clock_in_time)) / 60) - NEW.total_break_minutes) / 60.0,
      2
    );
    NEW.status := 'completed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalculate_hours_on_clock_out
  BEFORE UPDATE ON time_events
  FOR EACH ROW
  WHEN (NEW.clock_out_time IS NOT NULL AND (OLD.clock_out_time IS NULL OR NEW.clock_out_time != OLD.clock_out_time))
  EXECUTE FUNCTION recalculate_hours_on_clock_out();

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE time_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE break_periods ENABLE ROW LEVEL SECURITY;

-- Policy: Workers can view their own time events
CREATE POLICY time_events_select_own
  ON time_events FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM workers WHERE id = worker_id
    )
  );

-- Policy: Workers can insert their own time events (clock in)
CREATE POLICY time_events_insert_own
  ON time_events FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT auth_user_id FROM workers WHERE id = worker_id
    )
  );

-- Policy: Workers can update their own in-progress time events (clock out)
CREATE POLICY time_events_update_own
  ON time_events FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM workers WHERE id = worker_id
    )
    AND status IN ('in_progress', 'completed')
  );

-- Policy: Admins can view all time events
CREATE POLICY time_events_select_admin
  ON time_events FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM workers WHERE role = 'Admin'
    )
  );

-- Policy: Admins can update any time event (approval, edits)
CREATE POLICY time_events_update_admin
  ON time_events FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM workers WHERE role = 'Admin'
    )
  );

-- Policy: Workers can view their own breaks
CREATE POLICY break_periods_select_own
  ON break_periods FOR SELECT
  USING (
    auth.uid() IN (
      SELECT w.auth_user_id 
      FROM workers w
      JOIN time_events te ON te.worker_id = w.id
      WHERE te.id = time_event_id
    )
  );

-- Policy: Workers can insert/update breaks for their own time events
CREATE POLICY break_periods_insert_own
  ON break_periods FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT w.auth_user_id 
      FROM workers w
      JOIN time_events te ON te.worker_id = w.id
      WHERE te.id = time_event_id
    )
  );

CREATE POLICY break_periods_update_own
  ON break_periods FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT w.auth_user_id 
      FROM workers w
      JOIN time_events te ON te.worker_id = w.id
      WHERE te.id = time_event_id
    )
  );

-- Policy: Admins can view/modify all breaks
CREATE POLICY break_periods_admin_all
  ON break_periods FOR ALL
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM workers WHERE role = 'Admin'
    )
  );

-- ============================================================================
-- 5. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE time_events IS 'Simplified time tracking - one record per shift (not 4!). Replaces clock_ins table.';
COMMENT ON COLUMN time_events.clock_in_time IS 'When worker started shift (e.g., 8:00 AM)';
COMMENT ON COLUMN time_events.clock_out_time IS 'When worker ended shift (e.g., 5:00 PM). NULL if still working.';
COMMENT ON COLUMN time_events.total_break_minutes IS 'Auto-calculated sum of all break_periods for this shift';
COMMENT ON COLUMN time_events.hours_worked IS 'Auto-calculated: (clock_out - clock_in - breaks) / 60';
COMMENT ON COLUMN time_events.status IS 'in_progress = currently working | completed = clocked out | approved = admin approved | needs_review = flagged for review';

COMMENT ON TABLE break_periods IS 'Dedicated break tracking. Multiple breaks allowed per time_event.';
COMMENT ON COLUMN break_periods.break_minutes IS 'Auto-calculated when break_end is set';
COMMENT ON COLUMN break_periods.break_type IS 'lunch = meal break | rest = short break | other = specify in notes';

-- ============================================================================
-- 6. HELPER VIEWS
-- ============================================================================

-- View: Active shifts (currently clocked in)
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

-- View: Daily time summary (for payroll)
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
