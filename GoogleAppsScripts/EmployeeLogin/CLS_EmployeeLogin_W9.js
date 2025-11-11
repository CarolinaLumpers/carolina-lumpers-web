// ======================================================
// Project: CLS Employee Login System
// File: CLS_EmployeeLogin_W9.js
// Description: W-9 form management for 1099 contractor compliance.
// Handles submission, approval, rejection, and PDF generation.
// ======================================================

// ======================================================
//  WORKER W-9 FUNCTIONS
// ======================================================

/**
 * Submit W-9 form for a worker
 * @param {string} workerId - Worker ID (e.g., "CLS001")
 * @param {Object} w9Data - W-9 form data
 * @param {string} device - Device info for logging
 * @returns {Object} - { ok: boolean, w9RecordId: string, message: string }
 */
function submitW9Form(workerId, w9Data, device) {
  try {
    Logger.log(`📝 W-9 submission started for ${workerId}`);
    
    // Validate required fields
    const validation = validateW9Data(w9Data);
    if (!validation.valid) {
      return { ok: false, message: validation.message };
    }
    
    // Check if worker exists
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const workersSheet = ss.getSheetByName('Workers');
    const workerData = getWorkerByIdFromSheet_(workersSheet, workerId);
    
    if (!workerData) {
      return { ok: false, message: 'Worker not found.' };
    }
    
    // Check if worker already has pending/approved W-9
    if (workerData.w9Status === 'pending_admin_review') {
      return { ok: false, message: 'You already have a W-9 pending review.' };
    }
    if (workerData.w9Status === 'approved') {
      return { ok: false, message: 'You already have an approved W-9 on file.' };
    }
    
    // Generate new W9RecordID
    const w9RecordId = getNextW9RecordId_();
    
    // Encrypt SSN
    const ssnEncrypted = encryptSSN_(w9Data.ssn);
    const ssnLast4 = obfuscateSSN(w9Data.ssn);
    
    // Generate W-9 PDF
    Logger.log(`📄 Generating PDF for ${workerId}...`);
    const pdfResult = generateW9PDF(workerId, w9Data);
    
    if (!pdfResult.ok) {
      Logger.log(`❌ PDF generation failed: ${pdfResult.message}`);
      return { ok: false, message: 'Failed to generate W-9 PDF. Please try again.' };
    }
    
    // Create W9_Records entry
    const w9RecordsSheet = getOrCreateW9RecordsSheet_(ss);
    const timestamp = new Date();
    
    w9RecordsSheet.appendRow([
      w9RecordId,                           // A: W9RecordID
      workerId,                             // B: WorkerID
      timestamp,                            // C: SubmissionDate
      w9Data.legalName,                     // D: LegalName
      w9Data.businessName || '',            // E: BusinessName
      w9Data.taxClassification,             // F: TaxClassification
      w9Data.address,                       // G: Address
      w9Data.city,                          // H: City
      w9Data.state,                         // I: State
      w9Data.zip,                           // J: ZIP
      ssnEncrypted,                         // K: SSN_Encrypted
      ssnLast4,                             // L: SSN_Last4
      w9Data.backupWithholding || false,   // M: BackupWithholding
      'pending_admin_review',               // N: Status
      '',                                   // O: ApprovedBy
      '',                                   // P: ApprovedDate
      '',                                   // Q: RejectionReason
      pdfResult.pdfUrl,                     // R: W9_PDF_URL
      ''                                    // S: AdminNotes
    ]);
    
    // Update Workers sheet
    updateWorkerW9Status_(workersSheet, workerId, {
      w9Status: 'pending_admin_review',
      w9SubmittedDate: timestamp,
      w9SsnLast4: ssnLast4,
      w9PdfUrl: pdfResult.pdfUrl
    });
    
    // Log submission
    TT_LOGGER.logW9Submission({
      workerId: workerId,
      displayName: workerData.displayName,
      device: device || 'Unknown',
      email: workerData.email
    }, w9RecordId);
    
    // Send notification email to admins
    sendW9SubmissionNotification_(workerId, workerData.displayName, w9RecordId, pdfResult.pdfUrl);
    
    Logger.log(`✅ W-9 submission complete for ${workerId} (${w9RecordId})`);
    
    return {
      ok: true,
      w9RecordId: w9RecordId,
      message: 'W-9 submitted successfully! It will be reviewed by an admin.'
    };
    
  } catch (error) {
    Logger.log(`❌ Error in submitW9Form: ${error.message}`);
    Logger.log(error.stack);
    return { ok: false, message: 'An error occurred while submitting your W-9. Please try again.' };
  }
}

