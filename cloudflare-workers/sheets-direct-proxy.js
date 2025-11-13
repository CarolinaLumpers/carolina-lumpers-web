/**
 * Cloudflare Worker: Direct Google Sheets API Proxy
 *
 * Provides read-only access to Google Sheets via service account authentication.
 * Reduces load on Apps Script and speeds up data fetching.
 *
 * Service Account: react-portal-sheets@cls-operations-hub.iam.gserviceaccount.com
 * Spreadsheet: CLS_Hub_Backend (1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk)
 */

const SPREADSHEET_ID = "1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk";

// CORS headers for frontend access
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    try {
      // Get OAuth token from service account
      const token = await getServiceAccountToken(env);

      // Route actions
      switch (action) {
        case "report":
          return await handleReport(url, token);
        case "reportAll":
          return await handleReportAll(url, token);
        case "payroll":
          return await handlePayroll(url, token);
        case "payrollWeekPeriods":
          return await handlePayrollWeekPeriods(url, token);
        default:
          return jsonResponse({ ok: false, error: "Unknown action" }, 400);
      }
    } catch (error) {
      console.error("Error:", error);
      return jsonResponse({ ok: false, error: error.message }, 500);
    }
  },
};

// =================== Google OAuth Token Generation ===================
async function getServiceAccountToken(env) {
  // Service account credentials stored as Cloudflare environment variables
  const serviceAccount = {
    type: "service_account",
    project_id: env.GCP_PROJECT_ID,
    private_key_id: env.GCP_PRIVATE_KEY_ID,
    private_key: env.GCP_PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: env.GCP_CLIENT_EMAIL,
    client_id: env.GCP_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
  };

  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600; // 1 hour

  // Create JWT claims
  const claims = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: serviceAccount.token_uri,
    exp: expiry,
    iat: now,
  };

  // Sign JWT
  const jwt = await signJWT(claims, serviceAccount.private_key);

  // Exchange JWT for access token
  const tokenResponse = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error("Failed to get access token: " + JSON.stringify(tokenData));
  }

  return tokenData.access_token;
}

// Sign JWT using RS256 (Cloudflare Workers crypto API)
async function signJWT(claims, privateKeyPem) {
  // Create JWT header and payload
  const header = { alg: "RS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(claims));
  const message = `${encodedHeader}.${encodedPayload}`;

  // Import private key
  const privateKey = await importPrivateKey(privateKeyPem);

  // Sign message
  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    privateKey,
    new TextEncoder().encode(message)
  );

  // Return complete JWT
  return `${message}.${base64UrlEncode(signature)}`;
}

async function importPrivateKey(pem) {
  // Remove PEM header/footer and decode base64
  const pemContents = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  return await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

function base64UrlEncode(data) {
  if (data instanceof ArrayBuffer) {
    data = String.fromCharCode(...new Uint8Array(data));
  }
  return btoa(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// =================== Google Sheets API Calls ===================
async function getSheetValues(range, token) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
    range
  )}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(
      `Sheets API error: ${response.status} ${await response.text()}`
    );
  }

  return await response.json();
}

// =================== Action Handlers ===================

// Load worker's clock-in report
async function handleReport(url, token) {
  const workerId = url.searchParams.get("workerId");
  const callback = url.searchParams.get("callback");

  if (!workerId) {
    return jsonpResponse({ ok: false, error: "Missing workerId" }, callback);
  }

  // Fetch ClockIn sheet data
  const data = await getSheetValues("ClockIn!A2:J", token);
  const rows = data.values || [];

  // Filter by workerId and format
  const today = new Date().toISOString().split("T")[0];
  const clockIns = rows
    .filter((row) => row[0] === workerId && row[1] && row[1].startsWith(today))
    .map((row) => ({
      workerId: row[0],
      date: row[1],
      time: row[2],
      site: row[3],
      distance: row[4],
      latitude: row[5],
      longitude: row[6],
      clockinID: row[7],
      editStatus: row[8] || "confirmed",
      minutesLate: row[9] || 0,
    }));

  return jsonpResponse({ ok: true, clockIns }, callback);
}

// Load all workers' clock-ins (admin only)
async function handleReportAll(url, token) {
  const callback = url.searchParams.get("callback");
  const filterWorkerId = url.searchParams.get("workerId"); // Optional filter

  // Fetch ClockIn sheet data
  const data = await getSheetValues("ClockIn!A2:J", token);
  const rows = data.values || [];

  // Format all rows (filter serverside if workerId provided)
  const clockIns = rows
    .filter((row) => !filterWorkerId || row[0] === filterWorkerId)
    .map((row) => ({
      workerId: row[0],
      date: row[1],
      time: row[2],
      site: row[3],
      distance: row[4],
      latitude: row[5],
      longitude: row[6],
      clockinID: row[7],
      editStatus: row[8] || "confirmed",
      minutesLate: row[9] || 0,
    }));

  return jsonpResponse({ ok: true, clockIns }, callback);
}

// Load payroll data for a worker
async function handlePayroll(url, token) {
  const workerId = url.searchParams.get("workerId");
  const weekEnd = url.searchParams.get("weekEnd");
  const callback = url.searchParams.get("callback");

  if (!workerId || !weekEnd) {
    return jsonpResponse(
      { ok: false, error: "Missing workerId or weekEnd" },
      callback
    );
  }

  // Fetch Payroll LineItems sheet
  const data = await getSheetValues("Payroll LineItems!A2:L", token);
  const rows = data.values || [];

  // Filter by workerId and weekEnd
  const payrollRows = rows
    .filter((row) => row[0] === workerId && row[1] === weekEnd)
    .map((row) => ({
      workerId: row[0],
      weekEnd: row[1],
      date: row[2],
      time: row[3],
      site: row[4],
      hours: parseFloat(row[5]) || 0,
      rate: parseFloat(row[6]) || 0,
      regularPay: parseFloat(row[7]) || 0,
      overtimePay: parseFloat(row[8]) || 0,
      totalPay: parseFloat(row[9]) || 0,
      status: row[10] || "confirmed",
      notes: row[11] || "",
    }));

  // Calculate totals
  const totals = payrollRows.reduce(
    (acc, row) => ({
      hours: acc.hours + row.hours,
      regularPay: acc.regularPay + row.regularPay,
      overtimePay: acc.overtimePay + row.overtimePay,
      totalPay: acc.totalPay + row.totalPay,
    }),
    { hours: 0, regularPay: 0, overtimePay: 0, totalPay: 0 }
  );

  return jsonpResponse({ ok: true, rows: payrollRows, totals }, callback);
}

// Load available payroll week periods
async function handlePayrollWeekPeriods(url, token) {
  const callback = url.searchParams.get("callback");

  // Fetch Payroll LineItems sheet to get unique week periods
  const data = await getSheetValues("Payroll LineItems!B2:B", token);
  const rows = data.values || [];

  // Get unique week end dates, sorted descending
  const weekPeriods = [
    ...new Set(rows.map((row) => row[0]).filter(Boolean)),
  ].sort((a, b) => new Date(b) - new Date(a));

  return jsonpResponse({ ok: true, weekPeriods }, callback);
}

// =================== Response Helpers ===================
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function jsonpResponse(data, callback) {
  if (callback) {
    const jsonpData = `${callback}(${JSON.stringify(data)})`;
    return new Response(jsonpData, {
      headers: { ...CORS_HEADERS, "Content-Type": "application/javascript" },
    });
  }
  return jsonResponse(data);
}
