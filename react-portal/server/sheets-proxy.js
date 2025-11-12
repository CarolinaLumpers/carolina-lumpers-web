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

// Initialize Google APIs with service account
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets', // Full read/write access
    'https://www.googleapis.com/auth/drive.readonly',
  ],
});

const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });

// Enable CORS for local development (allow both common Vite ports)
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
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

/**
 * POST /api/sheets/:spreadsheetId/values/:range/append
 * Append new row(s) to a sheet
 * Body: { values: [[col1, col2, ...]] }
 */
app.post('/api/sheets/:spreadsheetId/values/:range/append', async (req, res) => {
  try {
    const { spreadsheetId, range } = req.params;
    const { values } = req.body;

    if (!values || !Array.isArray(values)) {
      return res.status(400).json({ ok: false, error: 'Invalid values format' });
    }

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: decodeURIComponent(range),
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    res.json({
      ok: true,
      data: response.data,
    });
  } catch (error) {
    console.error('Sheets API Append Error:', error.message);
    res.status(error.code || 500).json({
      ok: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/sheets/:spreadsheetId/values/:range
 * Update existing row(s) in a sheet
 * Body: { values: [[col1, col2, ...]] }
 */
app.put('/api/sheets/:spreadsheetId/values/:range', async (req, res) => {
  try {
    const { spreadsheetId, range } = req.params;
    const { values } = req.body;

    if (!values || !Array.isArray(values)) {
      return res.status(400).json({ ok: false, error: 'Invalid values format' });
    }

    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: decodeURIComponent(range),
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    res.json({
      ok: true,
      data: response.data,
    });
  } catch (error) {
    console.error('Sheets API Update Error:', error.message);
    res.status(error.code || 500).json({
      ok: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/sheets/:spreadsheetId/values/:range
 * Clear values in a specific range (soft delete)
 */
app.delete('/api/sheets/:spreadsheetId/values/:range', async (req, res) => {
  try {
    const { spreadsheetId, range } = req.params;

    const response = await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: decodeURIComponent(range),
    });

    res.json({
      ok: true,
      data: response.data,
    });
  } catch (error) {
    console.error('Sheets API Delete Error:', error.message);
    res.status(error.code || 500).json({
      ok: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/drive/photo/:folderId/:filePath
 * Fetch worker photo from Google Drive folder
 * Example: /api/drive/photo/1w4zgtci_SzdG_xi5Odk98xQBaxwGzGOh/Workers_Images/SG-001.jpg
 */
app.get('/api/drive/photo/:folderId/*', async (req, res) => {
  try {
    const { folderId } = req.params;
    const filePath = req.params[0]; // Get the rest of the path (e.g., Workers_Images/SG-001.jpg)
    
    if (!filePath) {
      return res.status(400).json({ ok: false, error: 'File path is required' });
    }

    // Extract filename from path
    const fileName = filePath.split('/').pop();
    
    // Search for the file in the Drive folder
    const searchResponse = await drive.files.list({
      q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType)',
      spaces: 'drive',
    });

    if (!searchResponse.data.files || searchResponse.data.files.length === 0) {
      return res.status(404).json({ ok: false, error: 'Photo not found' });
    }

    const file = searchResponse.data.files[0];

    // Get the file content
    const fileResponse = await drive.files.get(
      {
        fileId: file.id,
        alt: 'media',
      },
      { responseType: 'stream' }
    );

    // Set appropriate headers
    res.setHeader('Content-Type', file.mimeType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

    // Pipe the file stream to the response
    fileResponse.data.pipe(res);
  } catch (error) {
    console.error('Drive API Error:', error.message);
    res.status(error.code || 500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Sheets proxy server running on http://localhost:${PORT}`);
  console.log(`📊 Using service account: ${credentials.client_email}`);
  console.log(`📷 Drive API enabled for worker photos`);
});
