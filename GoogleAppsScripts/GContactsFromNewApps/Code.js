/* ===== Carolina Lumper Service - Applicant → Google Contacts Webhook (Clean Version) ===== */

/**
 * Webhook entry point for AppSheet
 * @param {GoogleAppsScript.Events.DoPost} e
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return respond_({ ok: false, message: 'Invalid webhook: no data' });
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

    if (!email && !phone) {
      return respond_({ ok: false, message: 'Missing contact info (email or phone required)' });
    }

    // Check for duplicate contact
    const existing = findContactByEmail_(email);
    if (existing) {
      return respond_({ ok: false, message: `Contact already exists: ${email}` });
    }

    // Create new contact
    const created = addApplicantToGoogleContacts_(fullName, email, phone, workStatus, language, experience, dob);
    if (created && created.resourceName) {
      return respond_({ ok: true, message: `✅ Contact ${fullName} added.` });
    } else {
      return respond_({ ok: false, message: '❌ Failed to add contact' });
    }

  } catch (err) {
    return respond_({ ok: false, message: `💥 Error: ${err.message}` });
  }
}

/* ---------- Helpers ---------- */

function addApplicantToGoogleContacts_(fullName, email, phone, workStatus, language, experience, dob) {
  try {
    fullName = `${fullName} (CLS)`.trim(); // 👈 Add this line

    const url = 'https://people.googleapis.com/v1/people:createContact';
    const accessToken = ScriptApp.getOAuthToken();

    const payload = {
      names: [{ 
        givenName: fullName.split(' ')[0],
        familyName: fullName.split(' ').slice(1).join(' ')
      }],
      emailAddresses: email ? [{ value: email }] : [],
      phoneNumbers: phone ? [{ value: phone }] : [],
      biographies: experience ? [{ value: experience }] : [],
      birthdays: dob ? [{ date: dob }] : [],
      locales: language ? [{ value: language }] : [],
      userDefined: workStatus ? [{ key: 'Work Status', value: workStatus }] : []
    };

    const response = UrlFetchApp.fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const content = response.getContentText();
    Logger.log("🧾 People API raw response: " + content);

    return JSON.parse(content);
  } catch (err) {
    Logger.log("💥 Error in addApplicantToGoogleContacts_: " + err.message);
    return null;
  }
}



function findContactByEmail_(email) {
  try {
    const url = `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(email)}&readMask=emailAddresses`;
    const res = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
      muteHttpExceptions: true
    });
    const json = JSON.parse(res.getContentText());
    if (json.results && json.results.length > 0) return json.results[0];
    return null;
  } catch (err) {
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

function respond_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
