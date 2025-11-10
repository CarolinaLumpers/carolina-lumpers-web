/* ===== Carolina Lumper Service Application Receiver (Updated) ===== */

// Load credentials from Script Properties (secure storage)
const PROPS = PropertiesService.getScriptProperties();
const SHEET_ID = PROPS.getProperty('SHEET_ID');
const NOTIFY_EMAIL = PROPS.getProperty('NOTIFY_EMAIL');

const MAIN = 'Applications';
const HIST = 'Status_History';
const ACTIVITY_LOG = 'Activity_Log';
const MIN_SUBMIT_MS = 1200;

function doPost(e) {
  const startTime = Date.now();
  let data = {};
  
  try {
    data = parseBody(e);
    const contentLength = e.postData ? e.postData.contents.length : 0;
    const parametersCount = Object.keys(data).length;
    
    // Log initial receipt
    logActivity_('RECEIVED', data, {
      startTime,
      contentLength,
      parametersCount
    });

    // Anti-spam timing check
    const started = Number(data.startedAt || 0);
    const timingCheckPassed = started && (Date.now() - started >= MIN_SUBMIT_MS);
    
    if (!timingCheckPassed) {
      logActivity_('ERROR', data, {
        startTime,
        timingCheck: false,
        error: `Anti-spam check failed. Started: ${started}, Required: ${MIN_SUBMIT_MS}ms`
      });
      return json({ ok: false, message: 'Please wait a moment before submitting.' }, 429);
    }

    // Validate required fields
    const first = trim(data.first_name);
    const last = trim(data.last_name);
    const email = trim(data.email);
    const phone = trim(data.phone);
    const validationPassed = first && last && isEmail(email) && phone;
    
    if (!validationPassed) {
      logActivity_('ERROR', data, {
        startTime,
        timingCheck: true,
        validationCheck: false,
        error: `Validation failed. First: ${!!first}, Last: ${!!last}, Email: ${!!email}, Phone: ${!!phone}`
      });
      return json({ ok: false, message: 'Please check your name and email.' }, 400);
    }

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sh = ss.getSheetByName(MAIN);
    if (!sh) {
      logActivity_('ERROR', data, {
        startTime,
        error: `Sheet "${MAIN}" not found`
      });
      return json({ ok: false, message: `Sheet "${MAIN}" not found.` }, 500);
    }

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
      logActivity_('ERROR', data, {
        startTime,
        timingCheck: true,
        validationCheck: true,
        duplicateCheck: false,
        error: 'Duplicate email or phone detected'
      });
      return json({ ok: false, message: 'This email or phone number has already been used for an application.' }, 409);
    }
    // ============================
    
    // Log validation passed
    logActivity_('VALIDATED', data, {
      startTime,
      timingCheck: true,
      validationCheck: true,
      duplicateCheck: true
    });

    const now = new Date();
    const appId = Utilities.getUuid();

    // ===== Build main Applications record =====
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
      trim(data.dob),
      trim(data.start_date),
      trim(data.transportation),
      trim(data.driver_license),
      trim(data.overtime_ok),
      trim(data.travel_ok),
      trim(data.equipment_experience),
      trim(data.emergency_contact_name),
      trim(data.emergency_contact_relation),
      trim(data.emergency_contact_phone),
      trim(data.referral_source)
    ];
    sh.appendRow(row);

    // ===== Add Status History record =====
    let historyLogged = false;
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
      historyLogged = true;
    }

    // ===== HTML Email Notification =====
    let emailSent = false;
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
          <tr><td style="padding:8px 10px;font-weight:bold;">Phone:</td><td><a href="tel:${phone}" style="color:#0645AD;text-decoration:underline;">${phone}</a></td></tr>
          <tr><td style="padding:8px 10px;font-weight:bold;">City:</td><td>${trim(data.city)}</td></tr>
          <tr><td style="padding:8px 10px;font-weight:bold;">State:</td><td>${trim(data.state)}</td></tr>
          <tr><td style="padding:8px 10px;font-weight:bold;">Preferred Site:</td><td>${trim(data.site)}</td></tr>
          <tr><td style="padding:8px 10px;font-weight:bold;">Experience Level:</td><td>${trim(data.experience_level)}</td></tr>
          <tr><td style="padding:8px 10px;font-weight:bold;">Preferred Shift:</td><td>${trim(data.shift_preference)}</td></tr>
          <tr><td style="padding:8px 10px;font-weight:bold;">Work Authorization:</td><td>${trim(data.work_authorization)}</td></tr>
          <tr><td style="padding:8px 10px;font-weight:bold;">Language Preference:</td><td>${trim(data.language_preference)}</td></tr>
          <tr><td style="padding:8px 10px;font-weight:bold;">English Proficiency:</td><td>${trim(data.english_proficiency)}</td></tr>
          <tr><td style="padding:8px 10px;font-weight:bold;">Date of Birth:</td><td>${trim(data.dob)}</td></tr>
          <tr><td style="padding:8px 10px;font-weight:bold;">Available Start Date:</td><td>${trim(data.start_date)}</td></tr>
          <tr><td style="padding:8px 10px;font-weight:bold;">Transportation:</td><td>${trim(data.transportation)}</td></tr>
          <tr><td style="padding:8px 10px;font-weight:bold;">Driver’s License:</td><td>${trim(data.driver_license)}</td></tr>
          <tr><td style="padding:8px 10px;font-weight:bold;">Overtime OK:</td><td>${trim(data.overtime_ok)}</td></tr>
          <tr><td style="padding:8px 10px;font-weight:bold;">Travel OK:</td><td>${trim(data.travel_ok)}</td></tr>
          <tr><td style="padding:8px 10px;font-weight:bold;">Equipment Experience:</td><td>${trim(data.equipment_experience)}</td></tr>
          <tr><td style="padding:8px 10px;font-weight:bold;">Emergency Contact:</td>
              <td>${trim(data.emergency_contact_name)} (${trim(data.emergency_contact_relation)}) – ${trim(data.emergency_contact_phone)}</td></tr>
          <tr><td style="padding:8px 10px;font-weight:bold;">Referral Source:</td><td>${trim(data.referral_source)}</td></tr>
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

    try {
      GmailApp.sendEmail(NOTIFY_EMAIL, subject, '', {
        name: 'CLS Applications',
        from: 'jobs@carolinalumpers.com',
        cc: 's.garay@carolinalumpers.com',
        replyTo: email,
        htmlBody
      });
      emailSent = true;
    } catch (emailErr) {
      // Email failed but application was saved - log but don't fail
      logActivity_('ERROR', data, {
        startTime,
        error: `Email send failed: ${emailErr.message}`,
        extra: { applicationSaved: true }
      });
    }

    // Store appId in data for final logging
    data.application_id = appId;

    // Log successful processing
    logActivity_('PROCESSED', data, {
      startTime,
      timingCheck: true,
      validationCheck: true,
      duplicateCheck: true,
      emailSent,
      historyLogged
    });

    // ===== Multilingual success response =====
    const lang = (trim(data.ui_lang) || 'en').toLowerCase();
    let message = 'Thanks. We received your application.';
    if (lang === 'es') message = 'Gracias. Recibimos su solicitud.';
    else if (lang === 'pt') message = 'Obrigado. Recebemos sua candidatura.';

    return json({ success: true, ok: true, message, id: appId }, 200);

  } catch (err) {
    // Log catastrophic error
    logActivity_('ERROR', data, {
      startTime,
      error: `Unhandled error: ${err.message}`,
      extra: { stack: err.stack }
    });
    
    return json({ success: false, ok: false, message: 'Server error' }, 500);
  }
}

