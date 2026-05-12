/**
 * Carolina Lumper Service (CLS)
 * Quote Request Webhook (Apps Script Web App)
 * -------------------------------------------
 * - Logs submissions to Google Sheet ("Quote Requests")
 * - Emails a summary to internal recipients
 * - JSON input (send via fetch from your quoteRequest.html)
 */

const QR_CONFIG = {
  SHEET_NAME: "Quote Requests",
  RECIPIENTS: ["info@CarolinaLumpers.com"], // add more if needed
  THROTTLE_MINUTES: 2, // anti-resubmit window
  DATE_TZ: "America/New_York",
  ALLOW_ORIGINS: ["*"], // or restrict to your domain(s)
};

/**
 * Ensure target sheet exists and has headers.
 */
function getQuoteSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(QR_CONFIG.SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(QR_CONFIG.SHEET_NAME);
  }

  const headers = [
    "Timestamp",
    "Company",
    "Contact",
    "Phone",
    "Email",
    "Preferred Contact",
    "Referral",
    // Service details
    "Services",
    "Frequency",
    "Start Date",
    "Shift Window",
    "Duration",
    "Ongoing/Trial",
    // Location
    "Facility",
    "Address",
    "Dock/Bay",
    "Entry/Safety",
    "On-site Contact",
    // Volume & Workforce
    "Avg Loads",
    "Freight",
    "Workers Needed",
    "Equipment",
    "Avg Weight/Size",
    // Billing
    "Billing Contact",
    "Billing Method",
    "Payment Terms",
    "AP Address",
    "Tax Exempt",
    "Require W9/Insurance",
    // Notes
    "Send Rate Sheet",
    "Request Site Visit",
    "Notes",
  ];

  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sh;
}

/**
 * CORS helper
 */
function withCors_(output) {
  const origins = QR_CONFIG.ALLOW_ORIGINS;
  const svc = HtmlService.createHtmlOutput("");
  // ContentService doesn’t directly expose setHeader, so we wrap JSON inside text
  // and use .setHeader via the underlying response by returning TextOutput
  const out = ContentService.createTextOutput(output).setMimeType(
    ContentService.MimeType.JSON,
  );
  // Apps Script now supports setHeader on TextOutput
  try {
    out.setHeader("Access-Control-Allow-Origin", origins[0] || "*");
    out.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    out.setHeader("Access-Control-Allow-Headers", "Content-Type");
  } catch (_) {}
  return out;
}

/**
 * OPTIONS preflight (some clients will hit doGet with OPTIONS; Apps Script routes both here).
 */
function doGet() {
  return withCors_(JSON.stringify({ ok: true, method: "GET ready" }));
}

/**
 * Primary webhook
 * Accepts JSON body from your front-end fetch().
 */
