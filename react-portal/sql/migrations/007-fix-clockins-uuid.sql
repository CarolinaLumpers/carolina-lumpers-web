-- Migration 007: Fix clock_ins table to use UUID primary key (Best Practice)
-- 
-- ISSUE: clock_ins table was created with INTEGER id (auto-increment anti-pattern)
-- SHOULD BE: UUID primary key for consistency with workers table and best practices
--
-- This migration:
-- 1. Drops existing clock_ins table (with 788 imported records)
-- 2. Recreates with correct UUID-based schema
-- 3. Data will be re-imported using import-clockins.js script
--
-- Date: November 16, 2025
-- Phase: 4 (Clock-ins Management)
-- Related: Phase 2.5 UUID Migration principles

-- Step 1: Drop existing table with INTEGER id
DROP TABLE IF EXISTS clock_ins CASCADE;

-- Step 2: Recreate with UUID primary key (Best Practice)
CREATE TABLE clock_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE NOT NULL,
  
  -- Time (combined timestamp for simplicity)
  clock_in_time TIMESTAMPTZ NOT NULL,
  
  -- Location
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  distance_miles DECIMAL(4,2),
  
  -- Client reference (FK to clients table)
  client_id INTEGER REFERENCES clients(id),
  
  -- Status fields
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  edit_status TEXT DEFAULT 'confirmed' CHECK (edit_status IN ('confirmed', 'pending', 'editing', 'denied')),
  minutes_late INTEGER DEFAULT 0,
  
  -- Metadata
  device TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes for performance
CREATE INDEX idx_clockins_worker_id ON clock_ins(worker_id);
CREATE INDEX idx_clockins_time ON clock_ins(clock_in_time DESC);
CREATE INDEX idx_clockins_worker_time ON clock_ins(worker_id, clock_in_time DESC);
CREATE INDEX idx_clockins_status ON clock_ins(status);
CREATE INDEX idx_clockins_edit_status ON clock_ins(edit_status) WHERE edit_status != 'confirmed';
CREATE INDEX idx_clockins_client ON clock_ins(client_id) WHERE client_id IS NOT NULL;

-- Step 4: Enable Row-Level Security
ALTER TABLE clock_ins ENABLE ROW LEVEL SECURITY;

-- Step 5: RLS Policies

-- Workers can view their own clock-ins
CREATE POLICY "Workers can view own clock-ins" ON clock_ins
  FOR SELECT
  USING (worker_id = auth.uid());

-- Workers can insert their own clock-ins
CREATE POLICY "Workers can insert own clock-ins" ON clock_ins
  FOR INSERT
  WITH CHECK (worker_id = auth.uid());

-- Admins and Supervisors can view all clock-ins
CREATE POLICY "Admins can view all clock-ins" ON clock_ins
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workers
      WHERE id = auth.uid()
      AND role IN ('Admin', 'Supervisor')
    )
  );

-- Only Admins can update clock-ins (for time edits)
CREATE POLICY "Admins can update clock-ins" ON clock_ins
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workers
      WHERE id = auth.uid()
      AND role = 'Admin'
    )
  );

-- Only Admins can delete clock-ins
CREATE POLICY "Admins can delete clock-ins" ON clock_ins
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workers
      WHERE id = auth.uid()
      AND role = 'Admin'
    )
  );

-- Step 6: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clock_ins_updated_at
  BEFORE UPDATE ON clock_ins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE clock_ins IS 'Worker clock-in records with UUID primary key (Best Practice)';
COMMENT ON COLUMN clock_ins.id IS 'UUID primary key - consistent with workers table';
COMMENT ON COLUMN clock_ins.worker_id IS 'Foreign key to workers.id (UUID from auth.users)';
COMMENT ON COLUMN clock_ins.status IS 'Clock-in approval status: pending, approved, rejected';
COMMENT ON COLUMN clock_ins.edit_status IS 'Time edit status: confirmed, pending, editing, denied';
