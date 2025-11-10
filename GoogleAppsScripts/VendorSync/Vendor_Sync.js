/**
 * Web App Entry Point - Handles GET requests from frontend
 * @param {Object} e - Event object with query parameters
 * @returns {TextOutput} - JSON response
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    const dryRun = e.parameter.dryRun === 'true';
    
    if (action === 'syncVendors') {
      const result = syncVendors(dryRun);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'syncSingleWorker') {
      // Sync a single worker by WorkerID or Display Name
      const workerIdOrName = e.parameter.worker;
      if (!workerIdOrName) {
        return ContentService.createTextOutput(JSON.stringify({ 
          success: false, 
          error: 'Missing worker parameter (WorkerID or Display Name)' 
        })).setMimeType(ContentService.MimeType.JSON);
      }
      const result = syncSingleWorker(workerIdOrName, dryRun);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({ 
        success: false, 
        error: 'Invalid action. Use: syncVendors or syncSingleWorker' 
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    logToSheet(`❌ doGet Error: ${error.message}`);
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.message 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Main sync function - can be called directly or via doGet
 * @param {boolean} dryRun - If true, only preview changes without executing
 * @returns {Object} - Sync results with counts and logs
 */
function syncVendors(dryRun = false) {
  const logs = [];
  const addLog = (msg) => {
    logs.push(msg);
    logToSheet(msg);
  };
  
  addLog(`🚀 Starting Vendor Sync ${dryRun ? '(Dry Run)' : ''}`);

  // Get and filter active workers from Sheet
  const allWorkers = getWorkersFromSheet();
  const workers = allWorkers.filter(w => w[CONFIG.COLUMNS.WORKERS.AVAILABILITY] === "Active");
  const skippedWorkers = allWorkers.length - workers.length;
  if (skippedWorkers > 0) {
    logToSheet(`ℹ️ Ignored ${skippedWorkers} inactive workers from Sheet`);
  }

  // Get and filter active vendors from QBO (with pagination)
  const vendors = getAllVendorsFromQBO();
  const activeVendors = vendors.filter(v => v.Active === true);
  const skippedVendors = vendors.length - activeVendors.length;
  if (skippedVendors > 0) {
    logToSheet(`ℹ️ Ignored ${skippedVendors} inactive vendors from QBO`);
  }

  // Compare
  const comparison = compareWorkersToVendors(workers, activeVendors);
  
  // Track counts for response
  const counts = {
    created: 0,
    updated: 0,
    noChange: 0,
    failed: 0
  };

  // Create
  addLog(`🆕 To Create: ${comparison.newVendors.length}`);
  comparison.newVendors.forEach((worker, i) => {
    const name = worker[CONFIG.COLUMNS.WORKERS.DISPLAY_NAME];
    const email = worker[CONFIG.COLUMNS.WORKERS.EMAIL];
    addLog(`🆕 ${i + 1}: Would create ${name} (${email})`);
    if (!dryRun) {
      const success = createVendor(worker);
      if (success) {
        addLog(`✅ Created: ${name}`);
        counts.created++;
      } else {
        addLog(`❌ Failed: ${name}`);
        counts.failed++;
      }
    } else {
      counts.created++;
    }
  });

  // Update
  addLog(`🔄 To Update: ${comparison.updates.length}`);
  comparison.updates.forEach(({ worker, vendor }, i) => {
    const name = worker[CONFIG.COLUMNS.WORKERS.DISPLAY_NAME];

    if (dryRun) {
      const changes = [];

      const isSheetActive = worker[CONFIG.COLUMNS.WORKERS.AVAILABILITY] === "Active";
      if (vendor.Active !== isSheetActive) {
        changes.push(`Active: QBO=${vendor.Active} → Sheet=${isSheetActive}`);
      }

      const qboEmail = (vendor.PrimaryEmailAddr?.Address || "").toLowerCase();
      const sheetEmail = (worker[CONFIG.COLUMNS.WORKERS.EMAIL] || "").toLowerCase();
      if (qboEmail !== sheetEmail) {
        changes.push(`Email: QBO=${vendor.PrimaryEmailAddr?.Address || 'N/A'} → Sheet=${worker[CONFIG.COLUMNS.WORKERS.EMAIL]}`);
      }

      const qboPhone = vendor.PrimaryPhone?.FreeFormNumber || "";
      const sheetPhone = worker[CONFIG.COLUMNS.WORKERS.PHONE] || "";
      if (qboPhone !== sheetPhone) {
        changes.push(`Phone: QBO=${qboPhone} → Sheet=${sheetPhone}`);
      }

      const qboName = (vendor.DisplayName || "").toLowerCase();
      const sheetName = (worker[CONFIG.COLUMNS.WORKERS.DISPLAY_NAME] || "").toLowerCase();
      if (qboName !== sheetName) {
        changes.push(`DisplayName: QBO=${vendor.DisplayName} → Sheet=${worker[CONFIG.COLUMNS.WORKERS.DISPLAY_NAME]}`);
      }

      if (changes.length) {
        addLog(`🔄 ${i + 1}: Would update ${name}\n  - ${changes.join("\n  - ")}`);
        counts.updated++;
      } else {
        addLog(`🔄 ${i + 1}: ${name} has no actual field changes, but marked for update.`);
        counts.noChange++;
      }

    } else {
      const success = updateVendor(worker, vendor);
      if (success) {
        addLog(`✅ Updated: ${name}`);
        counts.updated++;
      } else {
        addLog(`❌ Failed: ${name}`);
        counts.failed++;
      }
    }
  });

  // Discrepancies
  addLog(`⚠️ No Change: ${comparison.discrepancies.length}`);
  comparison.discrepancies.forEach(({ worker }, i) => {
    const name = worker[CONFIG.COLUMNS.WORKERS.DISPLAY_NAME];
    addLog(`⚠️ ${i + 1}: ${name} – no sync needed`);
    counts.noChange++;
  });

  addLog(`✅ Vendor Sync ${dryRun ? 'Review' : 'Complete'}`);
  
  return {
    success: true,
    dryRun: dryRun,
    counts: counts,
    logs: logs,
    summary: `Created: ${counts.created}, Updated: ${counts.updated}, No Change: ${counts.noChange}${counts.failed > 0 ? `, Failed: ${counts.failed}` : ''}`
  };
}