/**
 * Get W-9 status for a worker
 * @param {string} workerId - Worker ID
 * @returns {Object} - { ok: boolean, status: string, submittedDate, approvedDate, last4, pdfUrl }
 */
function getW9Status(workerId) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const workersSheet = ss.getSheetByName('Workers');
    const workerData = getWorkerByIdFromSheet_(workersSheet, workerId);
    
    if (!workerData) {
      return { ok: false, message: 'Worker not found.' };
    }
    
    return {
      ok: true,
      status: workerData.w9Status || 'none',
      submittedDate: workerData.w9SubmittedDate || '',
      approvedDate: workerData.w9ApprovedDate || '',
      last4: workerData.w9SsnLast4 || '',
      pdfUrl: (workerData.w9Status === 'approved') ? workerData.w9PdfUrl : ''
    };
    
  } catch (error) {
    Logger.log(`❌ Error in getW9Status: ${error.message}`);
    return { ok: false, message: 'Error retrieving W-9 status.' };
  }
}

/**
 * Get W-9 PDF URL (for viewing)
 * @param {string} workerId - Worker ID
 * @param {string} requestorId - Who is requesting (for access control)
 * @returns {Object} - { ok: boolean, pdfUrl: string }
 */
function getW9PdfUrl(workerId, requestorId) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const workersSheet = ss.getSheetByName('Workers');
    
    // Check if requestor is admin or the worker themselves
    const requestorData = getWorkerByIdFromSheet_(workersSheet, requestorId);
    const isAdmin = requestorData && requestorData.role === 'Admin';
    const isSelf = workerId === requestorId;
    
    if (!isAdmin && !isSelf) {
      return { ok: false, message: 'Unauthorized access.' };
    }
    
    const workerData = getWorkerByIdFromSheet_(workersSheet, workerId);
    
    if (!workerData || !workerData.w9PdfUrl) {
      return { ok: false, message: 'W-9 PDF not found.' };
    }
    
    // Log PDF view
    TT_LOGGER.logW9View({
      workerId: requestorId,
      displayName: requestorData.displayName,
      device: 'Unknown'
    }, workerData.w9RecordId || 'unknown');
    
    return {
      ok: true,
      pdfUrl: workerData.w9PdfUrl
    };
    
  } catch (error) {
    Logger.log(`❌ Error in getW9PdfUrl: ${error.message}`);
    return { ok: false, message: 'Error retrieving PDF.' };
  }
}

// ======================================================
//  ADMIN W-9 FUNCTIONS
// ======================================================

/**
 * List all pending W-9 submissions (admin only)
 * @returns {Object} - { ok: boolean, pending: Array }
 */
function listPendingW9s() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const w9RecordsSheet = ss.getSheetByName('W9_Records');
    
    if (!w9RecordsSheet) {
      return { ok: true, pending: [] };
    }
    
    const data = w9RecordsSheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find column indices
    const w9RecordIdIdx = headers.indexOf('W9RecordID');
    const workerIdIdx = headers.indexOf('WorkerID');
    const submittedDateIdx = headers.indexOf('SubmissionDate');
    const statusIdx = headers.indexOf('Status');
    const pdfUrlIdx = headers.indexOf('W9_PDF_URL');
    
    const pending = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[statusIdx] === 'pending_admin_review') {
        const workerId = row[workerIdIdx];
        const workerDisplayName = getWorkerDisplayName_(workerId);
        
        pending.push({
          w9RecordId: row[w9RecordIdIdx],
          workerId: workerId,
          displayName: workerDisplayName,
          submittedDate: row[submittedDateIdx],
          pdfUrl: row[pdfUrlIdx]
        });
      }
    }
    
    Logger.log(`📋 Found ${pending.length} pending W-9 submissions`);
    
    return {
      ok: true,
      pending: pending
    };
    
  } catch (error) {
    Logger.log(`❌ Error in listPendingW9s: ${error.message}`);
    return { ok: false, message: 'Error retrieving pending W-9s.' };
  }
}

