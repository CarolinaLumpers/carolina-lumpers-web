# Direct Google Sheets API Access

This project includes a secure proxy server for direct access to Google Sheets using OAuth service account authentication, bypassing Apps Script for read-only operations.

## Architecture

```
React Frontend (localhost:5174)
    ↓ fetch()
Proxy Server (localhost:3001)
    ↓ Google Auth Service Account
Google Sheets API v4
    ↓ reads from
CLS_Hub_Backend Spreadsheet (private)
```

## Components

### 1. Service Account
- **Email**: `react-portal-sheets@cls-operations-hub.iam.gserviceaccount.com`
- **Project**: `cls-operations-hub` (GCP)
- **Permissions**: Read-only access to spreadsheet
- **Key File**: `react-portal/server/service-account-key.json` (DO NOT COMMIT)

### 2. Proxy Server
- **Location**: `react-portal/server/sheets-proxy.js`
- **Port**: 3001
- **Purpose**: Handles service account authentication server-side (keeps credentials secure)
- **Dependencies**: `express`, `cors`, `googleapis`

### 3. Frontend Service
- **Location**: `react-portal/src/services/sheets.js`
- **Methods**:
  - `getPayrollDirect(workerId, weekEnd)` - Fetch payroll from "Payroll LineItems" sheet
  - `getWorkersDirect()` - Get all workers from "Workers" sheet
  - `getClockInsDirect(workerId, date)` - Get clock-ins from "ClockIn" sheet

## Setup Instructions

### Prerequisites
- ✅ Google Cloud CLI installed (`gcloud` command available)
- ✅ Service account created with Sheets API access
- ✅ Spreadsheet shared with service account email (Viewer role)

### Installation

1. **Install proxy server dependencies:**
   ```powershell
   cd react-portal/server
   npm install
   ```

2. **Configure environment variables:**
   
   Copy `.env.example` to `.env.local`:
   ```powershell
   cd react-portal
   Copy-Item .env.example .env.local
   ```
   
   The `.env.local` file contains:
   ```env
   VITE_SHEETS_PROXY_URL=http://localhost:3001
   VITE_SPREADSHEET_ID=1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk
   ```

3. **Verify service account key exists:**
   ```powershell
   Test-Path react-portal/server/service-account-key.json
   # Should return: True
   ```

## Running the System

You need **TWO terminals** running simultaneously:

### Terminal 1: Proxy Server
```powershell
cd react-portal/server
npm start
```

Expected output:
```
🚀 Sheets proxy server running on http://localhost:3001
📊 Using service account: react-portal-sheets@cls-operations-hub.iam.gserviceaccount.com
```

### Terminal 2: React Dev Server
```powershell
cd react-portal
npm run dev
```

Expected output:
```
VITE v5.4.21  ready in XXX ms
➜  Local:   http://localhost:5174/
```

## Usage in React Components

```javascript
import { sheetsApi } from '../services/sheets';

// Example 1: Fetch all workers
const fetchWorkers = async () => {
  try {
    const workers = await sheetsApi.getWorkersDirect();
    // workers = [{ id: 'SG-001', name: 'Steve Garay', role: 'Admin' }, ...]
    console.log('Workers:', workers);
  } catch (error) {
    console.error('Failed to fetch workers:', error);
  }
};

// Example 2: Fetch payroll for specific worker and week
const fetchPayroll = async (workerId, weekEnd) => {
  try {
    const payroll = await sheetsApi.getPayrollDirect(workerId, weekEnd);
    // payroll = { success: true, rows: [...], totals: {...} }
    console.log('Payroll:', payroll);
  } catch (error) {
    console.error('Failed to fetch payroll:', error);
  }
};

// Example 3: Fetch clock-ins
const fetchClockIns = async (workerId, date) => {
  try {
    const clockIns = await sheetsApi.getClockInsDirect(workerId, date);
    // clockIns = [{ date: '2025-01-15', time: '08:00', site: 'Client A', ... }]
    console.log('Clock-ins:', clockIns);
  } catch (error) {
    console.error('Failed to fetch clock-ins:', error);
  }
};
```

## API Endpoints

The proxy server exposes the following REST endpoints:

### Health Check
```http
GET http://localhost:3001/health
```

Response:
```json
{
  "status": "ok",
  "message": "Sheets proxy server running"
}
```

### Get Sheet Values
```http
GET http://localhost:3001/api/sheets/{spreadsheetId}/values/{range}
```