/* -------------------- MAIN UTILITIES -------------------- */

function getAllVendorsFromQBO() {
  const service = getOAuthService();
  if (!service.hasAccess()) {
    logToSheet('❌ No OAuth access');
    return [];
  }

  const baseUrl = `${CONFIG.QBO_BASE_URL}${CONFIG.QBO_REALM_ID}/query`;
  const limit = 1000;
  let startPosition = 1;
  let allVendors = [];
  let page = 1;

  while (true) {
    const query = `SELECT * FROM Vendor STARTPOSITION ${startPosition} MAXRESULTS ${limit}`;
    const url = `${baseUrl}?query=${encodeURIComponent(query)}&minorversion=65`;

    const res = UrlFetchApp.fetch(url, {
      headers: {
        Authorization: `Bearer ${service.getAccessToken()}`,
        Accept: 'application/json'
      },
      muteHttpExceptions: true
    });

    const text = res.getContentText();
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      logToSheet(`❌ JSON parse failed on page ${page}: ${text.slice(0,200)}`);
      break;
    }

    const vendors = data?.QueryResponse?.Vendor || [];
    if (vendors.length === 0) break;

    logToSheet(`📄 Page ${page}: Retrieved ${vendors.length} vendors`);
    allVendors = allVendors.concat(vendors);

    if (vendors.length < limit) break;

    startPosition += limit;
    page++;
  }

  logToSheet(`📦 Total Vendors Retrieved: ${allVendors.length}`);
  return allVendors;
}


