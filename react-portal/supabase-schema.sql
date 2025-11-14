-- ===================================================
-- CLS Employee Portal Database Schema
-- Run this in Supabase SQL Editor after project creation
-- ===================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================================
-- TABLES
-- ===================================================

-- Workers table (replaces Google Sheets Workers + roles)
CREATE TABLE workers (
  id TEXT PRIMARY KEY,                    -- WorkerID (e.g., "CLS001") 
  employee_id TEXT,                       -- Employee ID
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT CHECK (role IN ('Lumper', 'Lead', 'Manager')),
  app_access TEXT CHECK (app_access IN ('Worker', 'Lead', 'Admin')), 
  hourly_rate DECIMAL(5,2),
  flat_rate_bonus DECIMAL(6,2),
  availability TEXT DEFAULT 'Active',
  primary_language TEXT DEFAULT 'en',
  w9_status TEXT DEFAULT 'none',
  auth_user_id UUID REFERENCES auth.users(id),  -- Link to Supabase auth
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clock-ins table (replaces ClockIn sheet)
CREATE TABLE clock_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id TEXT REFERENCES workers(id) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  date DATE NOT NULL,
  time TIME NOT NULL,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7), 
  nearest_client TEXT,
  distance_miles DECIMAL(4,2),
  edit_status TEXT DEFAULT 'confirmed' CHECK (edit_status IN ('confirmed', 'pending', 'editing', 'denied')),
  notes TEXT,
  device TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients table (replaces Clients sheet + geofencing)
CREATE TABLE clients (
  id TEXT PRIMARY KEY,                    -- ClientID
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  geofence_radius_miles DECIMAL(4,2) DEFAULT 0.3,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time edit requests table (replaces TimeEditRequests sheet)
CREATE TABLE time_edit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id TEXT REFERENCES workers(id) NOT NULL,
  clockin_id UUID REFERENCES clock_ins(id) NOT NULL,
  original_time TIME NOT NULL,
  requested_time TIME NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by TEXT REFERENCES workers(id),
  reviewed_at TIMESTAMPTZ,
  denial_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- W9 records table (replaces W9_Records sheet)
CREATE TABLE w9_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id TEXT REFERENCES workers(id) NOT NULL,
  display_name TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  tax_classification TEXT NOT NULL,
  address TEXT NOT NULL,
  ssn_last4 TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  pdf_url TEXT,
  reviewed_by TEXT REFERENCES workers(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payroll line items table (replaces Payroll LineItems sheet)
CREATE TABLE payroll_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id TEXT REFERENCES workers(id) NOT NULL,
  date DATE NOT NULL,
  client_id TEXT REFERENCES clients(id),
  line_item_detail TEXT NOT NULL,
  check_amount DECIMAL(8,2) NOT NULL,
  week_period DATE NOT NULL,              -- Saturday date for week
  run_payroll BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity logs table (replaces Activity_Logs sheet)
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id TEXT UNIQUE NOT NULL,           -- LOG-timestamp-random format
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  event_type TEXT NOT NULL,
  worker_id TEXT REFERENCES workers(id),
  display_name TEXT,
  event_summary TEXT NOT NULL,
  device TEXT,
  site TEXT,
  distance_miles DECIMAL(4,2),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  status TEXT,
  project TEXT DEFAULT 'TIME_TRACKING',
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================================
-- INDEXES FOR PERFORMANCE
-- ===================================================

-- Workers indexes
CREATE INDEX idx_workers_email ON workers(email);
CREATE INDEX idx_workers_auth_user_id ON workers(auth_user_id);
CREATE INDEX idx_workers_app_access ON workers(app_access);
CREATE INDEX idx_workers_availability ON workers(availability);

-- Clock-ins indexes
CREATE INDEX idx_clock_ins_worker_id ON clock_ins(worker_id);
CREATE INDEX idx_clock_ins_date ON clock_ins(date);
CREATE INDEX idx_clock_ins_timestamp ON clock_ins(timestamp);

-- Clients indexes (for geofencing performance)
CREATE INDEX idx_clients_location ON clients(latitude, longitude);
CREATE INDEX idx_clients_active ON clients(active);

-- Time edit requests indexes
CREATE INDEX idx_time_edit_requests_worker_id ON time_edit_requests(worker_id);
CREATE INDEX idx_time_edit_requests_status ON time_edit_requests(status);
CREATE INDEX idx_time_edit_requests_clockin_id ON time_edit_requests(clockin_id);

-- Payroll indexes
CREATE INDEX idx_payroll_worker_id ON payroll_line_items(worker_id);
CREATE INDEX idx_payroll_date ON payroll_line_items(date);
CREATE INDEX idx_payroll_week_period ON payroll_line_items(week_period);

-- Activity logs indexes
CREATE INDEX idx_activity_logs_worker_id ON activity_logs(worker_id);
CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp);
CREATE INDEX idx_activity_logs_event_type ON activity_logs(event_type);

-- ===================================================
-- ENABLE ROW LEVEL SECURITY
-- ===================================================

ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clock_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_edit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE w9_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- ===================================================
-- RLS POLICIES
-- ===================================================

-- WORKERS POLICIES
CREATE POLICY "Workers can view own data" ON workers
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Workers can update own data" ON workers
  FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "Admins can view all workers" ON workers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workers w
      WHERE w.auth_user_id = auth.uid()
      AND w.app_access = 'Admin'
    )
  );

CREATE POLICY "Admins can update all workers" ON workers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workers w
      WHERE w.auth_user_id = auth.uid()
      AND w.app_access = 'Admin'
    )
  );