function doPost(e) {
  try {
    // CORS preflight handled even if body is empty
    if (!e || !e.postData || !e.postData.contents) {
      return withCors_(JSON.stringify({ ok: false, error: "Empty body" }));
    }

    const ctype = String(e.postData.type || "").toLowerCase();
    const isJson = ctype.indexOf("application/json") >= 0;

    const payload = isJson
      ? JSON.parse(e.postData.contents)
      : parseFormUrlEncoded_(e.postData.contents);

    // Basic validation
    const phone = String(payload.phone || "").trim();
    const email = String(payload.email || "").trim();
    const facility = String(payload.facility || "").trim();
    const address = String(payload.address || "").trim();

    if (!phone || !email || !facility || !address) {
      return withCors_(
        JSON.stringify({
          ok: false,
          error: "Missing required fields (phone, email, facility, address).",
        }),
      );
    }
    if (!isValidEmail_(email)) {
      return withCors_(
        JSON.stringify({
          ok: false,
          error: "Invalid email format.",
        }),
      );
    }

    // Timing check — reject if form was filled in under 4 seconds (bot indicator)
    const elapsed = parseInt(String(payload.elapsed || "99999"), 10);
    if (!isNaN(elapsed) && elapsed < 4000) {
      return withCors_(
        JSON.stringify({ ok: false, error: "Submission rejected." }),
      );
    }

    // Honeypot check — 'website' field must be empty
    if (String(payload.website || "").trim() !== "") {
      return withCors_(
        JSON.stringify({ ok: false, error: "Submission rejected." }),
      );
    }

    // Throttle by email to reduce duplicate spam
    const cache = CacheService.getScriptCache();
    const cKey = "qr-throttle-" + email.toLowerCase();
    if (cache.get(cKey)) {
      return withCors_(
        JSON.stringify({
          ok: false,
          error:
            "Duplicate submission detected. Please wait a moment and try again.",
        }),
      );
    }
    cache.put(cKey, "1", QR_CONFIG.THROTTLE_MINUTES * 60);

    // Write to sheet
    const sh = getQuoteSheet_();
    const tz = QR_CONFIG.DATE_TZ;
    const stamp = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd HH:mm:ss");

    const row = [
      stamp,
      safe(payload.companyName),
      safe(payload.contactName),
      phone,
      email,
      safe(payload.preferredContact),
      safe(payload.referral),

      // Service
      safe(payload.services),
      safe(payload.frequency),
      safe(payload.startDate),
      safe(payload.shift),
      safe(payload.duration),
      safe(payload.ongoingOrTrial),

      // Location
      safe(facility),
      safe(address),
      safe(payload.dock),
      safe(payload.entryRequirements),
      safe(payload.onsiteContact),

      // Volume & Workforce
      safe(payload.avgLoads),
      safe(payload.freight),
      safe(payload.workersNeeded),
      safe(payload.equipment),
      safe(payload.avgWeight),

      // Billing
      safe(payload.billingContact),
      safe(payload.billingMethod),
      safe(payload.paymentTerms),
      safe(payload.apAddress),
      safe(payload.taxExempt),
      safe(payload.requireDocs),

      // Notes
      truthy(payload.sendRateSheet) ? "Yes" : "No",
      truthy(payload.siteVisit) ? "Yes" : "No",
      safe(payload.notes),
    ];

    sh.appendRow(row);

    // Keep internal ops notification active for every quote request.
    try {
      sendSummaryEmail_(payload, stamp);
    } catch (_) {}

    // Send confirmation to submitter, CC Steve
    sendConfirmationEmail_(payload);

    return withCors_(JSON.stringify({ ok: true }));
  } catch (err) {
    return withCors_(
      JSON.stringify({ ok: false, error: err.message || String(err) }),
    );
  }
}

/** Helpers **/

function isValidEmail_(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}
function safe(v) {
  if (v === null || v === undefined) return "";
  return typeof v === "string" ? v : JSON.stringify(v);
}
function truthy(v) {
  return (
    v === true ||
    v === "true" ||
    v === "on" ||
    v === "Yes" ||
    v === "yes" ||
    v === "1"
  );
}

function parseFormUrlEncoded_(body) {
  const obj = {};
  String(body || "")
    .split("&")
    .forEach((pair) => {
      const [k, v] = pair.split("=");
      if (!k) return;
      const key = decodeURIComponent(k.replace(/\+/g, " "));
      const val = decodeURIComponent((v || "").replace(/\+/g, " "));
      obj[key] = val;
    });
  return obj;
}

