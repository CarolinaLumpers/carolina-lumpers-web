// ======================================================
// Project: CLS Employee Login System
// File: CLS_EmployeeLogin_Workers.js
// Description: Worker authentication, lookup functions,
// and user management utilities.
// ======================================================

// ======================================================
//  AUTHENTICATION FUNCTIONS
// ======================================================
function loginUser(e) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Workers');
  const email = (e.parameter.email || '').toLowerCase();
  const password = e.parameter.password || '';
  const device = e.parameter.device || 'Unknown';
  const userAgent = e.parameter.userAgent || '';
  const timestamp = new Date();

  // Log login attempt start
  Logger.log(`🔐 Login attempt for: ${email} from device: ${device}`);

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const emailIdx = headers.indexOf('Email');
  const passIdx = headers.indexOf('PasswordHash');
  const idIdx = headers.indexOf('WorkerID');

  // Be tolerant to header naming for display name
  const nameIdxCandidates = ['Display Name', 'Name', 'Full Name'];
  let nameIdx = -1;
  for (let i = 0; i < nameIdxCandidates.length && nameIdx < 0; i++) {
    nameIdx = headers.indexOf(nameIdxCandidates[i]);
  }
  
  // W-9 related columns
  const w9StatusIdx = headers.indexOf('W9Status');
  const w9SubmittedDateIdx = headers.indexOf('W9SubmittedDate');
  const w9ApprovedDateIdx = headers.indexOf('W9ApprovedDate');
  const w9SsnLast4Idx = headers.indexOf('W9SSN_Last4');
  const w9PdfUrlIdx = headers.indexOf('W9_PDF_URL');

  if (emailIdx < 0 || passIdx < 0 || idIdx < 0) {
    const errorMsg = '❌ Workers sheet is missing required columns.';
    Logger.log(`❌ Login failed - Configuration error: ${errorMsg}`);
    
    // Log failed login attempt - configuration error
    TT_LOGGER.logLoginAttempt(email, false, device, {
      reason: 'Configuration error - missing columns',
      details: { userAgent: userAgent }
    });
    
    return { success: false, message: errorMsg };
  }

  const hash = hashPassword(password);
  
  // Search for user
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[emailIdx]).toLowerCase() === email) {
      const workerId = row[idIdx];
      const displayName = nameIdx >= 0 ? row[nameIdx] : '';
      
      if (row[passIdx] === hash) {
        // Successful login
        Logger.log(`✅ Login successful for ${email} (${workerId}) - ${displayName}`);
        
        // Get W-9 status information
        const w9Status = w9StatusIdx >= 0 ? (row[w9StatusIdx] || 'none') : 'none';
        const w9SubmittedDate = w9SubmittedDateIdx >= 0 ? row[w9SubmittedDateIdx] : '';
        const w9ApprovedDate = w9ApprovedDateIdx >= 0 ? row[w9ApprovedDateIdx] : '';
        const w9SsnLast4 = w9SsnLast4Idx >= 0 ? row[w9SsnLast4Idx] : '';
        const w9PdfUrl = w9PdfUrlIdx >= 0 ? row[w9PdfUrlIdx] : '';
        
        // Log successful login
        TT_LOGGER.logLogin({
          workerId: workerId,
          displayName: displayName,
          email: email,
          device: device,
          role: 'Worker',
          biometric: false
        });
        
        return {
          success: true,
          workerId: workerId,
          displayName: displayName,
          email: email,
          w9Status: w9Status,
          w9SubmittedDate: w9SubmittedDate,
          w9ApprovedDate: w9ApprovedDate,
          w9SsnLast4: w9SsnLast4,
          w9PdfUrl: w9Status === 'approved' ? w9PdfUrl : '' // Only return PDF if approved
        };
      } else {
        // Password mismatch
        Logger.log(`❌ Login failed for ${email} - Incorrect password`);
        
        // Log failed login attempt - wrong password
        TT_LOGGER.logLoginAttempt(email, false, device, {
          reason: 'Incorrect password',
          details: { userAgent: userAgent }
        });
        
        return { success: false, message: '❌ Incorrect password.' };
      }
    }
  }
  
  // User not found
  Logger.log(`❌ Login failed for ${email} - Worker not found`);
  
  // Log failed login attempt - user not found
  TT_LOGGER.logLoginAttempt(email, false, device, {
    reason: 'Worker not found',
    details: { userAgent: userAgent }
  });
  
  return { success: false, message: '❌ Worker not found.' };
}