function compareWorkersToVendors(workers, vendors) {
  const newVendors = [];
  const updates = [];
  const discrepancies = [];

  workers.forEach(worker => {
    const isActive = worker[CONFIG.COLUMNS.WORKERS.AVAILABILITY] === "Active";
    if (!isActive) return;

    const email = (worker[CONFIG.COLUMNS.WORKERS.EMAIL] || '').toLowerCase();
    const displayName = (worker[CONFIG.COLUMNS.WORKERS.DISPLAY_NAME] || '').toLowerCase();
    const vendor = vendors.find(v =>
      (v.PrimaryEmailAddr?.Address || '').toLowerCase() === email ||
      (v.DisplayName || '').toLowerCase() === displayName
    );

    if (!vendor) {
      newVendors.push(worker);
    } else {
      // If worker doesn't have QBOID but we found a matching vendor, update it
      const currentQboId = worker[CONFIG.COLUMNS.WORKERS.QBO_VENDOR_ID];
      if (!currentQboId && vendor.Id) {
        logToSheet(`📝 Updating missing QBOID for ${displayName}: ${vendor.Id}`);
        updateQboIdInSheet(worker[CONFIG.COLUMNS.WORKERS.DISPLAY_NAME], vendor.Id);
      } else if (currentQboId && currentQboId !== vendor.Id) {
        logToSheet(`⚠️ QBOID mismatch for ${displayName}: Sheet has ${currentQboId}, QBO has ${vendor.Id}`);
      }

      const qboActive = vendor.Active;
      if (qboActive !== isActive) {
        updates.push({ worker, vendor });
      } else {
        discrepancies.push({ worker, message: 'No changes needed' });
      }
    }
  });

  return { newVendors, updates, discrepancies };
}


function getWorkersFromSheet() {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.WORKERS);
  if (!sheet) return [];
  const [headers, ...rows] = sheet.getDataRange().getValues();
  return rows.map(row => Object.fromEntries(headers.map((h, i) => [h, row[i]])));
}


function createVendor(worker) {
  const service = getOAuthService();
  if (!service.hasAccess()) return false;
  const payload = buildVendorPayload(worker);
  const res = UrlFetchApp.fetch(`${CONFIG.QBO_BASE_URL}${CONFIG.QBO_REALM_ID}/vendor?minorversion=65`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${service.getAccessToken()}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const text = res.getContentText();
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    logToSheet(`❌ Non-JSON vendor creation response: ${text.slice(0,200)}`);
    return false;
  }

  if (res.getResponseCode() === 200 && data?.Vendor?.Id) {
    updateQboIdInSheet(worker[CONFIG.COLUMNS.WORKERS.DISPLAY_NAME], data.Vendor.Id);
    return true;
  }

  logToSheet(`❌ Failed vendor creation: ${text.slice(0,200)}`);
  return false;
}


function updateVendor(worker, vendor) {
  const payload = {
    ...vendor,
    DisplayName: worker[CONFIG.COLUMNS.WORKERS.DISPLAY_NAME],
    PrimaryEmailAddr: { Address: worker[CONFIG.COLUMNS.WORKERS.EMAIL] },
    PrimaryPhone: { FreeFormNumber: worker[CONFIG.COLUMNS.WORKERS.PHONE] },
    SyncToken: vendor.SyncToken
  };
  return !!sendUpdateToQBO(payload);
}


function sendUpdateToQBO(payload) {
  const service = getOAuthService();
  if (!service.hasAccess()) return null;
  const url = `${CONFIG.QBO_BASE_URL}${CONFIG.QBO_REALM_ID}/vendor?minorversion=65`;
  const res = UrlFetchApp.fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${service.getAccessToken()}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const text = res.getContentText();
  try {
    const data = JSON.parse(text);
    return res.getResponseCode() === 200 ? data.Vendor : null;
  } catch (err) {
    logToSheet(`❌ Non-JSON update response: ${text.slice(0,200)}`);
    return null;
  }
}


