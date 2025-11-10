/* ===== Carolina Lumper Service Application Receiver ===== */

const SHEET_ID = '14dO3qB3Oa-N7eX9EcBTStydvyJaHprgi3_dQJsTvRx4';
const MAIN = 'Applications';
const HIST = 'Status_History';
const MIN_SUBMIT_MS = 1200;
const NOTIFY_EMAIL = 'jobs@carolinalumpers.com'; // recipient for notifications

function doPost(e) {
  try {
    const data = parseBody(e);

    // Anti-spam timing check
    const started = Number(data.startedAt || 0);
    if (!started || Date.now() - started < MIN_SUBMIT_MS) {
      return json({ ok: false, message: 'Please wait a moment before submitting.' }, 429);
    }

    // Validate required fields
    const first = trim(data.first_name);
    const last = trim(data.last_name);
    const email = trim(data.email);
    const phone = trim(data.phone);
    if (!first || !last || !isEmail(email)) {
      return json({ ok: false, message: 'Please check your name and email.' }, 400);
    }

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sh = ss.getSheetByName(MAIN);
    if (!sh) return json({ ok: false, message: `Sheet "${MAIN}" not found.` }, 500);

    // ===== Duplicate Check =====
    const dataRange = sh.getDataRange().getValues();
    const headers = dataRange[0];
    const emailIndex = headers.indexOf('email');
    const phoneIndex = headers.indexOf('phone');

    const normalizedEmail = email.toLowerCase();
    const normalizedPhone = phone.replace(/\D/g, '');

    const duplicate = dataRange.slice(1).some(r => {
      const existingEmail = (r[emailIndex] || '').toString().trim().toLowerCase();
      const existingPhone = (r[phoneIndex] || '').toString().replace(/\D/g, '');
      return existingEmail === normalizedEmail || (normalizedPhone && existingPhone === normalizedPhone);
    });

    if (duplicate) {
      return json({ ok: false, message: 'This email or phone number has already been used for an application.' }, 409);
    }
    // ============================

    const now = new Date();
    const appId = Utilities.getUuid();

    // Build main Applications record
    const row = [
      appId, now, first, last, email, phone,
      trim(data.city),
      trim(data.state),
      trim(data.role_applied),
      trim(data.experience_level),
      trim(data.shift_preference),
      trim(data.work_authorization),
      trim(data.site),
      trim(data.notes),
      trim(data.ui_lang) || 'en',
      'Submitted',
      trim(data.language_preference),
      trim(data.english_proficiency),
      trim(data.dob)
    ];
    sh.appendRow(row);

    // Add Status History record
    const hs = ss.getSheetByName(HIST);
    if (hs) {
      hs.appendRow([
        Utilities.getUuid(),
        appId,
        now,
        '',
        'Submitted',
        '',
        'via web form'
      ]);
    }

    // ===== Professional HTML Email Notification (Neutral Theme) =====
    const subject = `New CLS Application - ${first} ${last}`;
    const htmlBody = `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#1c1c1c;max-width:650px;margin:auto;padding:20px;
              border:1px solid #ddd;border-radius:8px;background-color:#ffffff;">
    <div style="text-align:center;margin-bottom:20px;">
      <img src="https://raw.githubusercontent.com/CarolinaLumpers/carolina-lumpers-web/refs/heads/main/assets/CLS_Logo_trans.png"
           alt="Carolina Lumper Service Logo"
           style="max-width:180px;height:auto;">
    </div>

    <h2 style="color:#1c1c1c;text-align:center;margin-bottom:10px;">New Application Received</h2>
    <p style="text-align:center;">A new candidate has submitted an application via the CLS website.</p>

    <table style="border-collapse:collapse;width:100%;margin-top:15px;">
      <tr><td style="padding:8px 10px;font-weight:bold;width:40%;">Name:</td><td>${first} ${last}</td></tr>
      <tr><td style="padding:8px 10px;font-weight:bold;">Email:</td><td><a href="mailto:${email}" style="color:#0645AD;text-decoration:none;">${email}</a></td></tr>
      <tr><td style="padding:8px 10px;font-weight:bold;">Phone:</td>
      <td><a href="tel:${phone}" style="color:#0645AD;text-decoration:underline;">${phone}</a></td></tr>
      <tr><td style="padding:8px 10px;font-weight:bold;">City:</td><td>${trim(data.city)}</td></tr>
      <tr><td style="padding:8px 10px;font-weight:bold;">State:</td><td>${trim(data.state)}</td></tr>
      <tr><td style="padding:8px 10px;font-weight:bold;">Preferred Site:</td><td>${trim(data.site)}</td></tr>
      <tr><td style="padding:8px 10px;font-weight:bold;">Experience Level:</td><td>${trim(data.experience_level)}</td></tr>
      <tr><td style="padding:8px 10px;font-weight:bold;">Preferred Shift:</td><td>${trim(data.shift_preference)}</td></tr>
      <tr><td style="padding:8px 10px;font-weight:bold;">Work Authorization:</td><td>${trim(data.work_authorization)}</td></tr>
      <tr><td style="padding:8px 10px;font-weight:bold;">Language Preference:</td><td>${trim(data.language_preference)}</td></tr>
      <tr><td style="padding:8px 10px;font-weight:bold;">English Proficiency:</td><td>${trim(data.english_proficiency)}</td></tr>
      <tr><td style="padding:8px 10px;font-weight:bold;">Date of Birth:</td><td>${trim(data.dob)}</td></tr>
      <tr><td style="padding:8px 10px;font-weight:bold;">Notes:</td><td>${trim(data.notes)}</td></tr>
    </table>

    <p style="margin-top:20px;font-size:13px;color:#555;">
      Submitted on: ${now.toLocaleString()}<br>
      Application ID: ${appId}
    </p>

    <hr style="margin:25px 0;border:none;border-top:1px solid #ddd;">
    <p style="text-align:center;font-size:13px;color:#888;">
      <strong>Carolina Lumper Service</strong><br>
      HR Notification • <a href="https://carolinalumpers.com" style="color:#0645AD;text-decoration:none;">www.carolinalumpers.com</a>
    </p>
  </div>
`;

    GmailApp.sendEmail(NOTIFY_EMAIL, subject, '', {
      name: 'CLS Applications',
      from: 'jobs@carolinalumpers.com',
      cc: 's.garay@carolinalumpers.com',
      replyTo: email,
      htmlBody
    });


    // ==============================

    // Language-aware success message
    const lang = (trim(data.ui_lang) || 'en').toLowerCase();
    let message = 'Thanks. We received your application.';
    if (lang === 'es') message = 'Gracias. Recibimos su solicitud.';
    else if (lang === 'pt') message = 'Obrigado. Recebemos sua candidatura.';

    return json({ ok: true, message, id: appId }, 200);

  } catch (err) {
    return json({ ok: false, message: 'Server error' }, 500);
  }
}

/* ---------- Helpers ---------- */

function parseBody(e) {
  if (!e) return {};
  const ct = (e.postData && e.postData.type) ? e.postData.type : '';
  if (ct.indexOf('application/json') > -1 && e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents) || {}; } catch (_) { }
  }
  return e.parameter || {};
}

function json(obj, status) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function trim(v) { return (v == null ? '' : v).toString().trim(); }
function isEmail(v) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v || '')); }
