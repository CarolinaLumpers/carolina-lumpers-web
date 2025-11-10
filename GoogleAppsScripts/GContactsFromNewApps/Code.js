/* ===== Carolina Lumper Service - Applicant → Google Contacts Webhook ===== */

const LOG_SHEET = 'Log';

/**
 * Webhook endpoint for AppSheet action
 * @param {GoogleAppsScript.Events.DoPost} e
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return respond_({ ok: false, message: 'Invalid request: no data' });
    }

    const data = JSON.parse(e.postData.contents);
    const first = (data.firstName || data.FirstName || '').trim();
    const last = (data.lastName || data.LastName || '').trim();
    const fullName = `${first} ${last}`.trim();
    const email = (data.email || data.Email || '').trim();
    const phone = (data.phone || data.Phone || '').trim();
    const workStatus = (data.workStatus || data.WorkStatus || '').trim();
    const language = (data.language || data.Language || '').trim();
    const experience = (data.experience || data.Experience || '').trim();
    const dobRaw = (data.dob || data.DOB || '').trim();
    const dob = dobRaw ? formatDateForGoogleContacts_(dobRaw) : null;

    log_(`Received webhook for ${fullName} (${email})`);

    if (!email && !phone) {
      return respond_({ ok: false, message: 'Missing contact info' }, 400);
    }

    // Prevent duplicates
    const existing = findContactByEmail_(email);
    if (existing) {
      log_(`⚠️ Contact already exists: ${email}`);
      return respond_({ ok: false, message: 'Contact already exists' }, 200);
    }

    // Create new contact
    const created = addApplicantToGoogleContacts_(fullName, email, phone, workStatus, language, experience, dob);
    if (created && created.resourceName) {
      log_(`✅ Contact created: ${created.resourceName}`);
      return respond_({ ok: true, message: `Contact ${fullName} added.` });
    } else {
      log_(`❌ Failed to create contact: ${fullName}`);
      return respond_({ ok: false, message: 'Failed to add contact' }, 500);
    }

  } catch (err) {
    log_(`💥 Error: ${err.message}`);
    return respond_({ ok: false, message: err.message }, 500);
  }
}

/* ---------- Helpers ---------- */

function addApplicantToGoogleContacts_(fullName, email, phone, workStatus, language, experience, dob) {
  try {
    const url = 'https://people.googleapis.com/v1/people:createContact';
    const accessToken = ScriptApp.getOAuthToken();

    const payload = {
      names: [{ givenName: fullName.split(' ')[0], familyName: fullName.split(' ').slice(1).join(' ') }],
      emailAddresses: email ? [{ value: email }] : [],
      phoneNumbers: phone ? [{ value: phone }] : [],
      biographies: experience ? [{ value: experience }] : [],
      birthdays: dob ? [{ date: dob }] : [],
      locales: language ? [{ value: language }] : [],
      userDefined: workStatus ? [{ key: 'Work Status', value: workStatus }] : []
    };

    const options = {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());
    return json;
  } catch (err) {
    log_(`Error creating contact: ${err.message}`);
    return null;
  }
}

function findContactByEmail_(email) {
  try {
    const url = `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(email)}&readMask=emailAddresses`;
    const options = {
      method: 'GET',
      headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
      muteHttpExceptions: true
    };
    const res = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(res.getContentText());
    if (json.results && json.results.length > 0) return json.results[0];
    return null;
  } catch (err) {
    log_(`Search error: ${err.message}`);
    return null;
  }
}

function formatDateForGoogleContacts_(dateString) {
  const parts = dateString.split('/');
  if (parts.length === 3) {
    return {
      year: parseInt(parts[2], 10),
      month: parseInt(parts[0], 10),
      day: parseInt(parts[1], 10)
    };
  }
  return null;
}

function respond_(obj, code) {
  const output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function log_(msg) {
  const ss = SpreadsheetApp.openById('14dO3qB3Oa-N7eX9EcBTStydvyJaHprgi3_dQJsTvRx4');
  const sheet = ss.getSheetByName(LOG_SHEET);
  if (!sheet) return;
  sheet.appendRow([new Date(), msg]);
}