/**
 * Approve a W-9 submission (admin only)
 * @param {string} w9RecordId - W-9 record ID
 * @param {string} adminId - Admin's worker ID
 * @param {string} device - Device info
 * @returns {Object} - { ok: boolean, message: string }
 */
function approveW9(w9RecordId, adminId, device) {
  try {
    Logger.log(`✅ W-9 approval started: ${w9RecordId} by ${adminId}`);
    
    // Verify admin permissions
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const workersSheet = ss.getSheetByName('Workers');
    const adminData = getWorkerByIdFromSheet_(workersSheet, adminId);
    
    if (!adminData || adminData.role !== 'Admin') {
      return { ok: false, message: 'Unauthorized. Admin access required.' };
    }
    
    // Find W-9 record
    const w9RecordsSheet = ss.getSheetByName('W9_Records');
    const w9Record = findW9RecordById_(w9RecordsSheet, w9RecordId);
    
    if (!w9Record) {
      return { ok: false, message: 'W-9 record not found.' };
    }
    
    if (w9Record.status !== 'pending_admin_review') {
      return { ok: false, message: 'W-9 is not pending review.' };
    }
    
    const timestamp = new Date();
    const workerId = w9Record.workerId;
    
    // Update W9_Records sheet
    updateW9RecordStatus_(w9RecordsSheet, w9RecordId, {
      status: 'approved',
      approvedBy: adminId,
      approvedDate: timestamp
    });
    
    // Update Workers sheet
    updateWorkerW9Status_(workersSheet, workerId, {
      w9Status: 'approved',
      w9ApprovedDate: timestamp,
      w9ApprovedBy: adminId
    });
    
    // Get worker data for logging
    const workerData = getWorkerByIdFromSheet_(workersSheet, workerId);
    
    // Log approval
    TT_LOGGER.logW9Approval(
      {
        workerId: workerId,
        displayName: workerData.displayName,
        email: workerData.email
      },
      {
        workerId: adminId,
        displayName: adminData.displayName,
        device: device || 'Unknown'
      },
      w9RecordId
    );
    
    // Send approval email to worker
    sendW9ApprovalNotification_(workerData.email, workerData.displayName, w9RecordId);
    
    Logger.log(`✅ W-9 approved: ${w9RecordId} for ${workerId}`);
    
    return {
      ok: true,
      message: 'W-9 approved successfully!'
    };
    
  } catch (error) {
    Logger.log(`❌ Error in approveW9: ${error.message}`);
    Logger.log(error.stack);
    return { ok: false, message: 'Error approving W-9.' };
  }
}

/**
 * Reject a W-9 submission (admin only)
 * @param {string} w9RecordId - W-9 record ID
 * @param {string} adminId - Admin's worker ID
 * @param {string} reason - Rejection reason
 * @param {string} device - Device info
 * @returns {Object} - { ok: boolean, message: string }
 */
