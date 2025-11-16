-- Migration 008: Create payroll_line_items table with UUID primary key
-- 
-- Best Practice: UUID primary key for consistency with workers and clock_ins
-- 
-- This migration creates the payroll_line_items table for tracking
-- worker payments, bonuses, and adjustments.
--
-- Date: November 16, 2025
-- Phase: 5 (Payroll Line Items)

-- Step 0: Drop existing table if it exists
DROP TABLE IF EXISTS payroll_line_items CASCADE;

-- Step 1: Create payroll_line_items table with UUID primary key
CREATE TABLE payroll_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Worker reference
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE NOT NULL,
  
  -- Work details
  work_date DATE NOT NULL,
  description TEXT NOT NULL,
  hours DECIMAL(5,2),
  rate DECIMAL(8,2),
  amount DECIMAL(10,2) NOT NULL,
  
  -- Week period (for grouping payroll by week)
  week_period DATE NOT NULL,
  
  -- References
  client_id INTEGER REFERENCES clients(id),
  task_id TEXT,  -- Legacy task reference (future: migrate to UUID)
  clockin_id UUID REFERENCES clock_ins(id),  -- Link to clock-in record
  
  -- Payment tracking
  check_number TEXT,
  check_date DATE,
  
  -- Flags
  is_bonus BOOLEAN DEFAULT FALSE,
  is_adjustment BOOLEAN DEFAULT FALSE,
  run_payroll BOOLEAN DEFAULT TRUE,  -- Include in payroll run
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create indexes for performance
CREATE INDEX idx_payroll_worker_id ON payroll_line_items(worker_id);
CREATE INDEX idx_payroll_work_date ON payroll_line_items(work_date DESC);
CREATE INDEX idx_payroll_week_period ON payroll_line_items(week_period DESC);
CREATE INDEX idx_payroll_status ON payroll_line_items(status);
CREATE INDEX idx_payroll_worker_week ON payroll_line_items(worker_id, week_period DESC);
CREATE INDEX idx_payroll_worker_date ON payroll_line_items(worker_id, work_date DESC);
CREATE INDEX idx_payroll_check_number ON payroll_line_items(check_number) WHERE check_number IS NOT NULL;

-- Step 3: Enable Row-Level Security
ALTER TABLE payroll_line_items ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policies

-- Workers can view their own payroll records
CREATE POLICY "Workers can view own payroll" ON payroll_line_items
  FOR SELECT
  USING (worker_id = auth.uid());

-- Admins and Supervisors can view all payroll
CREATE POLICY "Admins can view all payroll" ON payroll_line_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workers
      WHERE id = auth.uid()
      AND role IN ('Admin', 'Supervisor')
    )
  );

-- Only Admins can insert payroll records
CREATE POLICY "Admins can insert payroll" ON payroll_line_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workers
      WHERE id = auth.uid()
      AND role = 'Admin'
    )
  );

-- Only Admins can update payroll records
CREATE POLICY "Admins can update payroll" ON payroll_line_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workers
      WHERE id = auth.uid()
      AND role = 'Admin'
    )
  );

-- Only Admins can delete payroll records
CREATE POLICY "Admins can delete payroll" ON payroll_line_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workers
      WHERE id = auth.uid()
      AND role = 'Admin'
    )
  );

-- Step 5: Create updated_at trigger
CREATE TRIGGER update_payroll_line_items_updated_at
  BEFORE UPDATE ON payroll_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE payroll_line_items IS 'Worker payment records with UUID primary key';
COMMENT ON COLUMN payroll_line_items.id IS 'UUID primary key - consistent with workers table';
COMMENT ON COLUMN payroll_line_items.worker_id IS 'Foreign key to workers.id (UUID from auth.users)';
COMMENT ON COLUMN payroll_line_items.week_period IS 'Saturday date of the work week for grouping';
COMMENT ON COLUMN payroll_line_items.status IS 'Payment status: pending, approved, paid';
