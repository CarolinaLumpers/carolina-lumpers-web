-- =====================================================
-- CLS Supabase Schema - Ready to Execute
-- Optimized version with complete migration mapping
-- =====================================================

-- Set timezone for the database
ALTER DATABASE postgres SET timezone TO 'America/New_York';

-- =====================================================
-- 1. WORKERS TABLE (replaces Workers sheet)
-- =====================================================
CREATE TABLE IF NOT EXISTS workers (
    id VARCHAR(20) PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Supervisor', 'Worker')),
    hourly_rate DECIMAL(10,2) DEFAULT 15.00,
    w9_status VARCHAR(20) DEFAULT 'pending' CHECK (w9_status IN ('pending', 'submitted', 'approved', 'missing')),
    language VARCHAR(10) DEFAULT 'en' CHECK (language IN ('en', 'es', 'pt')),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. CLIENTS TABLE (replaces Clients sheet)
-- =====================================================
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    geofence_radius DECIMAL(5,3) DEFAULT 0.3,
    is_active BOOLEAN DEFAULT true,
    contact_name VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. CLOCK_INS TABLE (replaces ClockIn sheet)
-- =====================================================
CREATE TABLE IF NOT EXISTS clock_ins (
    id SERIAL PRIMARY KEY,
    worker_id VARCHAR(20) NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id),
    clock_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    distance_miles DECIMAL(5,3),
    device VARCHAR(100),
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'denied')),
    edit_status VARCHAR(20) DEFAULT 'confirmed' CHECK (edit_status IN ('confirmed', 'pending', 'editing', 'denied')),
    minutes_late INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. TIME_EDIT_REQUESTS TABLE (replaces TimeEditRequests sheet)
-- =====================================================
CREATE TABLE IF NOT EXISTS time_edit_requests (
    id SERIAL PRIMARY KEY,
    worker_id VARCHAR(20) NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    clock_in_id INTEGER NOT NULL REFERENCES clock_ins(id) ON DELETE CASCADE,
    original_time TIMESTAMP WITH TIME ZONE NOT NULL,
    requested_time TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
    admin_notes TEXT,
    approved_by VARCHAR(20) REFERENCES workers(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. PAYROLL_LINE_ITEMS TABLE (replaces Payroll LineItems sheet)
-- =====================================================
CREATE TABLE IF NOT EXISTS payroll_line_items (
    id SERIAL PRIMARY KEY,
    worker_id VARCHAR(20) NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    clock_in_id INTEGER NOT NULL REFERENCES clock_ins(id) ON DELETE CASCADE,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    hours_worked DECIMAL(5,2) NOT NULL,
    hourly_rate DECIMAL(10,2) NOT NULL,
    gross_pay DECIMAL(10,2) NOT NULL,
    deductions DECIMAL(10,2) DEFAULT 0,
    net_pay DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. ACTIVITY_LOGS TABLE (replaces Activity_Logs sheet)
-- =====================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(30) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    event_type VARCHAR(50) NOT NULL,
    worker_id VARCHAR(20) REFERENCES workers(id),
    display_name VARCHAR(100),
    event_summary TEXT NOT NULL,
    device VARCHAR(100),
    site VARCHAR(255),
    distance_miles DECIMAL(5,3),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    status VARCHAR(20),
    project VARCHAR(50),
    details JSONB
);

-- =====================================================
-- 7. APP_SETTINGS TABLE (replaces AppSettings sheet)
-- =====================================================
CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    category VARCHAR(30) DEFAULT 'general',
    is_public BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(20) REFERENCES workers(id)
);

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_workers_email ON workers(email);
CREATE INDEX IF NOT EXISTS idx_workers_role ON workers(role);
CREATE INDEX IF NOT EXISTS idx_clock_ins_worker ON clock_ins(worker_id);
CREATE INDEX IF NOT EXISTS idx_clock_ins_time ON clock_ins(clock_in_time);
CREATE INDEX IF NOT EXISTS idx_clock_ins_worker_time ON clock_ins(worker_id, clock_in_time);
CREATE INDEX IF NOT EXISTS idx_time_edits_worker ON time_edit_requests(worker_id);
CREATE INDEX IF NOT EXISTS idx_time_edits_status ON time_edit_requests(status);
CREATE INDEX IF NOT EXISTS idx_payroll_worker ON payroll_line_items(worker_id);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON activity_logs(timestamp);

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Create admin user
INSERT INTO workers (id, display_name, email, role, hourly_rate, w9_status) 
VALUES ('SG-001', 'Steve Garay', 's.garay@carolinalumpers.com', 'Admin', 25.00, 'approved')
ON CONFLICT (id) DO NOTHING;

-- Create test client
INSERT INTO clients (name, address, city, state, latitude, longitude, contact_name) 
VALUES ('Test Construction Site', '123 Main St', 'Raleigh', 'NC', 35.7796, -78.6382, 'John Smith')
ON CONFLICT DO NOTHING;

-- Essential app settings
INSERT INTO app_settings (key, value, description, category, is_public) VALUES
('geofence_radius', '0.3', 'Default geofence radius in miles', 'location', true),
('min_clock_in_interval', '15', 'Minimum minutes between clock-ins', 'time_tracking', true),
('default_hourly_rate', '15.00', 'Default hourly rate for new workers', 'payroll', false),
('app_version', '2.0.0', 'Current application version', 'system', true)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- COMPLETION
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ CLS Database Schema Complete!';
    RAISE NOTICE '📊 Created 7 tables with indexes and test data';
    RAISE NOTICE '👤 Admin user: SG-001';
    RAISE NOTICE '🎯 Ready for React Portal integration';
END $$;