function rejectW9(w9RecordId, adminId, reason, device) {
  try {
    Logger.log(`❌ W-9 rejection started: ${w9RecordId} by ${adminId}`);
    
    // Verify admin permissions
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const workersSheet = ss.getSheetByName('Workers');
    const adminData = getWorkerByIdFromSheet_(workersSheet, adminId);
    
    if (!adminData || adminData.role !== 'Admin') {
      return { ok: false, message: 'Unauthorized. Admin access required.' };
    }
    
    // Find W-9 record
    const w9RecordsSheet = ss.getSheetByName('W9_Records');
    const w9Record = findW9RecordById_(w9RecordsSheet, w9RecordId);
    
    if (!w9Record) {
      return { ok: false, message: 'W-9 record not found.' };
    }
    
    if (w9Record.status !== 'pending_admin_review') {
      return { ok: false, message: 'W-9 is not pending review.' };
    }
    
    const workerId = w9Record.workerId;
    
    // Update W9_Records sheet
    updateW9RecordStatus_(w9RecordsSheet, w9RecordId, {
      status: 'rejected',
      rejectionReason: reason || 'Information incomplete or incorrect'
    });
    
    // Update Workers sheet
    updateWorkerW9Status_(workersSheet, workerId, {
      w9Status: 'rejected'
    });
    
    // Get worker data for logging
    const workerData = getWorkerByIdFromSheet_(workersSheet, workerId);
    
    // Log rejection
    TT_LOGGER.logW9Rejection(
      {
        workerId: workerId,
        displayName: workerData.displayName,
        email: workerData.email
      },
      {
        workerId: adminId,
        displayName: adminData.displayName,
        device: device || 'Unknown'
      },
      w9RecordId,
      reason
    );
    
    // Send rejection email to worker
    sendW9RejectionNotification_(workerData.email, workerData.displayName, reason);
    
    Logger.log(`❌ W-9 rejected: ${w9RecordId} for ${workerId}`);
    
    return {
      ok: true,
      message: 'W-9 rejected. Worker has been notified.'
    };
    
  } catch (error) {
    Logger.log(`❌ Error in rejectW9: ${error.message}`);
    Logger.log(error.stack);
    return { ok: false, message: 'Error rejecting W-9.' };
  }
}

// ======================================================
//  UTILITY FUNCTIONS
// ======================================================

/**
 * Obfuscate SSN - return only last 4 digits
 * @param {string} ssn - Full SSN (###-##-#### or #########)
 * @returns {string} - Last 4 digits only
 */
function obfuscateSSN(ssn) {
  if (!ssn) return '';
  const cleaned = ssn.replace(/\D/g, ''); // Remove non-digits
  return cleaned.slice(-4); // Last 4 digits
}

/**
 * Encrypt SSN (simple Base64 encoding with salt)
 * NOTE: This is NOT true encryption, just obscuring
 * @param {string} ssn - Full SSN
 * @returns {string} - Encoded string
 */
function encryptSSN_(ssn) {
  const salt = 'CLS_W9_2025'; // Simple salt
  const combined = ssn + '|' + salt;
  return Utilities.base64Encode(combined);
}

/**
 * Decrypt SSN
 * @param {string} encrypted - Encoded SSN
 * @returns {string} - Original SSN
 */
function decryptSSN_(encrypted) {
  try {
    const decoded = Utilities.base64Decode(encrypted);
    const combined = Utilities.newBlob(decoded).getDataAsString();
    return combined.split('|')[0];
  } catch (e) {
    Logger.log(`❌ Error decrypting SSN: ${e.message}`);
    return '';
  }
}

/**
 * Validate SSN format
 * @param {string} ssn - SSN to validate
 * @returns {Object} - { valid: boolean, formatted: string, message: string }
 */
function validateSSN(ssn) {
  if (!ssn) {
    return { valid: false, message: 'SSN is required.' };
  }
  
  // Remove all non-digits
  const cleaned = ssn.replace(/\D/g, '');
  
  // Must be exactly 9 digits
  if (cleaned.length !== 9) {
    return { valid: false, message: 'SSN must be 9 digits.' };
  }
  
  // Format as ###-##-####
  const formatted = cleaned.slice(0, 3) + '-' + cleaned.slice(3, 5) + '-' + cleaned.slice(5);
  
  return {
    valid: true,
    formatted: formatted
  };
}

/**
 * Validate W-9 form data
 * @param {Object} w9Data - W-9 form data
 * @returns {Object} - { valid: boolean, message: string }
 */