-- CLOCK-INS POLICIES
CREATE POLICY "Workers can view own clock-ins" ON clock_ins  
  FOR SELECT USING (
    worker_id IN (
      SELECT id FROM workers WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Workers can create own clock-ins" ON clock_ins
  FOR INSERT WITH CHECK (
    worker_id IN (
      SELECT id FROM workers WHERE auth_user_id = auth.uid()  
    )
  );

CREATE POLICY "Admins can view all clock-ins" ON clock_ins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workers w
      WHERE w.auth_user_id = auth.uid()
      AND w.app_access IN ('Admin', 'Lead')
    )
  );

CREATE POLICY "Admins can update all clock-ins" ON clock_ins
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workers w
      WHERE w.auth_user_id = auth.uid()
      AND w.app_access IN ('Admin', 'Lead')
    )
  );

-- CLIENTS POLICIES (read-only for geofencing)
CREATE POLICY "Everyone can view active clients" ON clients
  FOR SELECT USING (active = true);

CREATE POLICY "Admins can manage clients" ON clients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workers w
      WHERE w.auth_user_id = auth.uid()
      AND w.app_access = 'Admin'
    )
  );

-- TIME EDIT REQUESTS POLICIES
CREATE POLICY "Workers can view own requests" ON time_edit_requests
  FOR SELECT USING (worker_id IN (
    SELECT id FROM workers WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Workers can create own requests" ON time_edit_requests
  FOR INSERT WITH CHECK (worker_id IN (
    SELECT id FROM workers WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all requests" ON time_edit_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workers w
      WHERE w.auth_user_id = auth.uid()
      AND w.app_access IN ('Admin', 'Lead')
    )
  );

-- W9 RECORDS POLICIES
CREATE POLICY "Workers can view own W9s" ON w9_records
  FOR SELECT USING (worker_id IN (
    SELECT id FROM workers WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Workers can create own W9s" ON w9_records
  FOR INSERT WITH CHECK (worker_id IN (
    SELECT id FROM workers WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all W9s" ON w9_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workers w
      WHERE w.auth_user_id = auth.uid()
      AND w.app_access = 'Admin'
    )
  );

-- PAYROLL POLICIES  
CREATE POLICY "Workers can view own payroll" ON payroll_line_items
  FOR SELECT USING (worker_id IN (
    SELECT id FROM workers WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all payroll" ON payroll_line_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workers w
      WHERE w.auth_user_id = auth.uid()
      AND w.app_access = 'Admin'
    )
  );

-- ACTIVITY LOGS POLICIES
CREATE POLICY "Workers can view own logs" ON activity_logs
  FOR SELECT USING (worker_id IN (
    SELECT id FROM workers WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all logs" ON activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workers w
      WHERE w.auth_user_id = auth.uid()
      AND w.app_access IN ('Admin', 'Lead')
    )
  );

-- ===================================================
-- SAMPLE DATA FOR TESTING
-- ===================================================

-- Insert test clients for geofencing
INSERT INTO clients (id, name, address, latitude, longitude) VALUES 
('TEST_CLIENT', 'Test Location', '123 Test St, Raleigh NC', 35.7796, -78.6382),
('OFFICE_HQ', 'Carolina Lumpers HQ', '456 Main St, Raleigh NC', 35.7897, -78.6569);

-- Insert admin user (you'll need to create this in Supabase Auth first)
-- Then run this with your actual auth user ID:
-- INSERT INTO workers (id, employee_id, first_name, last_name, display_name, email, app_access, auth_user_id)
-- VALUES ('SG-001', 'SG001', 'Steve', 'Garay', 'Steve Garay', 's.garay@carolinalumpers.com', 'Admin', 'YOUR_AUTH_USER_ID');

-- ===================================================
-- FUNCTIONS FOR BUSINESS LOGIC (Optional - can add later)
-- ===================================================

-- Function to calculate distance between two points (for geofencing)
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 DECIMAL, lng1 DECIMAL, 
  lat2 DECIMAL, lng2 DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
  R DECIMAL := 3959; -- Earth radius in miles
  dLat DECIMAL;
  dLng DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  dLat := RADIANS(lat2 - lat1);
  dLng := RADIANS(lng2 - lng1);
  
  a := SIN(dLat/2) * SIN(dLat/2) + 
       COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * 
       SIN(dLng/2) * SIN(dLng/2);
       
  c := 2 * ATAN2(SQRT(a), SQRT(1-a));
  
  RETURN R * c;
END;
$$ LANGUAGE plpgsql;

-- Function to find nearest client for clock-ins
CREATE OR REPLACE FUNCTION find_nearest_client(
  check_lat DECIMAL, 
  check_lng DECIMAL
) RETURNS TABLE(client_id TEXT, client_name TEXT, distance_miles DECIMAL) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    calculate_distance(check_lat, check_lng, c.latitude, c.longitude) as distance
  FROM clients c
  WHERE c.active = true
  ORDER BY distance
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ===================================================
-- COMPLETION MESSAGE
-- ===================================================

DO $$
BEGIN
  RAISE NOTICE '✅ CLS Database Schema Setup Complete!';
  RAISE NOTICE '📊 Tables created: workers, clock_ins, clients, time_edit_requests, w9_records, payroll_line_items, activity_logs';
  RAISE NOTICE '🔒 Row Level Security enabled on all tables';
  RAISE NOTICE '📈 Performance indexes created';
  RAISE NOTICE '🧪 Test data inserted (2 clients)';
  RAISE NOTICE '🚀 Ready for React Portal integration!';
END $$;