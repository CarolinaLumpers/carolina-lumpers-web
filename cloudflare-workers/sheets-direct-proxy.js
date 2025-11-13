/**
 * Cloudflare Worker: Generic Google Sheets API Proxy
 * 
 * Simple pass-through proxy for Google Sheets API with service account authentication.
 * Follows React Portal pattern - frontend does filtering/formatting.
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
    const pathname = url.pathname;

    try {
      // Get OAuth token from service account
      const token = await getServiceAccountToken(env);

      // Generic Sheets API proxy (like React Portal pattern)
      // Route: /api/sheets/{spreadsheetId}/values/{range}
      const sheetsMatch = pathname.match(/^\/api\/sheets\/([^\/]+)\/values\/(.+)$/);
      if (sheetsMatch) {
        const spreadsheetId = sheetsMatch[1];
        const range = decodeURIComponent(sheetsMatch[2]);
        const data = await getSheetValues(range, token, spreadsheetId);
        return jsonResponse({ ok: true, data });
      }

      // Health check
      if (pathname === "/health" || pathname === "/") {
        return jsonResponse({ status: "ok", message: "Generic Sheets proxy running" });
      }

      return jsonResponse({ ok: false, error: "Not found. Use /api/sheets/{spreadsheetId}/values/{range}" }, 404);
    } catch (error) {
      console.error("Error:", error);
      return jsonResponse({ ok: false, error: error.message }, 500);
    }
  },
};// =================== Google OAuth Token Generation ===================
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
async function getSheetValues(range, token, spreadsheetId = SPREADSHEET_ID) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
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

// =================== Response Helpers ===================
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

/*
 * OLD ACTION HANDLERS REMOVED
 * 
 * This worker now follows the React Portal pattern - it's a simple generic proxy.
 * Frontend does all filtering/formatting of data.
 * 
 * Example usage from frontend:
 * const response = await fetch(`${SHEETS_API_URL}/api/sheets/${SPREADSHEET_ID}/values/ClockIn!A2:L100`);
 * const { data } = await response.json();
 * // data.values = [[col1, col2, ...], ...]
 * // Frontend filters/formats as needed
 */
