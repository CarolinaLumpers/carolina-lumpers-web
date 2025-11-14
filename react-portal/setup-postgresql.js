/**
 * Direct PostgreSQL Database Setup
 * Creates tables using the PostgreSQL connection string
 */

import pkg from "pg";
import fs from "fs";
const { Client } = pkg;

// PostgreSQL connection
const connectionString =
  "postgresql://postgres:Stv060485!!!@db.dxbybjxpglpslmoenqyg.supabase.co:5432/postgres";

async function setupDatabase() {
  console.log("🚀 CLS PostgreSQL Database Setup\n");

  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    // Connect to database
    console.log("🔗 Connecting to PostgreSQL...");
    await client.connect();
    console.log("✅ Connected successfully!\n");

    // Read and execute schema
    console.log("📖 Reading schema file...");
    const schema = fs.readFileSync("supabase-ready.sql", "utf8");

    console.log("🏗️ Creating tables...");
    await client.query(schema);
    console.log("✅ Schema executed successfully!\n");

    // Test queries
    console.log("🧪 Testing database...");

    // Check workers table
    const workersResult = await client.query("SELECT COUNT(*) FROM workers");
    console.log(`👥 Workers table: ${workersResult.rows[0].count} records`);

    // Check admin user
    const adminResult = await client.query(
      "SELECT * FROM workers WHERE role = 'Admin'"
    );
    console.log(`👤 Admin users: ${adminResult.rows.length} found`);
    if (adminResult.rows.length > 0) {
      console.log(
        `   - ${adminResult.rows[0].display_name} (${adminResult.rows[0].id})`
      );
    }

    // Check clients table
    const clientsResult = await client.query("SELECT COUNT(*) FROM clients");
    console.log(`🏢 Clients table: ${clientsResult.rows[0].count} records`);

    // Check app settings
    const settingsResult = await client.query(
      "SELECT COUNT(*) FROM app_settings"
    );
    console.log(`⚙️  App settings: ${settingsResult.rows[0].count} records`);

    console.log("\n🎯 Database setup complete!");
    console.log("📋 Tables created:");
    console.log("   • workers (authentication & profiles)");
    console.log("   • clients (job sites with geofencing)");
    console.log("   • clock_ins (time tracking records)");
    console.log("   • time_edit_requests (edit workflow)");
    console.log("   • payroll_line_items (payroll generation)");
    console.log("   • activity_logs (audit trail)");
    console.log("   • app_settings (configuration)");

    console.log("\n✅ Ready for React Portal integration!");
  } catch (error) {
    console.error("❌ Database setup failed:", error.message);
    if (error.code) {
      console.error("   Error code:", error.code);
    }
    if (error.detail) {
      console.error("   Details:", error.detail);
    }
  } finally {
    await client.end();
    console.log("🔌 Database connection closed");
  }
}

// Run setup
setupDatabase().catch(console.error);