function buildVendorPayload(worker) {
  return {
    DisplayName: worker[CONFIG.COLUMNS.WORKERS.DISPLAY_NAME],
    GivenName: worker[CONFIG.COLUMNS.WORKERS.FIRST_NAME],
    FamilyName: worker[CONFIG.COLUMNS.WORKERS.LAST_NAME],
    PrimaryEmailAddr: { Address: worker[CONFIG.COLUMNS.WORKERS.EMAIL] },
    PrimaryPhone: { FreeFormNumber: worker[CONFIG.COLUMNS.WORKERS.PHONE] },
    Active: true,
    Vendor1099: true
  };
}


function updateQboIdInSheet(displayName, qboId) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.WORKERS);
  if (!sheet) {
    logToSheet(`❌ Workers sheet not found`);
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const displayNameColIndex = headers.indexOf(CONFIG.COLUMNS.WORKERS.DISPLAY_NAME);
  const qboIdColIndex = headers.indexOf(CONFIG.COLUMNS.WORKERS.QBO_VENDOR_ID);
  
  if (displayNameColIndex === -1) {
    logToSheet(`❌ Column "${CONFIG.COLUMNS.WORKERS.DISPLAY_NAME}" not found in Workers sheet`);
    return;
  }
  
  if (qboIdColIndex === -1) {
    logToSheet(`❌ Column "${CONFIG.COLUMNS.WORKERS.QBO_VENDOR_ID}" not found in Workers sheet`);
    return;
  }
  
  // Find the row (skip header row at index 0)
  const rowIndex = data.findIndex((row, index) => {
    if (index === 0) return false; // Skip header
    return row[displayNameColIndex] === displayName;
  });
  
  if (rowIndex === -1) {
    logToSheet(`❌ Worker "${displayName}" not found in Workers sheet`);
    return;
  }
  
  // Update the QBOID cell (rowIndex + 1 because sheet rows are 1-indexed)
  sheet.getRange(rowIndex + 1, qboIdColIndex + 1).setValue(qboId);
  logToSheet(`✅ Updated QBOID for ${displayName}: ${qboId}`);
}


function logToSheet(message) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.LOG);
  if (!sheet) return;
  sheet.appendRow([new Date(), message]);
}


/**
 * Sync a single worker to QuickBooks by WorkerID or Display Name
 * @param {string} workerIdOrName - WorkerID (e.g., "CLS001") or Display Name (e.g., "John Doe")
 * @param {boolean} dryRun - If true, only preview changes without executing
 * @returns {Object} - Sync results with status and QBOID
 */
