-- Add auth_user_id column to workers table for Supabase Auth integration
ALTER TABLE workers ADD COLUMN IF NOT EXISTS auth_user_id UUID;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_workers_auth_user_id ON workers(auth_user_id);

-- Add unique constraint to ensure one worker per auth user (ignore if exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_auth_user_id') THEN
        ALTER TABLE workers ADD CONSTRAINT unique_auth_user_id UNIQUE (auth_user_id);
    END IF;
END $$;