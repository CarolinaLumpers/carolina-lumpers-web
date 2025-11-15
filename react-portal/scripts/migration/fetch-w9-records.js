/**
 * Fetch W9 Records from Google Sheets
 * Read W9_Records sheet to understand structure and prepare for Supabase migration
 */

import { google } from "googleapis";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SPREADSHEET_ID = "1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk";
const SHEET_NAME = "W9_Records";

async function fetchW9Records() {
  try {
    console.log("🔍 Fetching W9 Records from Google Sheets...\n");

    // Load service account credentials
    const serviceAccountPath = "./server/service-account-key.json";
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(
        "❌ Service account key not found. Please ensure server/service-account-key.json exists."
      );
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: serviceAccountPath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Fetch all data from W9_Records sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:Z`, // Get all columns
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      console.log("⚠️  No data found in W9_Records sheet");
      return;
    }

    // First row is headers
    const headers = rows[0];
    console.log("📋 Column Headers:");
    headers.forEach((header, index) => {
      console.log(`   ${String.fromCharCode(65 + index)}: ${header}`);
    });

    console.log(`\n📊 Total Records: ${rows.length - 1}`);

    // Analyze data
    const records = rows.slice(1).map((row) => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = row[index] || "";
      });
      return record;
    });

    // Show sample records
    console.log("\n📝 Sample Records (first 3):");
    records.slice(0, 3).forEach((record, index) => {
      console.log(`\n--- Record ${index + 1} ---`);
      Object.entries(record).forEach(([key, value]) => {
        if (value) console.log(`   ${key}: ${value}`);
      });
    });

    // Analyze status distribution
    const statusField = headers.find(
      (h) =>
        h.toLowerCase().includes("status") ||
        h.toLowerCase().includes("w9status")
    );

    if (statusField) {
      const statusCounts = {};
      records.forEach((record) => {
        const status = record[statusField] || "unknown";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      console.log("\n📈 Status Distribution:");
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
    }

    // Save to JSON for inspection
    const outputPath = "./w9-records-export.json";
    fs.writeFileSync(outputPath, JSON.stringify({ headers, records }, null, 2));
    console.log(`\n💾 Full data exported to: ${outputPath}`);

    return { headers, records };
  } catch (error) {
    console.error("❌ Error fetching W9 records:", error.message);
    if (error.code === "ENOENT") {
      console.error(
        "   Make sure service-account-key.json exists in react-portal/server/"
      );
    }
    throw error;
  }
}

// Auto-run on import
fetchW9Records()
  .then(() => {
    console.log("\n✅ W9 records fetch complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Failed to fetch W9 records");
    process.exit(1);
  });
