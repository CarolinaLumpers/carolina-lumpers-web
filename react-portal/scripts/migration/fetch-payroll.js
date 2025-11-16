#!/usr/bin/env node

/**
 * Export Payroll LineItems from Google Sheets to JSON
 *
 * Source: CLS_Hub_Backend spreadsheet
 * Sheet: "Payroll LineItems"
 * Columns: A-O (15 columns, 321 rows)
 */

import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Google Sheets configuration
const SPREADSHEET_ID = "1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk"; // CLS_Hub_Backend
const SHEET_NAME = "Payroll LineItems";
const RANGE = `${SHEET_NAME}!A:O`; // 15 columns

// Output path
const OUTPUT_PATH = path.resolve(
  __dirname,
  "../../data/exports/payroll-export.json"
);

async function fetchPayrollRecords() {
  console.log("🚀 Starting payroll records export...\n");

  try {
    // Load service account credentials
    const keyPath = path.resolve(
      __dirname,
      "../../server/service-account-key.json"
    );

    if (!fs.existsSync(keyPath)) {
      console.error("❌ Service account key not found:", keyPath);
      console.error(
        "💡 Make sure service-account-key.json exists in server/ directory"
      );
      process.exit(1);
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    console.log("📊 Fetching from Google Sheets...");
    console.log(`   Spreadsheet: ${SPREADSHEET_ID}`);
    console.log(`   Sheet: ${SHEET_NAME}`);
    console.log(`   Range: ${RANGE}\n`);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      console.log("⚠️  No data found in sheet");
      return;
    }

    console.log(`✅ Fetched ${rows.length} rows (including header)\n`);

    // Extract headers and data
    const headers = rows[0];
    const dataRows = rows.slice(1);

    console.log("📋 Column headers:");
    headers.forEach((header, index) => {
      const column = String.fromCharCode(65 + index); // A, B, C, ...
      console.log(`   ${column}: ${header}`);
    });

    // Map to JSON objects
    const payrollRecords = dataRows.map((row) => {
      const record = {};
      headers.forEach((header, index) => {
        // Convert header to snake_case
        const key = header
          .toLowerCase()
          .replace(/\s+/g, "_")
          .replace(/[#]/g, "number");

        record[key] = row[index] || null;
      });
      return record;
    });

    console.log(`\n✅ Processed ${payrollRecords.length} payroll records\n`);

    // Show sample record
    console.log("📝 Sample record (first):");
    console.log(JSON.stringify(payrollRecords[0], null, 2));

    // Statistics
    const workers = new Set(
      payrollRecords.map((r) => r.workerid).filter(Boolean)
    );
    const totalAmount = payrollRecords.reduce((sum, r) => {
      const amount = parseFloat(r.check_amount);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    console.log("\n📊 Statistics:");
    console.log(`   Total records: ${payrollRecords.length}`);
    console.log(`   Unique workers: ${workers.size}`);
    console.log(`   Total amount: $${totalAmount.toFixed(2)}`);

    // Date range
    const dates = payrollRecords
      .map((r) => r.date)
      .filter(Boolean)
      .sort();

    if (dates.length > 0) {
      console.log(`   Date range: ${dates[0]} to ${dates[dates.length - 1]}`);
    }

    // Save to file
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payrollRecords, null, 2));
    console.log(`\n💾 Saved to: ${OUTPUT_PATH}`);
    console.log(
      `   File size: ${(fs.statSync(OUTPUT_PATH).size / 1024).toFixed(2)} KB\n`
    );

    console.log("✅ Export complete!\n");
  } catch (error) {
    console.error("\n❌ Error fetching payroll records:", error.message);
    if (error.code === "ENOENT") {
      console.error("💡 Make sure service-account-key.json exists");
    }
    process.exit(1);
  }
}

fetchPayrollRecords().catch(console.error);