function validateW9Data(w9Data) {
  if (!w9Data.legalName || w9Data.legalName.trim() === '') {
    return { valid: false, message: 'Legal name is required.' };
  }
  
  if (!w9Data.taxClassification) {
    return { valid: false, message: 'Tax classification is required.' };
  }
  
  if (!w9Data.address || w9Data.address.trim() === '') {
    return { valid: false, message: 'Address is required.' };
  }
  
  if (!w9Data.city || w9Data.city.trim() === '') {
    return { valid: false, message: 'City is required.' };
  }
  
  if (!w9Data.state || w9Data.state.trim() === '') {
    return { valid: false, message: 'State is required.' };
  }
  
  if (!w9Data.zip || w9Data.zip.trim() === '') {
    return { valid: false, message: 'ZIP code is required.' };
  }
  
  // Validate SSN
  const ssnValidation = validateSSN(w9Data.ssn);
  if (!ssnValidation.valid) {
    return { valid: false, message: ssnValidation.message };
  }
  
  // Update SSN to formatted version
  w9Data.ssn = ssnValidation.formatted;
  
  return { valid: true };
}

/**
 * Generate next W9RecordID
 * @returns {string} - New W9RecordID (e.g., "W9-001", "W9-002")
 */
function getNextW9RecordId_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const w9RecordsSheet = getOrCreateW9RecordsSheet_(ss);
  
  const data = w9RecordsSheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    // No records yet, start with W9-001
    return 'W9-001';
  }
  
  // Find max number
  let maxNum = 0;
  for (let i = 1; i < data.length; i++) {
    const id = String(data[i][0]); // Column A: W9RecordID
    if (id.startsWith('W9-')) {
      const num = parseInt(id.substring(3));
      if (num > maxNum) maxNum = num;
    }
  }
  
  const nextNum = maxNum + 1;
  return 'W9-' + String(nextNum).padStart(3, '0');
}

/**
 * Get or create W9_Records sheet
 * @param {Spreadsheet} ss - Spreadsheet object
 * @returns {Sheet} - W9_Records sheet
 */
function getOrCreateW9RecordsSheet_(ss) {
  let sheet = ss.getSheetByName('W9_Records');
  
  if (!sheet) {
    Logger.log('📄 Creating W9_Records sheet...');
    sheet = ss.insertSheet('W9_Records');
    
    // Set up headers
    const headers = [
      'W9RecordID', 'WorkerID', 'SubmissionDate', 'LegalName', 'BusinessName',
      'TaxClassification', 'Address', 'City', 'State', 'ZIP',
      'SSN_Encrypted', 'SSN_Last4', 'BackupWithholding', 'Status',
      'ApprovedBy', 'ApprovedDate', 'RejectionReason', 'W9_PDF_URL', 'AdminNotes'
    ];
    
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    
    Logger.log('✅ W9_Records sheet created');
  }
  
  return sheet;
}

/**
 * Get worker data by ID from Workers sheet
 * @param {Sheet} workersSheet - Workers sheet
 * @param {string} workerId - Worker ID
 * @returns {Object|null} - Worker data object or null
 */
function getWorkerByIdFromSheet_(workersSheet, workerId) {
  const data = workersSheet.getDataRange().getValues();
  const headers = data[0];
  
  const workerIdIdx = headers.indexOf('WorkerID');
  const displayNameIdx = headers.indexOf('Display Name');
  const emailIdx = headers.indexOf('Email');
  const roleIdx = headers.indexOf('App Access');
  const w9StatusIdx = headers.indexOf('W9Status');
  const w9SubmittedDateIdx = headers.indexOf('W9SubmittedDate');
  const w9ApprovedDateIdx = headers.indexOf('W9ApprovedDate');
  const w9ApprovedByIdx = headers.indexOf('W9ApprovedBy');
  const w9SsnLast4Idx = headers.indexOf('W9SSN_Last4');
  const w9PdfUrlIdx = headers.indexOf('W9_PDF_URL');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][workerIdIdx] === workerId) {
      return {
        row: i + 1,
        workerId: data[i][workerIdIdx],
        displayName: data[i][displayNameIdx] || '',
        email: data[i][emailIdx] || '',
        role: data[i][roleIdx] || 'Worker',
        w9Status: data[i][w9StatusIdx] || 'none',
        w9SubmittedDate: data[i][w9SubmittedDateIdx] || '',
        w9ApprovedDate: data[i][w9ApprovedDateIdx] || '',
        w9ApprovedBy: data[i][w9ApprovedByIdx] || '',
        w9SsnLast4: data[i][w9SsnLast4Idx] || '',
        w9PdfUrl: data[i][w9PdfUrlIdx] || ''
      };
    }
  }
  
  return null;
}

