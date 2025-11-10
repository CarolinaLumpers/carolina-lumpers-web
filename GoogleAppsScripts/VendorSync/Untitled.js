/**
 * 🚀 Test function to fetch and log inactive 1099 vendors from QuickBooks Online.
 */
function testFetchInactiveVendors() {
  logToSheet("🚀 Running Test to Fetch Inactive 1099 Vendors...");

  const inactiveVendors = fetchInactiveVendors();
  logToSheet(`✅ Fetched ${inactiveVendors.length} inactive 1099 vendors from QuickBooks.`);

  inactiveVendors.forEach((vendor, index) => {
    logToSheet(`🔍 Inactive Vendor ${index + 1}: ${vendor.DisplayName} (Email: ${vendor.PrimaryEmailAddr ? vendor.PrimaryEmailAddr.Address : 'N/A'}, QBO ID: ${vendor.Id})`);
  });

  logToSheet("✅ Test to Fetch Inactive 1099 Vendors Completed.");
}

/**
 * 🔄 Compares vendors from Google Sheets with inactive vendors from QuickBooks.
 * If a vendor in Google Sheets has the same email but a different QBO ID, temporarily activate the vendor in QuickBooks,
 * change the name to prefix with "DUPLICATE", add a note with a timestamp, and then set the status back to inactive or whatever the status is in the sheet.
 * Also updates the status of workers in QuickBooks based on their status in Google Sheets.
 */
function compareAndHandleDuplicates() {
  logToSheet("🚀 Running Compare and Handle Duplicates...");

  // Fetch workers from Google Sheets
  const workers = fetchWorkersFromSheet();
  logToSheet(`✅ Fetched ${workers.length} workers from Google Sheets.`);

  // Fetch inactive vendors from QuickBooks
  const inactiveVendors = fetchInactiveVendors();
  logToSheet(`✅ Fetched ${inactiveVendors.length} inactive 1099 vendors from QuickBooks.`);

  workers.forEach(worker => {
    const matchingVendor = inactiveVendors.find(vendor => vendor.PrimaryEmailAddr && vendor.PrimaryEmailAddr.Address === worker[CONFIG.COLUMNS.WORKERS.EMAIL]);

    if (matchingVendor) {
      const workerAvailability = worker[CONFIG.COLUMNS.WORKERS.AVAILABILITY];
      const vendorActiveStatus = workerAvailability === 'Active';

      if (matchingVendor.Active !== vendorActiveStatus) {
        logToSheet(`🔄 Updating vendor status for: ${worker[CONFIG.COLUMNS.WORKERS.DISPLAY_NAME]} (Email: ${worker[CONFIG.COLUMNS.WORKERS.EMAIL]}, QBO ID: ${matchingVendor.Id})`);

        // Update the vendor's active status to match the worker's availability status
        matchingVendor.Active = vendorActiveStatus;
        const updatedVendor = sendQuickBooksUpdateRequest(matchingVendor);
        if (!updatedVendor) {
          logToSheet(`❌ Failed to update vendor status: ${matchingVendor.DisplayName}`);
          return;
        }

        logToSheet(`✅ Successfully updated vendor status for: ${worker[CONFIG.COLUMNS.WORKERS.DISPLAY_NAME]} to ${vendorActiveStatus ? 'Active' : 'Inactive'}`);
      }

      if (matchingVendor.Id !== worker[CONFIG.COLUMNS.WORKERS.QBO_ID]) {
        logToSheet(`🔄 Handling duplicate for vendor: ${worker[CONFIG.COLUMNS.WORKERS.DISPLAY_NAME]} (Email: ${worker[CONFIG.COLUMNS.WORKERS.EMAIL]}, QBO ID: ${matchingVendor.Id})`);

        // Temporarily activate the vendor
        matchingVendor.Active = true;
        const reactivatedVendor = sendQuickBooksUpdateRequest(matchingVendor);
        if (!reactivatedVendor) {
          logToSheet(`❌ Failed to reactivate vendor: ${matchingVendor.DisplayName}`);
          return;
        }

        // Update the vendor's name to prefix with "DUPLICATE" and add a note with a simplified timestamp
        const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
        reactivatedVendor.DisplayName = `DUPLICATE ${reactivatedVendor.DisplayName} ${timestamp}`;
        reactivatedVendor.Notes = `Marked as duplicate on ${new Date().toISOString()}`;
        const updatedVendor = sendQuickBooksUpdateRequest(reactivatedVendor);
        if (!updatedVendor) {
          logToSheet(`❌ Failed to update vendor name to "DUPLICATE": ${reactivatedVendor.DisplayName}`);
          return;
        }

        // Set the vendor's status back to inactive or whatever the status is in the sheet
        updatedVendor.Active = worker[CONFIG.COLUMNS.WORKERS.AVAILABILITY] === 'Active';
        const finalUpdate = sendQuickBooksUpdateRequest(updatedVendor);
        if (!finalUpdate) {
          logToSheet(`❌ Failed to set vendor status back: ${updatedVendor.DisplayName}`);
          return;
        }

        logToSheet(`✅ Successfully handled duplicate for vendor: ${worker[CONFIG.COLUMNS.WORKERS.DISPLAY_NAME]}`);
      }
    }
  });

  logToSheet("✅ Compare and Handle Duplicates Completed.");
}

/**
 * 🌍 Fetches all vendors from QuickBooks Online and filters inactive 1099 vendors.
 */
function fetchInactiveVendors() {
  const service = getOAuthService();
  if (!service.hasAccess()) {
    logToSheet('❌ OAuth access not granted. Run authentication first.');
    return [];
  }

  const url = `${CONFIG.QBO_BASE_URL}${CONFIG.QBO_REALM_ID}/query?query=SELECT * FROM Vendor WHERE Active = false&minorversion=65`;
  const options = {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${service.getAccessToken()}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseData = JSON.parse(response.getContentText());

    if (response.getResponseCode() === 200 && responseData.QueryResponse.Vendor) {
      // Filter inactive 1099 vendors
      const inactiveVendors = responseData.QueryResponse.Vendor.filter(vendor => vendor.Vendor1099 === true);
      return inactiveVendors;
    } else {
      logToSheet(`❌ Failed to fetch inactive vendors. Response Code: ${response.getResponseCode()}, Response: ${response.getContentText()}`);
      return [];
    }
  } catch (error) {
    logToSheet(`❌ Error fetching inactive vendors: ${error.message}`);
    return [];
  }
}

/**
 * 🔄 Sends an update request to QuickBooks Online.
 * @param {Object} payload - Vendor update data.
 * @returns {Object|null} - Updated Vendor object or null if failed.
 */
function sendQuickBooksUpdateRequest(payload) {
  const service = getOAuthService();
  if (!service.hasAccess()) {
    logToSheet('❌ OAuth access not granted. Run authentication first.');
    return null;
  }

  const url = `${CONFIG.QBO_BASE_URL}${CONFIG.QBO_REALM_ID}/vendor?minorversion=65`;
  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${service.getAccessToken()}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true,
    payload: JSON.stringify(payload)
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseData = JSON.parse(response.getContentText());

    if (response.getResponseCode() === 200 && responseData.Vendor) {
      return responseData.Vendor;
    } else {
      logToSheet(`❌ Failed to update vendor. Response Code: ${response.getResponseCode()}, Response: ${response.getContentText()}`);
      return null;
    }
  } catch (error) {
    logToSheet(`❌ Error updating vendor: ${error.message}`);
    return null;
  }
}