/* ---------- Helpers ---------- */

function parseBody(e) {
  if (!e) return {};
  const ct = (e.postData && e.postData.type) ? e.postData.type : '';
  if (ct.indexOf('application/json') > -1 && e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents) || {}; } catch (_) {}
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

/* ---------- Activity Logging ---------- */

/**
 * Logs activity to Activity_Log sheet for debugging submission issues
 * @param {string} stage - Stage of processing (RECEIVED, VALIDATED, PROCESSED, ERROR)
 * @param {object} data - Form data object
 * @param {object} details - Additional details to log
 */
function logActivity_(stage, data, details) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(ACTIVITY_LOG);
    
    // Create Activity_Log sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(ACTIVITY_LOG);
      sheet.getRange('A1:J1').setValues([[
        'Timestamp',
        'Stage',
        'Application ID',
        'Email',
        'Name',
        'Client Time',
        'Device',
        'Processing Time (ms)',
        'Details',
        'Error'
      ]]);
      sheet.setFrozenRows(1);
      sheet.getRange('A1:J1').setFontWeight('bold');
    }
    
    const timestamp = new Date();
    const appId = data.application_id || 'N/A';
    const email = trim(data.email) || 'N/A';
    const name = `${trim(data.first_name)} ${trim(data.last_name)}`.trim() || 'N/A';
    
    // Parse metadata if available
    let clientTime = '', device = '', processingTime = '';
    try {
      const meta = JSON.parse(data.submissionMeta || '{}');
      clientTime = meta.clientTime || '';
      device = meta.device || '';
    } catch (e) {
      // Metadata parsing failed, continue with empty values
    }
    
    // Calculate processing time if available
    if (details.startTime) {
      processingTime = Date.now() - details.startTime;
    }
    
    // Build details string
    const detailsStr = JSON.stringify({
      contentLength: details.contentLength || 0,
      parametersCount: details.parametersCount || 0,
      duplicateCheck: details.duplicateCheck,
      timingCheck: details.timingCheck,
      validationCheck: details.validationCheck,
      emailSent: details.emailSent,
      historyLogged: details.historyLogged,
      ...details.extra
    });
    
    const errorStr = details.error || '';
    
    sheet.appendRow([
      timestamp,
      stage,
      appId,
      email,
      name,
      clientTime,
      device,
      processingTime,
      detailsStr,
      errorStr
    ]);
    
  } catch (logErr) {
    // If logging fails, don't block the main process
    // Could optionally log to a fallback location
    console.error('Logging failed:', logErr.message);
  }
}