function signUpUser(e) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Workers');
  const email = (e.parameter.email || '').toLowerCase();
  const password = e.parameter.password || '';
  const device = e.parameter.device || 'Unknown';
  const timestamp = new Date();

  Logger.log(`📝 Password setup attempt for: ${email} from device: ${device}`);

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const emailIdx = headers.indexOf('Email');
  const passIdx = headers.indexOf('PasswordHash');
  const workerIdIdx = headers.indexOf('WorkerID');
  const displayNameIdx = headers.indexOf('Display Name');

  if (emailIdx < 0 || passIdx < 0) {
    const errorMsg = '❌ Workers sheet is missing Email/PasswordHash columns.';
    Logger.log(`❌ Password setup failed - Configuration error: ${errorMsg}`);
    
    // Log failed signup attempt - configuration error
    TT_LOGGER.logSystem(`Signup failed: Configuration error - ${email}`, {
      status: 'ERROR',
      details: { email: email, device: device, reason: 'Missing columns' }
    });
    
    return errorMsg;
  }

  const hash = hashPassword(password);
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[emailIdx]).toLowerCase() === email) {
      // Found user, set password
      sheet.getRange(i + 1, passIdx + 1).setValue(hash);
      
      // Get worker details for logging
      const workerId = workerIdIdx >= 0 ? String(row[workerIdIdx] || '').trim() : 'PENDING';
      const displayName = displayNameIdx >= 0 ? String(row[displayNameIdx] || '').trim() : email.split('@')[0];
      
      Logger.log(`✅ Password set successfully for: ${email} (${displayName})`);
      
      // Log successful password setup with actual worker name
      TT_LOGGER.logSignup({
        workerId: workerId,
        email: email,
        displayName: displayName,
        device: device
      });
      
      return '✅ Password set successfully.';
    }
  }
  
  // Email not found
  Logger.log(`❌ Password setup failed for ${email} - Email not found in Workers sheet`);
  
  // Log failed signup attempt - user not found
  TT_LOGGER.logSystem(`Signup failed: Email not found - ${email}`, {
    status: 'WARNING',
    details: { email: email, device: device, reason: 'Email not in Workers sheet' }
  });
  
  return '❌ Email not found in Workers sheet.';
}

// ======================================================
//  WORKER LOOKUP FUNCTIONS
// ======================================================
function getWorkerIdByEmail(email) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName('Workers');
  const data = sh.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());

  const iEmail = headers.indexOf('Email');
  const iWorker = headers.indexOf('WorkerID');
  const nameCols = ['Display Name', 'Name', 'Full Name'];
  const iName = headers.findIndex(h => nameCols.includes(h));

  if (iEmail < 0 || iWorker < 0) {
    return { success: false, message: 'Workers sheet missing Email/WorkerID columns.' };
  }

  const search = String(email || '').trim().toLowerCase();
  for (let r = 1; r < data.length; r++) {
    const rowEmail = String(data[r][iEmail] || '').trim().toLowerCase();
    if (rowEmail === search) {
      const workerId = String(data[r][iWorker] || '').trim();
      const displayName =
        iName >= 0 && data[r][iName]
          ? String(data[r][iName]).trim()
          : workerId;
      return {
        success: true,
        workerId,
        displayName,
        email: rowEmail,
      };
    }
  }

  return { success: false, message: 'Worker not found.' };
}

function lookupWorkerMeta_(workerId) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName('Workers');
  if (!sh) return { ok: false, message: 'Workers sheet missing' };

  const data = sh.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());

  const iWorker = headers.indexOf('WorkerID');
  const iDisplay = headers.indexOf('Display Name');
  const iEmail = headers.indexOf('Email');
  const iLang = headers.indexOf('Primary Language');

  for (let r = 1; r < data.length; r++) {
    if (String(data[r][iWorker]) === String(workerId)) {
      return {
        ok: true,
        workerId,
        displayName: iDisplay >= 0 ? String(data[r][iDisplay] || '').trim() : workerId,
        email: iEmail >= 0 ? String(data[r][iEmail] || '').trim() : '',
        primaryLang: iLang >= 0 ? String(data[r][iLang] || '').trim().toLowerCase() : ''
      };
    }
  }
  return { ok: false, message: 'Worker not found' };
}

function getWorkerNames_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName('Workers');
  const data = sh.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());

  const iWorker = headers.indexOf('WorkerID');
  const iDisplay = headers.indexOf('Display Name');
  const iFirst = headers.indexOf('First Name');
  const iLast = headers.indexOf('Last Name');
  const iAvailability = headers.indexOf('Availability');
  const map = {};

  if (iWorker < 0) return map;

  for (let r = 1; r < data.length; r++) {
    const id = String(data[r][iWorker] || '').trim();
    if (!id) continue;

    // ✅ Only include Active workers (skip if Availability column exists and is not "Active")
    if (iAvailability >= 0) {
      const availability = String(data[r][iAvailability] || '').trim().toLowerCase();
      if (availability && availability !== 'active') {
        continue; // Skip inactive workers
      }
    }

    // Prefer Display Name; fallback to First + Last if missing
    const display = iDisplay >= 0 ? String(data[r][iDisplay]).trim() : '';
    const first = iFirst >= 0 ? String(data[r][iFirst]).trim() : '';
    const last = iLast >= 0 ? String(data[r][iLast]).trim() : '';

    const name = display || [first, last].filter(Boolean).join(' ').trim() || id;
    map[id] = name;
  }

  return map;
}

// ======================================================
//  ROLE & PERMISSION FUNCTIONS
// ======================================================
function getRole_(workerId) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName('Workers');
  const data = sh.getDataRange().getValues();
  const headers = data[0].map(String);
  const iWorker = headers.indexOf('WorkerID');
  const iRole = headers.indexOf('App Access');
  if (iWorker < 0 || iRole < 0) return 'User';
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][iWorker]) === String(workerId)) {
      return String(data[r][iRole] || 'User');
    }
  }
  return 'User';
}

function isAdmin_(workerId) {
  const role = getRole_(workerId);
  return role === 'Admin';
}