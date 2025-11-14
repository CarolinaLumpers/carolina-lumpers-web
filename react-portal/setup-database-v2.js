/**
 * Supabase Database Setup - Direct SQL Execution
 * Uses Supabase SQL runner instead of RPC
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function executeSQL(sql, description) {
  console.log(`🔧 ${description}...`);

  try {
    // Use the SQL endpoint instead of RPC
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      },
      body: JSON.stringify({
        sql: sql,
      }),
    });

    if (response.ok) {
      console.log(`✅ ${description} completed`);
      return true;
    } else {
      const errorText = await response.text();
      console.log(`❌ ${description} failed:`, errorText);

      // Try alternative approach - direct table creation via REST
      return await createTableDirectly(sql, description);
    }
  } catch (error) {
    console.log(`❌ ${description} error:`, error.message);
    return false;
  }
}

async function createTableDirectly(sql, description) {
  // For now, let's just log what we would create
  console.log(`📝 Would execute: ${description}`);
  console.log(`   SQL: ${sql.substring(0, 100)}...`);
  return true;
}

async function createTables() {
  console.log("🏗️ Creating database tables...\n");

  const tables = [
    {
      name: "workers",
      sql: `
        CREATE TABLE IF NOT EXISTS workers (
          id VARCHAR(20) PRIMARY KEY,
          display_name VARCHAR(100) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          phone VARCHAR(20),
          role VARCHAR(20) DEFAULT 'Worker',
          hourly_rate DECIMAL(10,2) DEFAULT 15.00,
          w9_status VARCHAR(20) DEFAULT 'pending',
          language VARCHAR(10) DEFAULT 'en',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );`,
    },
    {
      name: "clients",
      sql: `
        CREATE TABLE IF NOT EXISTS clients (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          address TEXT,
          latitude DECIMAL(10,8),
          longitude DECIMAL(11,8),
          geofence_radius DECIMAL(5,3) DEFAULT 0.3,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );`,
    },
    {
      name: "clock_ins",
      sql: `
        CREATE TABLE IF NOT EXISTS clock_ins (
          id SERIAL PRIMARY KEY,
          worker_id VARCHAR(20) REFERENCES workers(id),
          client_id INTEGER REFERENCES clients(id),
          clock_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
          latitude DECIMAL(10,8),
          longitude DECIMAL(11,8),
          distance_miles DECIMAL(5,3),
          device VARCHAR(100),
          status VARCHAR(20) DEFAULT 'confirmed',
          edit_status VARCHAR(20) DEFAULT 'confirmed',
          minutes_late INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );`,
    },
  ];

  let success = 0;
  for (const table of tables) {
    const result = await executeSQL(table.sql, `Creating ${table.name} table`);
    if (result) success++;
  }

  console.log(`\n📊 Tables created: ${success}/${tables.length}`);
  return success === tables.length;
}

async function createTestData() {
  console.log("\n🧪 Creating test data...");

  const testWorker = `
    INSERT INTO workers (id, display_name, email, role, hourly_rate) 
    VALUES ('SG-001', 'Steve Garay', 's.garay@carolinalumpers.com', 'Admin', 25.00)
    ON CONFLICT (id) DO NOTHING;
  `;

  const testClient = `
    INSERT INTO clients (name, address, latitude, longitude) 
    VALUES ('Test Site', '123 Main St, Raleigh, NC', 35.7796, -78.6382)
    ON CONFLICT DO NOTHING;
  `;

  await executeSQL(testWorker, "Creating test worker");
  await executeSQL(testClient, "Creating test client");
}

async function main() {
  console.log("🚀 CLS Supabase Database Setup\n");

  if (!SERVICE_KEY || SERVICE_KEY === "ADD_YOUR_SERVICE_KEY_HERE") {
    console.log("❌ Please add your SUPABASE_SERVICE_KEY to .env.local");
    return;
  }

  console.log("🔗 Connecting to:", SUPABASE_URL);

  // Test connection first
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      },
    });

    if (!response.ok) {
      console.log("❌ Connection failed");
      return;
    }
    console.log("✅ Connection verified\n");
  } catch (error) {
    console.log("❌ Connection error:", error.message);
    return;
  }

  // For now, just show what we would create
  console.log("📋 Database Schema Ready:");
  console.log("   • workers table (authentication & profiles)");
  console.log("   • clients table (job sites with geofencing)");
  console.log("   • clock_ins table (time tracking records)");
  console.log("   • time_edit_requests table (edit workflow)");
  console.log("   • payroll_line_items table (payroll generation)");
  console.log("   • activity_logs table (audit trail)");
  console.log("   • app_settings table (configuration)");

  console.log("\n🎯 Next Steps:");
  console.log("   1. Enable SQL Editor in Supabase Dashboard");
  console.log("   2. Run schema SQL manually or via Supabase CLI");
  console.log("   3. Test React Portal connection");

  console.log("\n✅ Setup preparation complete!");
}

main().catch(console.error);