function sendSummaryEmail_(p, timestamp) {
  const subject = `📥 New Quote Request — ${p.companyName || p.contactName || p.email || "Unknown"} (${timestamp})`;
  const lines = (k, v) =>
    v
      ? `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee;"><strong>${k}</strong></td><td style="padding:6px 10px;border-bottom:1px solid #eee;">${v}</td></tr>`
      : "";

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:800px">
    <h2 style="margin:0 0 10px">CLS — Quote Request</h2>
    <div style="color:#666;margin-bottom:12px">${timestamp} (ET)</div>
    <table style="border-collapse:collapse;width:100%;font-size:14px">
      ${lines("Company", safe(p.companyName))}
      ${lines("Contact", safe(p.contactName))}
      ${lines("Phone", safe(p.phone))}
      ${lines("Email", safe(p.email))}
      ${lines("Preferred Contact", safe(p.preferredContact))}
      ${lines("Referral", safe(p.referral))}
      ${lines("Services", safe(p.services))}
      ${lines("Frequency", safe(p.frequency))}
      ${lines("Start Date", safe(p.startDate))}
      ${lines("Shift Window", safe(p.shift))}
      ${lines("Duration", safe(p.duration))}
      ${lines("Ongoing/Trial", safe(p.ongoingOrTrial))}
      ${lines("Facility", safe(p.facility))}
      ${lines("Address", safe(p.address))}
      ${lines("Dock/Bay", safe(p.dock))}
      ${lines("Entry/Safety", safe(p.entryRequirements))}
      ${lines("On-site Contact", safe(p.onsiteContact))}
      ${lines("Avg Loads", safe(p.avgLoads))}
      ${lines("Freight", safe(p.freight))}
      ${lines("Workers Needed", safe(p.workersNeeded))}
      ${lines("Equipment", safe(p.equipment))}
      ${lines("Avg Weight/Size", safe(p.avgWeight))}
      ${lines("Billing Contact", safe(p.billingContact))}
      ${lines("Billing Method", safe(p.billingMethod))}
      ${lines("Payment Terms", safe(p.paymentTerms))}
      ${lines("AP Address", safe(p.apAddress))}
      ${lines("Tax Exempt", safe(p.taxExempt))}
      ${lines("Require W9/Insurance", safe(p.requireDocs))}
      ${lines("Send Rate Sheet", truthy(p.sendRateSheet) ? "Yes" : "No")}
      ${lines("Request Site Visit", truthy(p.siteVisit) ? "Yes" : "No")}
      ${lines("Notes", (safe(p.notes) || "").replace(/\n/g, "<br>"))}
      ${lines("Signature", safe(p.signature))}
      ${lines("Signature Date", safe(p.signatureDate))}
    </table>
  </div>`;

  try {
    const mimeLines = [
      "From: CLS Client Services <info@carolinalumpers.com>",
      "To: info@CarolinaLumpers.com",
      "Subject: =?UTF-8?B?" +
        Utilities.base64Encode(subject, Utilities.Charset.UTF_8) +
        "?=",
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8",
      "",
      html,
    ];
    const raw = Utilities.base64EncodeWebSafe(mimeLines.join("\r\n"));
    Gmail.Users.Messages.send({ raw: raw }, "me");
  } catch (e) {
    try {
      MailApp.sendEmail({
        to: QR_CONFIG.RECIPIENTS.join(","),
        subject: subject,
        htmlBody: html,
      });
    } catch (e2) {}
  }
}

/**
 * Sends a confirmation email via Resend API so it comes from info@carolinalumpers.com.
 * API key stored in Script Properties (Project Settings → Script Properties).
 * CC: s.garay@carolinalumpers.com so Steve sees every submission and can follow up.
 */
function sendConfirmationEmail_(p) {
  const to = String(p.email || "").trim();
  if (!to) return;

  const apiKey =
    PropertiesService.getScriptProperties().getProperty("RESEND_API_KEY");
  if (!apiKey) {
    Logger.log(
      "sendConfirmationEmail_: RESEND_API_KEY not set in Script Properties — skipping.",
    );
    return;
  }

  const name = safe(p.contactName) || "there";
  const company = safe(p.companyName);
  const phone = safe(p.phone) || "—";
  const svc = safe(p.services) || "—";
  const facility = safe(p.facility) || "—";
  const address = safe(p.address) || "—";
  const preferredContact = safe(p.preferredContact);
  const notes = (safe(p.notes) || "").replace(/\n/g, "<br>");

  const row = (label, value) =>
    value
      ? `<tr>
        <td style="padding:10px 14px;color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.8px;white-space:nowrap;border-bottom:1px solid #e8e8e8;width:140px;vertical-align:top;">${label}</td>
        <td style="padding:10px 14px;font-size:14px;color:#1a1a1a;border-bottom:1px solid #e8e8e8;">${value}</td>
       </tr>`
      : "";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <style>
    :root { color-scheme: light; supported-color-schemes: light; }
    @media (prefers-color-scheme: dark) {
      .cls-force-light-text { color: #1a1a1a !important; -webkit-text-fill-color: #1a1a1a !important; }
      .cls-force-light-bg { background: #FFBF00 !important; }
    }
    [data-ogsc] .cls-force-light-text { color: #1a1a1a !important; -webkit-text-fill-color: #1a1a1a !important; }
    [data-ogsc] .cls-force-light-bg { background: #FFBF00 !important; }
  </style>
  <link href="https://fonts.googleapis.com/css2?family=Anton&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#bdbdbd;font-family:Arial,Helvetica,sans-serif;color-scheme:light;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#bdbdbd;padding:0 0 28px 0;color-scheme:light;">
  <tr><td align="center">
    <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background:#ffffff;box-shadow:0 4px 16px rgba(0,0,0,0.25),0 2px 4px rgba(255,191,0,0.1);">

      <!-- Navbar-style header (matches site navbar exactly) -->
      <tr>
        <td style="background:#000000;padding:15px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;">
                <img src="https://carolinalumpers.com/assets/CLS-icon-192.png" alt="CLS" height="46" style="height:46px;width:auto;display:block;border:0;">
              </td>
              <td style="vertical-align:middle;padding-left:14px;">
                <span style="font-family:'Anton',Impact,'Arial Black',sans-serif;font-size:17px;color:#FFBF00;text-transform:uppercase;letter-spacing:1.5px;text-shadow:2px 2px 4px rgba(0,0,0,0.4);">Carolina Lumper Service</span>
              </td>
              <td align="right" valign="middle">
                <span class="cls-force-light-bg cls-force-light-text" style="background:#FFBF00;color:#1a1a1a;-webkit-text-fill-color:#1a1a1a;font-family:'Anton',Impact,'Arial Black',sans-serif;font-size:10px;padding:5px 13px;letter-spacing:1px;white-space:nowrap;display:inline-block;">IN REVIEW</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Amber accent strip (site's section divider style) -->
      <tr><td style="background:#FFBF00;height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>

      <!-- Main content -->
      <tr>
        <td style="padding:36px 36px 28px;">

          <!-- Page-style heading: charcoal on white (amber is only used on dark backgrounds on site) -->
          <h2 style="font-family:'Anton',Impact,'Arial Black',sans-serif;font-size:26px;color:#1a1a1a;margin:0 0 16px;text-transform:uppercase;letter-spacing:1px;line-height:1.2;">Quote Request Received</h2>

          <p style="margin:0 0 28px;font-size:15px;color:#333333;line-height:1.7;">
            Hi <strong style="color:#1a1a1a;">${name}</strong> — thank you for contacting Carolina Lumper Service.
            We've received your quote request and will be in touch within <strong style="color:#1a1a1a;">1 business day</strong>.
          </p>

          <!-- Section label in Anton amber (matches site h3/section heading style) -->
          <div style="border-top:3px solid #FFBF00;margin-bottom:12px;"></div>
          <div style="font-family:'Anton',Impact,'Arial Black',sans-serif;font-size:13px;color:#1a1a1a;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:14px;">Your Submission</div>

          <!-- Summary table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e0e0e0;margin-bottom:28px;">
            ${row("Name", name)}
            ${row("Company", company)}
            ${row("Phone", phone)}
            ${row("Email", to)}
            ${row("Service(s)", svc)}
            ${row("Facility", facility)}
            ${safe(p.frequency) ? row("Frequency", safe(p.frequency)) : ""}
            ${safe(p.startDate) ? row("Start Date", safe(p.startDate)) : ""}
            ${safe(p.shift) ? row("Shift Window", safe(p.shift)) : ""}
            ${safe(p.workersNeeded) ? row("Workers Needed", safe(p.workersNeeded)) : ""}
            ${safe(p.avgLoads) ? row("Avg Loads / Day", safe(p.avgLoads)) : ""}
            ${preferredContact ? row("Preferred Contact", preferredContact) : ""}
            ${safe(p.billingContact) ? row("Billing Contact", safe(p.billingContact)) : ""}
            ${truthy(p.sendRateSheet) ? row("Rate Sheet Requested", "Yes") : ""}
            ${truthy(p.siteVisit) ? row("Site Visit Requested", "Yes") : ""}
            ${truthy(p.requireDocs) ? row("W9 / Insurance Docs Required", "Yes") : ""}
            ${notes ? row("Notes", notes) : ""}
          </table>

          <!-- Callout box (amber left-border card, matches site's service card style) -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8e1;border-left:4px solid #FFBF00;">
            <tr>
              <td style="padding:18px 22px;">
                <div style="font-family:'Anton',Impact,'Arial Black',sans-serif;font-size:13px;color:#1a1a1a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">What Happens Next?</div>
                <div style="font-size:13px;color:#555555;line-height:1.7;">
                  Our team reviews every request and will reach out to discuss details, scheduling, and pricing.
                  You can also reply to this email and attach any photos, packing lists, or other files that may help us prepare your quote.
                  Need help sooner? Reply to this email or call us at
                  <a href="tel:+18287810002" style="color:#1a1a1a;font-weight:bold;text-decoration:none;">828-781-0002</a>.
                </div>
              </td>
            </tr>
          </table>

        </td>
      </tr>

      <!-- Footer (Variant A site-footer style) -->
      <tr>
        <td style="background:linear-gradient(180deg,#272727 0%,#171717 100%);padding:24px 32px 20px;">

          <!-- Brand row: icon + name + description -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
            <tr>
              <td style="vertical-align:middle;padding-right:14px;width:52px;">
                <img src="https://carolinalumpers.com/assets/CLS-icon-192.png" alt="CLS" width="44" height="44" style="display:block;border:0;border-radius:6px;">
              </td>
              <td style="vertical-align:middle;">
                <div style="font-family:'Anton',Impact,'Arial Black',sans-serif;font-size:15px;color:#ffffff;letter-spacing:.5px;margin-bottom:3px;">Carolina Lumper Service</div>
                <div style="font-size:12px;color:#e5e5e5;line-height:1.5;">Warehouse labor support for inbound, outbound, and floor-loaded freight operations.</div>
              </td>
            </tr>
          </table>

          <!-- Link pills: two-button row (email + phone only) -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
            <tr>
              <td style="padding-right:6px;width:50%;">
                <a href="mailto:info@carolinalumpers.com" style="display:block;text-align:center;color:#ffffff;font-size:12px;font-weight:700;text-decoration:none;padding:8px 13px;border-radius:10px;border:1px solid rgba(255,255,255,0.25);background:rgba(255,255,255,0.08);">info@carolinalumpers.com</a>
              </td>
              <td style="padding-left:6px;width:50%;">
                <a href="tel:+18287810002" style="display:block;text-align:center;color:#ffffff;font-size:12px;font-weight:700;text-decoration:none;padding:8px 13px;border-radius:10px;border:1px solid rgba(255,255,255,0.25);background:rgba(255,255,255,0.08);">+1 (828) 781-0002</a>
              </td>
            </tr>
          </table>

          <!-- Social + copyright -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:11px;color:#888888;">© 2024 Carolina Lumper Service. All rights reserved.</td>
              <td align="right">
                <a href="https://www.facebook.com/profile.php?id=61569872795390" style="display:inline-block;margin-left:8px;text-decoration:none;">
                  <img src="https://storage.googleapis.com/cls-modern-variant-a-20260420-web/assets/facebook-icon.webp" alt="Facebook" width="22" height="22" style="display:block;border:0;">
                </a>
              </td>
              <td style="width:8px;"></td>
              <td align="right">
                <a href="https://www.linkedin.com/company/106776857" style="display:inline-block;margin-left:8px;text-decoration:none;">
                  <img src="https://storage.googleapis.com/cls-modern-variant-a-20260420-web/assets/linkdedin-icon.webp" alt="LinkedIn" width="22" height="22" style="display:block;border:0;">
                </a>
              </td>
            </tr>
          </table>

        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

  const payload = JSON.stringify({
    from: "CLS Client Services <info@carolinalumpers.com>",
    to: [to],
    cc: ["s.garay@carolinalumpers.com"],
    bcc: ["d.molina@carolinalumpers.com"],
    reply_to: "info@carolinalumpers.com",
    subject: "We received your quote request — Carolina Lumpers Service",
    html: html,
  });

  try {
    const resp = UrlFetchApp.fetch("https://api.resend.com/emails", {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + apiKey },
      payload: payload,
      muteHttpExceptions: true,
    });
    const code = resp.getResponseCode();
    if (code < 200 || code >= 300) {
      Logger.log("Resend error " + code + ": " + resp.getContentText());
    }
  } catch (e) {
    Logger.log("sendConfirmationEmail_ exception: " + e.message);
  }
}

/**
 * Run this manually from the Apps Script editor to verify the Resend integration.
 * Check View → Logs after running.
 */
function testResendIntegration() {
  const apiKey =
    PropertiesService.getScriptProperties().getProperty("RESEND_API_KEY");
  if (!apiKey) {
    Logger.log("❌ RESEND_API_KEY is NOT set in Script Properties.");
    return;
  }
  Logger.log("✅ RESEND_API_KEY is set (length: " + apiKey.length + ")");

  const resp = UrlFetchApp.fetch("https://api.resend.com/emails", {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + apiKey },
    payload: JSON.stringify({
      from: "CLS Client Services <info@carolinalumpers.com>",
      to: ["s.garay@carolinalumpers.com"],
      subject: "Resend integration test — Apps Script",
      html: "<p>If you receive this, the Apps Script → Resend connection is working correctly.</p>",
    }),
    muteHttpExceptions: true,
  });
  const code = resp.getResponseCode();
  Logger.log("Resend response code: " + code);
  Logger.log("Resend response body: " + resp.getContentText());
  if (code >= 200 && code < 300) {
    Logger.log("✅ Email sent successfully via Resend from Apps Script.");
  } else {
    Logger.log("❌ Resend returned an error — check the response body above.");
  }
}
