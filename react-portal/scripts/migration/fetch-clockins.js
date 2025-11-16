/**
 * Fetch Clock-in Records from Google Sheets API
 *
 * This script fetches all clock-in records from the ClockIn sheet
 * and exports them to JSON for import into Supabase.
 *
 * Usage: node scripts/migration/fetch-clockins.js
 */

import { google } from "googleapis";
import fs from "fs";
import path from "path";

// Google Sheets configuration
const SPREADSHEET_ID = "1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk"; // CLS_Hub_Backend
const SHEET_NAME = "ClockIn";
const RANGE = `${SHEET_NAME}!A:L`; // ClockinID through Distance (mi)

// Service account credentials
const CREDENTIALS_PATH = path.join(
  process.cwd(),
  "server",
  "service-account-key.json"
);

async function fetchClockIns() {
  console.log("🚀 Fetching clock-in records from Google Sheets...\n");

  try {
    // Load service account credentials
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      console.error("❌ Service account key not found at:", CREDENTIALS_PATH);
      console.error("Please ensure server/service-account-key.json exists");
      process.exit(1);
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));

    // Initialize Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // Fetch clock-in data
    console.log(`📊 Reading from: ${SPREADSHEET_ID}`);
    console.log(`📄 Sheet: ${SHEET_NAME}`);
    console.log(`📍 Range: ${RANGE}\n`);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      console.log("⚠️  No data found in ClockIn sheet");
      process.exit(0);
    }

    // Parse data
    const headers = rows[0];
    console.log("📋 Headers found:", headers.join(", "));
    console.log(`📊 Total rows (including header): ${rows.length}\n`);

    // Map rows to objects
    const clockIns = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const clockIn = {};

      headers.forEach((header, index) => {
        const value = row[index] || "";

        // Map headers to database field names
        switch (header.trim()) {
          case "ClockinID":
            clockIn.clockin_id = value;
            break;
          case "WorkerID":
            clockIn.worker_id = value; // Will be mapped to UUID during import
            break;
          case "Date":
            clockIn.date = value;
            break;
          case "Time":
            clockIn.time = value;
            break;
          case "Notes":
            clockIn.notes = value;
            break;
          case "TaskID":
            clockIn.task_id = value;
            break;
          case "Approve to Tasks":
            clockIn.approve_to_tasks = value;
            break;
          case "Latitude":
            clockIn.latitude = value ? parseFloat(value) : null;
            break;
          case "Longitude": // Note: may have space in sheet
          case "Longitude ": // Account for trailing space
            clockIn.longitude = value ? parseFloat(value) : null;
            break;
          case "Needs Processing":
            clockIn.needs_processing = value;
            break;
          case "Nearest Client":
            clockIn.nearest_client = value;
            break;
          case "Distance (mi)":
            clockIn.distance_miles = value ? parseFloat(value) : null;
            break;
          default:
            // Store unknown fields with original header
            clockIn[header.trim().toLowerCase().replace(/\s+/g, "_")] = value;
        }
      });

      // Only add if has valid ClockinID and WorkerID
      if (clockIn.clockin_id && clockIn.worker_id) {
        clockIns.push(clockIn);
      }
    }

    console.log(`✅ Parsed ${clockIns.length} valid clock-in records\n`);

    // Show sample
    if (clockIns.length > 0) {
      console.log("📝 Sample record (first):\n");
      console.log(JSON.stringify(clockIns[0], null, 2));
      console.log("\n📝 Sample record (last):\n");
      console.log(JSON.stringify(clockIns[clockIns.length - 1], null, 2));
    }

    // Export to JSON
    const exportDir = path.join(process.cwd(), "data", "exports");
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const exportPath = path.join(exportDir, "clockins-export.json");
    fs.writeFileSync(exportPath, JSON.stringify(clockIns, null, 2));

    console.log(`\n💾 Exported to: ${exportPath}`);
    console.log(`📊 Total records: ${clockIns.length}`);

    // Show worker distribution
    const workerCounts = clockIns.reduce((acc, ci) => {
      acc[ci.worker_id] = (acc[ci.worker_id] || 0) + 1;
      return acc;
    }, {});

    console.log(`\n👥 Clock-ins by worker (top 10):`);
    Object.entries(workerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([workerId, count]) => {
        console.log(`   ${workerId}: ${count} clock-ins`);
      });

    // Show date range
    const dates = clockIns
      .map((ci) => ci.date)
      .filter((d) => d)
      .sort();

    if (dates.length > 0) {
      console.log(`\n📅 Date range: ${dates[0]} to ${dates[dates.length - 1]}`);
    }

    console.log("\n✅ Clock-in data export complete!");
  } catch (error) {
    console.error("❌ Error fetching clock-ins:", error.message);
    if (error.code === "ENOENT") {
      console.error("Could not find service account key file");
    } else if (error.message.includes("Unable to parse")) {
      console.error("Invalid sheet range or data format");
    }
    process.exit(1);
  }
}

// Run the export
fetchClockIns().catch(console.error);
