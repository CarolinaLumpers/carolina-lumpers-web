-- =====================================================
-- Phase 2: W9 Submissions Table Creation
-- Carolina Lumpers React Portal - Supabase Migration
-- =====================================================

-- Drop table if exists (for clean migration)
DROP TABLE IF EXISTS w9_submissions CASCADE;

-- Create w9_submissions table
CREATE TABLE w9_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id TEXT NOT NULL,  -- References workers(id)
  w9_record_id TEXT UNIQUE NOT NULL,  -- Legacy compatibility (e.g., "W9-006")

  -- W9 Form Data
  legal_name TEXT NOT NULL,
  business_name TEXT,  -- Optional for sole proprietors
  tax_classification TEXT NOT NULL,  -- Individual, C-Corp, S-Corp, Partnership, LLC
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip TEXT,
  
  -- SSN Data (encrypted in source, stored as-is)
  ssn_encrypted TEXT,  -- Base64 encoded from Google Sheets
  ssn_last4 TEXT,  -- Last 4 digits only (for display)
  backup_withholding BOOLEAN DEFAULT false,

  -- Document Storage
  pdf_url TEXT,  -- Google Drive URL

  -- Status Management
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'missing')),
  submitted_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_date TIMESTAMPTZ,
  reviewed_by TEXT,  -- References workers(id)
  rejection_reason TEXT,
  admin_notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key constraint to workers table
ALTER TABLE w9_submissions 
  ADD CONSTRAINT fk_w9_worker 
  FOREIGN KEY (worker_id) 
  REFERENCES workers(id) 
  ON DELETE CASCADE;

-- Add foreign key constraint for reviewed_by
ALTER TABLE w9_submissions 
  ADD CONSTRAINT fk_w9_reviewed_by 
  FOREIGN KEY (reviewed_by) 
  REFERENCES workers(id) 
  ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_w9_worker_id ON w9_submissions(worker_id);
CREATE INDEX idx_w9_status ON w9_submissions(status);
CREATE INDEX idx_w9_submitted_date ON w9_submissions(submitted_date DESC);
CREATE INDEX idx_w9_record_id ON w9_submissions(w9_record_id);

-- Enable Row-Level Security
ALTER TABLE w9_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Workers can view their own W9s
CREATE POLICY "Workers can view own W9s" ON w9_submissions
  FOR SELECT 
  USING (
    worker_id IN (
      SELECT id FROM workers WHERE auth_user_id = auth.uid()
    )
  );

-- RLS Policy: Admins and Supervisors can view all W9s
CREATE POLICY "Admins can view all W9s" ON w9_submissions
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('Admin', 'Supervisor')
    )
  );

-- RLS Policy: Workers can insert their own W9
CREATE POLICY "Workers can submit W9" ON w9_submissions
  FOR INSERT 
  WITH CHECK (
    worker_id IN (
      SELECT id FROM workers WHERE auth_user_id = auth.uid()
    )
  );

-- RLS Policy: Admins can update W9 status
CREATE POLICY "Admins can update W9s" ON w9_submissions
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM workers 
      WHERE auth_user_id = auth.uid() 
      AND role = 'Admin'
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_w9_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER w9_updated_at_trigger
  BEFORE UPDATE ON w9_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_w9_updated_at();

-- Add comment for documentation
COMMENT ON TABLE w9_submissions IS 'W-9 tax form submissions from workers. Migrated from Google Sheets W9_Records.';
COMMENT ON COLUMN w9_submissions.ssn_encrypted IS 'Base64 encoded SSN from Google Sheets. DO NOT expose to frontend.';
COMMENT ON COLUMN w9_submissions.ssn_last4 IS 'Last 4 digits of SSN for display purposes only.';
COMMENT ON COLUMN w9_submissions.backup_withholding IS 'IRS backup withholding requirement flag.';