Parameters:
- `spreadsheetId` - Google Sheets spreadsheet ID
- `range` - Sheet range in A1 notation (e.g., `Workers!A1:E100`)

Response:
```json
{
  "ok": true,
  "data": {
    "values": [
      ["Header1", "Header2", "Header3"],
      ["Value1", "Value2", "Value3"]
    ]
  }
}
```

### Get Spreadsheet Metadata
```http
GET http://localhost:3001/api/sheets/{spreadsheetId}/metadata
```

Response:
```json
{
  "ok": true,
  "data": {
    "properties": {
      "title": "CLS_Hub_Backend"
    },
    "sheets": [...]
  }
}
```

## Testing

### Test Proxy Server (PowerShell)
```powershell
# Test health endpoint
Invoke-RestMethod -Uri "http://localhost:3001/health"

# Test fetching Workers sheet
$result = Invoke-RestMethod -Uri "http://localhost:3001/api/sheets/1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk/values/Workers!A1:E10"
$result.data.values
```

### Test Frontend Service (Browser Console)
```javascript
// Open http://localhost:5174 and run in console
const { sheetsApi } = await import('./src/services/sheets.js');
const workers = await sheetsApi.getWorkersDirect();
console.table(workers);
```

## Comparison: Apps Script vs Direct Sheets

| Feature | Apps Script (Current) | Direct Sheets API |
|---------|---------------------|------------------|
| **Setup** | Already deployed ✅ | Requires proxy server |
| **Authentication** | Web App URL + JSONP | Service Account OAuth |
| **Security** | Backend validation | Service account permissions |
| **Speed** | Medium (proxy + backend) | Fast (direct to Sheets) |
| **Backend Logic** | Server-side calculations | Client-side parsing |
| **Write Access** | ✅ Full CRUD | ❌ Read-only |
| **Rate Limits** | Apps Script quotas | Sheets API quotas |
| **Use Case** | Writes, calculations, logging | Fast reads, reporting |

## When to Use Each Approach

### Use Direct Sheets API When:
- ✅ Reading large datasets (faster)
- ✅ Building reports or dashboards
- ✅ Exporting data
- ✅ No backend calculations needed
- ✅ Data is already formatted in sheets

### Use Apps Script When:
- ✅ Writing data (clock-ins, approvals)
- ✅ Backend validation required
- ✅ Complex calculations
- ✅ Sending emails/notifications
- ✅ Centralized logging
- ✅ Need to hide business logic

## Troubleshooting

### Proxy server won't start
```powershell
# Check if port 3001 is in use
netstat -ano | Select-String ":3001"

# Kill process if needed
Stop-Process -Id <PID>
```

### "Permission Denied" errors
1. Verify spreadsheet is shared with service account email
2. Check service account has "Viewer" role
3. Verify service account key file exists and is valid

### Frontend can't connect to proxy
1. Ensure proxy server is running on port 3001
2. Check CORS settings in `sheets-proxy.js`
3. Verify `VITE_SHEETS_PROXY_URL` in `.env.local`

### Service account key expired/invalid
```powershell
# Create new key
gcloud iam service-accounts keys create service-account-key.json `
  --iam-account=react-portal-sheets@cls-operations-hub.iam.gserviceaccount.com
```

## Security Notes

- ⚠️ **NEVER commit** `service-account-key.json` to git
- ⚠️ **NEVER commit** `.env.local` to git
- ✅ Both are already in `.gitignore`
- ✅ Service account has read-only permissions
- ✅ Credentials stay on server (not exposed to frontend)
- ✅ CORS configured for `localhost:5174` only

## File Structure

```
react-portal/
├── .env.local                    # Environment variables (not committed)
├── .env.example                  # Template for .env.local
├── src/
│   └── services/
│       └── sheets.js             # Frontend service (API calls to proxy)
└── server/
    ├── package.json              # Proxy server dependencies
    ├── sheets-proxy.js           # Proxy server (Express + googleapis)
    └── service-account-key.json  # Service account credentials (not committed)
```

## Future Enhancements

- [ ] Add caching layer (Redis) for frequently accessed data
- [ ] Implement batch requests for multiple sheets
- [ ] Add webhook support for real-time updates
- [ ] Create read/write endpoints with service account that has edit permissions
- [ ] Add request rate limiting
- [ ] Add authentication middleware for proxy endpoints
