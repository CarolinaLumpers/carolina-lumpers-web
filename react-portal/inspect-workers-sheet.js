/**
 * Inspect Workers Sheet Structure
 * Quick script to see what columns exist in the Workers sheet
 */

import { google } from "googleapis";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SPREADSHEET_ID = "1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk";
const SHEET_NAME = "Workers";

async function inspectWorkersSheet() {
  console.log("🔍 Inspecting Workers sheet structure...\n");

  const auth = new google.auth.GoogleAuth({
    keyFile: "./server/service-account-key.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1:Z10`, // First 10 rows
  });

  const rows = response.data.values;

  if (!rows || rows.length === 0) {
    console.log("❌ No data found");
    return;
  }

  const headers = rows[0];
  console.log("📋 Column Headers:");
  headers.forEach((header, index) => {
    console.log(`   ${String.fromCharCode(65 + index)}: ${header}`);
  });

  console.log(`\n📊 Total rows: ${rows.length - 1}`);
  
  if (rows.length > 1) {
    console.log("\n📝 Sample Record (row 2):");
    headers.forEach((header, index) => {
      if (rows[1][index]) {
        console.log(`   ${header}: ${rows[1][index]}`);
      }
    });
  }
}

inspectWorkersSheet().catch(console.error);
