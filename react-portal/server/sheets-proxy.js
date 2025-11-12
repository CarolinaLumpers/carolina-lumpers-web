/**
 * Backend proxy for Google Sheets API with service account authentication
 * This keeps the service account credentials secure on the server side.
 */

import { google } from 'googleapis';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Load service account credentials
const credentials = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'service-account-key.json'))
);

// Initialize Google Sheets API with service account
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Enable CORS for local development
app.use(cors({
  origin: 'http://localhost:5174',
  credentials: true,
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Sheets proxy server running' });
});

/**
 * GET /api/sheets/:spreadsheetId/values/:range
 * Fetch data from a specific range in the spreadsheet
 */
app.get('/api/sheets/:spreadsheetId/values/:range', async (req, res) => {
  try {
    const { spreadsheetId, range } = req.params;
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: decodeURIComponent(range),
    });

    res.json({
      ok: true,
      data: response.data,
    });
  } catch (error) {
    console.error('Sheets API Error:', error.message);
    res.status(error.code || 500).json({
      ok: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/sheets/:spreadsheetId/metadata
 * Get spreadsheet metadata (title, sheet names)
 */
app.get('/api/sheets/:spreadsheetId/metadata', async (req, res) => {
  try {
    const { spreadsheetId } = req.params;
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'properties,sheets.properties',
    });

    res.json({
      ok: true,
      data: response.data,
    });
  } catch (error) {
    console.error('Sheets API Error:', error.message);
    res.status(error.code || 500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Sheets proxy server running on http://localhost:${PORT}`);
  console.log(`📊 Using service account: ${credentials.client_email}`);
});