/**
 * Update worker W-9 status in Workers sheet
 * @param {Sheet} workersSheet - Workers sheet
 * @param {string} workerId - Worker ID
 * @param {Object} updates - Fields to update
 */
function updateWorkerW9Status_(workersSheet, workerId, updates) {
  const data = workersSheet.getDataRange().getValues();
  const headers = data[0];
  
  const workerIdIdx = headers.indexOf('WorkerID');
  const w9StatusIdx = headers.indexOf('W9Status');
  const w9SubmittedDateIdx = headers.indexOf('W9SubmittedDate');
  const w9ApprovedDateIdx = headers.indexOf('W9ApprovedDate');
  const w9ApprovedByIdx = headers.indexOf('W9ApprovedBy');
  const w9SsnLast4Idx = headers.indexOf('W9SSN_Last4');
  const w9PdfUrlIdx = headers.indexOf('W9_PDF_URL');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][workerIdIdx] === workerId) {
      const rowNum = i + 1;
      
      if (updates.w9Status !== undefined) {
        workersSheet.getRange(rowNum, w9StatusIdx + 1).setValue(updates.w9Status);
      }
      if (updates.w9SubmittedDate !== undefined) {
        workersSheet.getRange(rowNum, w9SubmittedDateIdx + 1).setValue(updates.w9SubmittedDate);
      }
      if (updates.w9ApprovedDate !== undefined) {
        workersSheet.getRange(rowNum, w9ApprovedDateIdx + 1).setValue(updates.w9ApprovedDate);
      }
      if (updates.w9ApprovedBy !== undefined) {
        workersSheet.getRange(rowNum, w9ApprovedByIdx + 1).setValue(updates.w9ApprovedBy);
      }
      if (updates.w9SsnLast4 !== undefined) {
        workersSheet.getRange(rowNum, w9SsnLast4Idx + 1).setValue(updates.w9SsnLast4);
      }
      if (updates.w9PdfUrl !== undefined) {
        workersSheet.getRange(rowNum, w9PdfUrlIdx + 1).setValue(updates.w9PdfUrl);
      }
      
      Logger.log(`✅ Updated Workers sheet for ${workerId}`);
      return;
    }
  }
  
  Logger.log(`⚠️ Worker ${workerId} not found for update`);
}

/**
 * Find W-9 record by ID
 * @param {Sheet} w9RecordsSheet - W9_Records sheet
 * @param {string} w9RecordId - W-9 record ID
 * @returns {Object|null} - W-9 record data or null
 */
function findW9RecordById_(w9RecordsSheet, w9RecordId) {
  const data = w9RecordsSheet.getDataRange().getValues();
  const headers = data[0];
  
  const w9RecordIdIdx = headers.indexOf('W9RecordID');
  const workerIdIdx = headers.indexOf('WorkerID');
  const statusIdx = headers.indexOf('Status');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][w9RecordIdIdx] === w9RecordId) {
      return {
        row: i + 1,
        w9RecordId: data[i][w9RecordIdIdx],
        workerId: data[i][workerIdIdx],
        status: data[i][statusIdx]
      };
    }
  }
  
  return null;
}

/**
 * Update W-9 record status
 * @param {Sheet} w9RecordsSheet - W9_Records sheet
 * @param {string} w9RecordId - W-9 record ID
 * @param {Object} updates - Fields to update
 */