function syncSingleWorker(workerIdOrName, dryRun = false) {
  const logs = [];
  const addLog = (msg) => {
    logs.push(msg);
    logToSheet(msg);
  };
  
  addLog(`🎯 Starting Single Worker Sync: "${workerIdOrName}" ${dryRun ? '(Dry Run)' : ''}`);

  // Find the worker
  const allWorkers = getWorkersFromSheet();
  const worker = allWorkers.find(w => 
    w[CONFIG.COLUMNS.WORKERS.WORKER_ID] === workerIdOrName || 
    w[CONFIG.COLUMNS.WORKERS.DISPLAY_NAME] === workerIdOrName
  );

  if (!worker) {
    const error = `❌ Worker not found: "${workerIdOrName}"`;
    addLog(error);
    return {
      success: false,
      error: error,
      logs: logs
    };
  }

  const displayName = worker[CONFIG.COLUMNS.WORKERS.DISPLAY_NAME];
  const email = worker[CONFIG.COLUMNS.WORKERS.EMAIL];
  const availability = worker[CONFIG.COLUMNS.WORKERS.AVAILABILITY];

  addLog(`✅ Found worker: ${displayName} (${email})`);
  addLog(`📋 Availability: ${availability}`);

  // Check if active
  if (availability !== "Active") {
    const warning = `⚠️ Worker is not Active (${availability}). Skipping sync.`;
    addLog(warning);
    return {
      success: false,
      error: warning,
      worker: displayName,
      logs: logs
    };
  }

  // Search for existing vendor in QBO
  addLog(`🔍 Searching QuickBooks for vendor...`);
  const vendors = getAllVendorsFromQBO();
  const activeVendors = vendors.filter(v => v.Active === true);
  
  const normalizedEmail = (email || '').toLowerCase();
  const normalizedDisplayName = displayName.toLowerCase();
  
  const vendor = activeVendors.find(v =>
    (v.PrimaryEmailAddr?.Address || '').toLowerCase() === normalizedEmail ||
    (v.DisplayName || '').toLowerCase() === normalizedDisplayName
  );

  let result;
  if (!vendor) {
    // CREATE NEW VENDOR
    addLog(`🆕 Vendor does not exist in QuickBooks. Creating...`);
    if (dryRun) {
      addLog(`🔄 [DRY RUN] Would create vendor: ${displayName}`);
      result = {
        success: true,
        action: 'create',
        worker: displayName,
        email: email,
        qboId: null,
        logs: logs,
        message: `Would create vendor for ${displayName}`
      };
    } else {
      const success = createVendor(worker);
      if (success) {
        // Fetch the newly created vendor to get the QBOID
        const updatedVendors = getAllVendorsFromQBO();
        const newVendor = updatedVendors.find(v =>
          (v.PrimaryEmailAddr?.Address || '').toLowerCase() === normalizedEmail ||
          (v.DisplayName || '').toLowerCase() === normalizedDisplayName
        );
        const qboId = newVendor ? newVendor.Id : null;
        
        addLog(`✅ Created vendor: ${displayName} (QBOID: ${qboId})`);
        result = {
          success: true,
          action: 'created',
          worker: displayName,
          email: email,
          qboId: qboId,
          logs: logs,
          message: `Successfully created vendor for ${displayName}`
        };
      } else {
        addLog(`❌ Failed to create vendor: ${displayName}`);
        result = {
          success: false,
          action: 'create_failed',
          worker: displayName,
          error: 'Vendor creation failed',
          logs: logs
        };
      }
    }
  } else {
    // VENDOR EXISTS - CHECK FOR UPDATES
    const currentQboId = worker[CONFIG.COLUMNS.WORKERS.QBO_VENDOR_ID];
    
    if (!currentQboId && vendor.Id) {
      addLog(`📝 Vendor exists in QBO (ID: ${vendor.Id}) but missing in sheet. Updating QBOID...`);
      if (!dryRun) {
        updateQboIdInSheet(displayName, vendor.Id);
      }
    }

    // Check if fields need updating
    const needsUpdate = 
      (vendor.DisplayName || '').toLowerCase() !== normalizedDisplayName ||
      (vendor.PrimaryEmailAddr?.Address || '').toLowerCase() !== normalizedEmail ||
      (vendor.PrimaryPhone?.FreeFormNumber || '') !== (worker[CONFIG.COLUMNS.WORKERS.PHONE] || '');

    if (needsUpdate) {
      addLog(`🔄 Vendor exists but data differs. Updating...`);
      if (dryRun) {
        const changes = [];
        if ((vendor.DisplayName || '').toLowerCase() !== normalizedDisplayName) {
          changes.push(`DisplayName: QBO="${vendor.DisplayName}" → Sheet="${displayName}"`);
        }
        if ((vendor.PrimaryEmailAddr?.Address || '').toLowerCase() !== normalizedEmail) {
          changes.push(`Email: QBO="${vendor.PrimaryEmailAddr?.Address || 'N/A'}" → Sheet="${email}"`);
        }
        if ((vendor.PrimaryPhone?.FreeFormNumber || '') !== (worker[CONFIG.COLUMNS.WORKERS.PHONE] || '')) {
          changes.push(`Phone: QBO="${vendor.PrimaryPhone?.FreeFormNumber || 'N/A'}" → Sheet="${worker[CONFIG.COLUMNS.WORKERS.PHONE] || 'N/A'}"`);
        }
        addLog(`🔄 [DRY RUN] Would update:\n  - ${changes.join('\n  - ')}`);
        result = {
          success: true,
          action: 'update',
          worker: displayName,
          qboId: vendor.Id,
          changes: changes,
          logs: logs,
          message: `Would update vendor for ${displayName}`
        };
      } else {
        const success = updateVendor(worker, vendor);
        if (success) {
          addLog(`✅ Updated vendor: ${displayName} (QBOID: ${vendor.Id})`);
          result = {
            success: true,
            action: 'updated',
            worker: displayName,
            qboId: vendor.Id,
            logs: logs,
            message: `Successfully updated vendor for ${displayName}`
          };
        } else {
          addLog(`❌ Failed to update vendor: ${displayName}`);
          result = {
            success: false,
            action: 'update_failed',
            worker: displayName,
            error: 'Vendor update failed',
            logs: logs
          };
        }
      }
    } else {
      addLog(`✅ Vendor already in sync. No changes needed. (QBOID: ${vendor.Id})`);
      result = {
        success: true,
        action: 'no_change',
        worker: displayName,
        qboId: vendor.Id,
        logs: logs,
        message: `Vendor for ${displayName} is already in sync`
      };
    }
  }

  addLog(`🏁 Single Worker Sync Complete`);
  return result;
}


