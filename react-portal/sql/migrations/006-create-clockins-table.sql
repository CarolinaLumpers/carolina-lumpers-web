-- ===================================================
-- Migration 006: Create Clock-ins Table
-- Date: 2025-11-15
-- 
-- Purpose: Create clock_ins table for GPS-based employee clock-ins
--          with UUID foreign keys to workers table
-- 
-- Run After: 004-uuid-primary-key-migration.sql (workers table with UUID)
-- ===================================================

BEGIN;

-- Create clock_ins table
CREATE TABLE IF NOT EXISTS clock_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  
  -- Timestamp information
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  date DATE NOT NULL,
  time TIME NOT NULL,
  
  -- GPS location
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  
  -- Geofence matching
  nearest_client TEXT,
  distance_miles DECIMAL(4, 2),
  
  -- Status tracking
  edit_status TEXT NOT NULL DEFAULT 'confirmed' 
    CHECK (edit_status IN ('confirmed', 'pending', 'editing', 'denied')),
  
  -- Additional information
  notes TEXT,
  device TEXT,
  
  -- Audit timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clock_ins_worker_id ON clock_ins(worker_id);
CREATE INDEX IF NOT EXISTS idx_clock_ins_date ON clock_ins(date DESC);
CREATE INDEX IF NOT EXISTS idx_clock_ins_timestamp ON clock_ins(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_clock_ins_edit_status ON clock_ins(edit_status);

-- Create composite index for common queries (worker + date range)
CREATE INDEX IF NOT EXISTS idx_clock_ins_worker_date ON clock_ins(worker_id, date DESC);

COMMENT ON TABLE clock_ins IS 'GPS-based employee clock-in records with geofence validation';
COMMENT ON COLUMN clock_ins.worker_id IS 'UUID reference to workers table';
COMMENT ON COLUMN clock_ins.timestamp IS 'Combined date+time for easy querying';
COMMENT ON COLUMN clock_ins.date IS 'Clock-in date (for grouping/filtering)';
COMMENT ON COLUMN clock_ins.time IS 'Clock-in time (for display)';
COMMENT ON COLUMN clock_ins.nearest_client IS 'Matched client site name';
COMMENT ON COLUMN clock_ins.distance_miles IS 'Distance from client site (miles)';
COMMENT ON COLUMN clock_ins.edit_status IS 'Status: confirmed (default), pending (edit requested), editing (being modified), denied (edit rejected)';
COMMENT ON COLUMN clock_ins.device IS 'Device used for clock-in (e.g., "iPhone - Safari", "Legacy Import")';

COMMIT;

-- Verify table creation
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'clock_ins';
  
  IF row_count = 1 THEN
    RAISE NOTICE '✅ clock_ins table created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create clock_ins table';
  END IF;
END $$;