function updateW9RecordStatus_(w9RecordsSheet, w9RecordId, updates) {
  const data = w9RecordsSheet.getDataRange().getValues();
  const headers = data[0];
  
  const w9RecordIdIdx = headers.indexOf('W9RecordID');
  const statusIdx = headers.indexOf('Status');
  const approvedByIdx = headers.indexOf('ApprovedBy');
  const approvedDateIdx = headers.indexOf('ApprovedDate');
  const rejectionReasonIdx = headers.indexOf('RejectionReason');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][w9RecordIdIdx] === w9RecordId) {
      const rowNum = i + 1;
      
      if (updates.status !== undefined) {
        w9RecordsSheet.getRange(rowNum, statusIdx + 1).setValue(updates.status);
      }
      if (updates.approvedBy !== undefined) {
        w9RecordsSheet.getRange(rowNum, approvedByIdx + 1).setValue(updates.approvedBy);
      }
      if (updates.approvedDate !== undefined) {
        w9RecordsSheet.getRange(rowNum, approvedDateIdx + 1).setValue(updates.approvedDate);
      }
      if (updates.rejectionReason !== undefined) {
        w9RecordsSheet.getRange(rowNum, rejectionReasonIdx + 1).setValue(updates.rejectionReason);
      }
      
      Logger.log(`✅ Updated W9_Records for ${w9RecordId}`);
      return;
    }
  }
  
  Logger.log(`⚠️ W-9 record ${w9RecordId} not found for update`);
}

/**
 * Get worker display name by ID
 * @param {string} workerId - Worker ID
 * @returns {string} - Display name or 'Unknown'
 */
function getWorkerDisplayName_(workerId) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const workersSheet = ss.getSheetByName('Workers');
    const workerData = getWorkerByIdFromSheet_(workersSheet, workerId);
    return workerData ? workerData.displayName : 'Unknown';
  } catch (e) {
    return 'Unknown';
  }
}

// ======================================================
//  EMAIL NOTIFICATION FUNCTIONS
// ======================================================

/**
 * Send W-9 submission notification to admins
 */
function sendW9SubmissionNotification_(workerId, displayName, w9RecordId, pdfUrl) {
  try {
    const adminEmail = PROPS.getProperty('CC_EMAIL') || 's.garay@carolinalumpers.com';
    
    const subject = `New W-9 Submission - ${displayName} (${workerId})`;
    const body = `
A new W-9 form has been submitted and is pending your review.

Worker: ${displayName} (${workerId})
W-9 Record ID: ${w9RecordId}
Submitted: ${new Date().toLocaleString()}

View W-9 PDF: ${pdfUrl}

Please log in to the admin dashboard to approve or reject this W-9.

Dashboard: https://carolinalumpers.com/employeeDashboard.html

Thank you,
Carolina Lumpers Service System
    `.trim();
    
    GmailApp.sendEmail(adminEmail, subject, body);
    Logger.log(`📧 W-9 submission notification sent to ${adminEmail}`);
    
  } catch (e) {
    Logger.log(`⚠️ Failed to send W-9 submission notification: ${e.message}`);
  }
}

/**
 * Send W-9 approval notification to worker
 */
function sendW9ApprovalNotification_(workerEmail, displayName, w9RecordId) {
  try {
    const subject = `W-9 Approved - Welcome to Carolina Lumpers Service`;
    const body = `
Hi ${displayName},

Great news! Your W-9 form has been approved.

W-9 Record ID: ${w9RecordId}
Approved: ${new Date().toLocaleString()}

You now have full access to the employee dashboard and are eligible for payment.

Access Dashboard: https://carolinalumpers.com/employeeDashboard.html

If you have any questions, please contact us at info@carolinalumpers.com.

Welcome to the team!

Carolina Lumpers Service
    `.trim();
    
    GmailApp.sendEmail(workerEmail, subject, body);
    Logger.log(`📧 W-9 approval notification sent to ${workerEmail}`);
    
  } catch (e) {
    Logger.log(`⚠️ Failed to send W-9 approval notification: ${e.message}`);
  }
}

/**
 * Send W-9 rejection notification to worker
 */
