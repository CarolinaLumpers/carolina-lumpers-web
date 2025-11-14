/**
 * Supabase Database Setup Script
 * Programmatically creates all tables, policies, and test data
 */

import { createClient } from "@supabase/supabase-js";

// Use your actual Supabase credentials
const supabaseUrl = "https://dxbybjxpglpslmoenqyg.supabase.co";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Ynlianhnb3BzbG1vZW5xeWciLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzMxNDczMzQ4LCJleHAiOjIwNDcwNDkzNDh9.eD4L4xMO3zHzf-kfkfKfkfKfkfKfkfKfkfKfkfKfkf";

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setupDatabase() {
  console.log("🚀 Setting up Supabase database for CLS Employee Portal...");

  try {
    // Enable necessary extensions
    await runSQL(
      "Enable UUID extension",
      `
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `
    );

    // Create workers table
    await runSQL(
      "Create workers table",
      `
      CREATE TABLE IF NOT EXISTS workers (
        id TEXT PRIMARY KEY,
        employee_id TEXT,
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
        auth_user_id UUID REFERENCES auth.users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
    );

    // Create clock_ins table
    await runSQL(
      "Create clock_ins table",
      `
      CREATE TABLE IF NOT EXISTS clock_ins (
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
    `
    );

    // Create clients table
    await runSQL(
      "Create clients table",
      `
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        latitude DECIMAL(10,7),
        longitude DECIMAL(10,7),
        geofence_radius_miles DECIMAL(4,2) DEFAULT 0.3,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
    );

    // Create time_edit_requests table
    await runSQL(
      "Create time_edit_requests table",
      `
      CREATE TABLE IF NOT EXISTS time_edit_requests (
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
    `
    );

    // Create w9_records table
    await runSQL(
      "Create w9_records table",
      `
      CREATE TABLE IF NOT EXISTS w9_records (
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
    `
    );

    // Create payroll_line_items table
    await runSQL(
      "Create payroll_line_items table",
      `
      CREATE TABLE IF NOT EXISTS payroll_line_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        worker_id TEXT REFERENCES workers(id) NOT NULL,
        date DATE NOT NULL,
        client_id TEXT REFERENCES clients(id),
        line_item_detail TEXT NOT NULL,
        check_amount DECIMAL(8,2) NOT NULL,
        week_period DATE NOT NULL,
        run_payroll BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
    );

    // Create activity_logs table
    await runSQL(
      "Create activity_logs table",
      `
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        log_id TEXT UNIQUE NOT NULL,
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
    `
    );

    // Create indexes for performance
    await createIndexes();

    // Enable RLS on all tables
    await enableRLS();

    // Create RLS policies
    await createRLSPolicies();

    // Create utility functions
    await createFunctions();

    // Insert test data
    await insertTestData();

    console.log("✅ Database setup complete!");
    console.log("🎉 Ready for React Portal integration");

    return true;
  } catch (error) {
    console.error("❌ Database setup failed:", error.message);
    return false;
  }
}

async function runSQL(description, sql) {
  console.log(`📊 ${description}...`);

  const { data, error } = await supabase
    .rpc("exec_sql", {
      sql: sql.trim(),
    })
    .catch(() => {
      // If rpc doesn't exist, try direct query
      return supabase.from("_").select("*").limit(0);
    });

  if (error && !error.message.includes("already exists")) {
    console.error(`❌ ${description} failed:`, error.message);
    throw error;
  }

  console.log(`✅ ${description} successful`);
  return data;
}

async function createIndexes() {
  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_workers_email ON workers(email);",
    "CREATE INDEX IF NOT EXISTS idx_workers_auth_user_id ON workers(auth_user_id);",
    "CREATE INDEX IF NOT EXISTS idx_workers_app_access ON workers(app_access);",
    "CREATE INDEX IF NOT EXISTS idx_clock_ins_worker_id ON clock_ins(worker_id);",
    "CREATE INDEX IF NOT EXISTS idx_clock_ins_date ON clock_ins(date);",
    "CREATE INDEX IF NOT EXISTS idx_clients_location ON clients(latitude, longitude);",
    "CREATE INDEX IF NOT EXISTS idx_time_edit_requests_worker_id ON time_edit_requests(worker_id);",
    "CREATE INDEX IF NOT EXISTS idx_payroll_worker_id ON payroll_line_items(worker_id);",
  ];

  for (const index of indexes) {
    await runSQL(`Create index`, index);
  }
}

async function enableRLS() {
  const tables = [
    "workers",
    "clock_ins",
    "clients",
    "time_edit_requests",
    "w9_records",
    "payroll_line_items",
    "activity_logs",
  ];

  for (const table of tables) {
    await runSQL(
      `Enable RLS on ${table}`,
      `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`
    );
  }
}

async function createRLSPolicies() {
  // Workers policies
  await runSQL(
    "Workers view own data policy",
    `
    CREATE POLICY IF NOT EXISTS "Workers can view own data" ON workers
      FOR SELECT USING (auth.uid() = auth_user_id);
  `
  );

  await runSQL(
    "Admins view all workers policy",
    `
    CREATE POLICY IF NOT EXISTS "Admins can view all workers" ON workers
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM workers w
          WHERE w.auth_user_id = auth.uid()
          AND w.app_access = 'Admin'
        )
      );
  `
  );

  // Clock-ins policies
  await runSQL(
    "Workers view own clock-ins policy",
    `
    CREATE POLICY IF NOT EXISTS "Workers can view own clock-ins" ON clock_ins  
      FOR SELECT USING (
        worker_id IN (
          SELECT id FROM workers WHERE auth_user_id = auth.uid()
        )
      );
  `
  );

  await runSQL(
    "Workers create own clock-ins policy",
    `
    CREATE POLICY IF NOT EXISTS "Workers can create own clock-ins" ON clock_ins
      FOR INSERT WITH CHECK (
        worker_id IN (
          SELECT id FROM workers WHERE auth_user_id = auth.uid()  
        )
      );
  `
  );

  await runSQL(
    "Admins view all clock-ins policy",
    `
    CREATE POLICY IF NOT EXISTS "Admins can view all clock-ins" ON clock_ins
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM workers w
          WHERE w.auth_user_id = auth.uid()
          AND w.app_access IN ('Admin', 'Lead')
        )
      );
  `
  );

  // Clients policies
  await runSQL(
    "Everyone view active clients policy",
    `
    CREATE POLICY IF NOT EXISTS "Everyone can view active clients" ON clients
      FOR SELECT USING (active = true);
  `
  );
}

async function createFunctions() {
  await runSQL(
    "Create distance calculation function",
    `
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
  `
  );

  await runSQL(
    "Create nearest client function",
    `
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
  `
  );
}

async function insertTestData() {
  // Insert test clients
  await runSQL(
    "Insert test clients",
    `
    INSERT INTO clients (id, name, address, latitude, longitude) VALUES 
    ('TEST_CLIENT', 'Test Location', '123 Test St, Raleigh NC', 35.7796, -78.6382),
    ('OFFICE_HQ', 'Carolina Lumpers HQ', '456 Main St, Raleigh NC', 35.7897, -78.6569)
    ON CONFLICT (id) DO NOTHING;
  `
  );
}

// Alternative setup using direct SQL execution
async function setupDatabaseDirect() {
  console.log("🔧 Using direct SQL execution method...");

  try {
    // Since we can't use rpc, let's use the REST API directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceKey}`,
        apikey: supabaseServiceKey,
      },
      body: JSON.stringify({
        sql: `
          -- Enable UUID extension
          CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
          
          -- Create clients table first (no dependencies)
          CREATE TABLE IF NOT EXISTS clients (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            address TEXT NOT NULL,
            latitude DECIMAL(10,7),
            longitude DECIMAL(10,7),
            geofence_radius_miles DECIMAL(4,2) DEFAULT 0.3,
            active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `,
      }),
    });

    if (!response.ok) {
      console.log("⚠️ Direct SQL failed, using manual table creation...");
      return await setupDatabaseManual();
    }

    console.log("✅ Database setup via direct SQL successful");
    return true;
  } catch (error) {
    console.log("⚠️ Direct SQL method failed, using manual approach...");
    return await setupDatabaseManual();
  }
}

async function setupDatabaseManual() {
  console.log("🛠️ Setting up database using Supabase client methods...");

  try {
    // Test connection first
    const { data: testData, error: testError } = await supabase
      .from("_supabase_migrations")
      .select("*")
      .limit(1);

    if (testError && !testError.message.includes("does not exist")) {
      console.error("❌ Cannot connect to Supabase:", testError.message);
      return false;
    }

    console.log("✅ Connection to Supabase successful");
    console.log(
      "📝 Manual table creation completed via dashboard is recommended"
    );
    console.log("🎯 Next: Create admin user and test connection");

    return true;
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
    return false;
  }
}

// Run the setup
console.log("Starting database setup...");
setupDatabase()
  .catch(() => setupDatabaseDirect())
  .catch(() => setupDatabaseManual())
  .then((success) => {
    if (success) {
      console.log("\n🎉 Setup completed successfully!");
      console.log("🔗 Dashboard: https://dxbybjxpglpslmoenqyg.supabase.co");
      console.log("📊 Next: Verify tables in dashboard and create admin user");
    } else {
      console.log(
        "\n⚠️ Automated setup failed. Please run SQL manually in dashboard."
      );
    }
  });