/**
 * Test function to verify QBOID column and data structure
 * Run this to diagnose QBOID update issues
 */
function testQboIdColumn() {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.WORKERS);
  if (!sheet) {
    Logger.log('❌ Workers sheet not found');
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  Logger.log(`\n📋 Sheet Headers: ${JSON.stringify(headers)}`);
  Logger.log(`\n🔍 Looking for column: "${CONFIG.COLUMNS.WORKERS.QBO_VENDOR_ID}"`);
  Logger.log(`🔍 Looking for column: "${CONFIG.COLUMNS.WORKERS.DISPLAY_NAME}"`);
  
  const qboIdColIndex = headers.indexOf(CONFIG.COLUMNS.WORKERS.QBO_VENDOR_ID);
  const displayNameColIndex = headers.indexOf(CONFIG.COLUMNS.WORKERS.DISPLAY_NAME);
  
  Logger.log(`\n📍 QBOID column index: ${qboIdColIndex}`);
  Logger.log(`📍 Display Name column index: ${displayNameColIndex}`);
  
  if (qboIdColIndex === -1) {
    Logger.log(`\n❌ ERROR: "${CONFIG.COLUMNS.WORKERS.QBO_VENDOR_ID}" column not found!`);
    Logger.log(`Available columns: ${headers.join(', ')}`);
    return;
  }
  
  if (displayNameColIndex === -1) {
    Logger.log(`\n❌ ERROR: "${CONFIG.COLUMNS.WORKERS.DISPLAY_NAME}" column not found!`);
    Logger.log(`Available columns: ${headers.join(', ')}`);
    return;
  }
  
  Logger.log(`\n✅ Columns found successfully`);
  
  // Check last 5 workers
  Logger.log(`\n📊 Last 5 workers:`);
  const startIndex = Math.max(1, data.length - 5);
  for (let i = startIndex; i < data.length; i++) {
    const row = data[i];
    const name = row[displayNameColIndex];
    const qboId = row[qboIdColIndex];
    const rowNum = i;
    Logger.log(`  Row ${rowNum}: ${name} - QBOID: ${qboId || '(empty)'}`);
  }
  
  // Count workers with/without QBOID
  let withQboId = 0;
  let withoutQboId = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i][qboIdColIndex]) {
      withQboId++;
    } else {
      withoutQboId++;
    }
  }
  
  Logger.log(`\n📈 Summary:`);
  Logger.log(`  Total workers: ${data.length - 1}`);
  Logger.log(`  With QBOID: ${withQboId}`);
  Logger.log(`  Without QBOID: ${withoutQboId}`);
}