function sendW9RejectionNotification_(workerEmail, displayName, reason) {
  try {
    const subject = `W-9 Requires Correction - Carolina Lumpers Service`;
    const body = `
Hi ${displayName},

Your W-9 form submission requires correction before it can be approved.

Reason: ${reason || 'Information incomplete or incorrect'}

Please log in and resubmit your W-9 with the correct information.

Login: https://carolinalumpers.com/employeelogin.html

If you have questions, please contact us at info@carolinalumpers.com.

Thank you,
Carolina Lumpers Service
    `.trim();
    
    GmailApp.sendEmail(workerEmail, subject, body);
    Logger.log(`📧 W-9 rejection notification sent to ${workerEmail}`);
    
  } catch (e) {
    Logger.log(`⚠️ Failed to send W-9 rejection notification: ${e.message}`);
  }
}

// ======================================================
//  PDF GENERATION
// ======================================================

/**
 * Generate W-9 PDF from template
 * @param {string} workerId - Worker ID
 * @param {Object} w9Data - W-9 form data
 * @returns {Object} - { ok: boolean, pdfUrl: string, pdfId: string, message: string }
 */
function generateW9PDF(workerId, w9Data) {
  try {
    Logger.log(`📄 Generating W-9 PDF for ${workerId}...`);
    
    // Get template and folder from Script Properties
    const templateId = PROPS.getProperty('W9_TEMPLATE_ID');
    const folderId = PROPS.getProperty('W9_FOLDER_ID');
    
    if (!templateId || !folderId) {
      Logger.log('⚠️ W9_TEMPLATE_ID or W9_FOLDER_ID not configured in Script Properties');
      // Return success with placeholder URL for now
      return {
        ok: true,
        pdfUrl: 'https://drive.google.com/file/d/PLACEHOLDER/view',
        pdfId: 'PLACEHOLDER',
        message: 'PDF generation placeholder (template not yet configured)'
      };
    }
    
    // Copy template
    const template = DriveApp.getFileById(templateId);
    const tempCopyName = `W9_${workerId}_TEMP_${new Date().getTime()}`;
    const copy = template.makeCopy(tempCopyName);
    
    // Open as Doc and replace placeholders
    const doc = DocumentApp.openById(copy.getId());
    const body = doc.getBody();
    
    body.replaceText('{{LegalName}}', w9Data.legalName || '');
    body.replaceText('{{BusinessName}}', w9Data.businessName || 'N/A');
    body.replaceText('{{TaxClassification}}', w9Data.taxClassification || '');
    body.replaceText('{{Address}}', w9Data.address || '');
    body.replaceText('{{City}}', w9Data.city || '');
    body.replaceText('{{State}}', w9Data.state || '');
    body.replaceText('{{ZIP}}', w9Data.zip || '');
    body.replaceText('{{SSN}}', w9Data.ssn || '');
    body.replaceText('{{BackupWithholding}}', w9Data.backupWithholding ? 'Yes' : 'No');
    body.replaceText('{{Signature}}', w9Data.signature || w9Data.legalName);
    body.replaceText('{{Date}}', new Date().toLocaleDateString());
    
    doc.saveAndClose();
    
    // Convert to PDF
    const blob = copy.getAs('application/pdf');
    const folder = DriveApp.getFolderById(folderId);
    const pdfName = `W9_${workerId}_${new Date().getTime()}.pdf`;
    const pdf = folder.createFile(blob).setName(pdfName);
    
    // Set sharing to restricted
    pdf.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    
    // Delete temp doc
    copy.setTrashed(true);
    
    Logger.log(`✅ W-9 PDF generated: ${pdf.getName()}`);
    
    return {
      ok: true,
      pdfUrl: pdf.getUrl(),
      pdfId: pdf.getId()
    };
    
  } catch (error) {
    Logger.log(`❌ Error generating W-9 PDF: ${error.message}`);
    Logger.log(error.stack);
    return {
      ok: false,
      message: 'Failed to generate PDF: ' + error.message
    };
  }
}
