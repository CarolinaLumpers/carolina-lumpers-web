/**
 * Webhook entry point for AppSheet - Handles incoming POST requests
 * @param {GoogleAppsScript.Events.DoPost} e - The HTTP request event from AppSheet
 * @returns {GoogleAppsScript.Content.TextOutput} - JSON response
 */
function doPost(e) {
    try {
        if (!e || !e.postData || !e.postData.contents) {
            logToSheet("Invalid webhook request.");
            return createJsonResponse("error", "Invalid webhook request.");
        }

        const requestData = JSON.parse(e.postData.contents);

        // Extract applicant details
        const firstName = requestData.firstName || "";
        const lastName = requestData.lastName || "";
        const fullName = `${firstName} ${lastName}`.trim();
        const email = requestData.email || "";
        const phone = requestData.phone || "";
        const workStatus = requestData.workStatus || "";
        const language = requestData.language || "";
        const experience = requestData.experience || "";
        const dobInput = requestData.dob || "";
        const dob = dobInput ? formatDateForGoogleContacts(dobInput) : null;

        logToSheet(`Webhook received: Adding ${fullName} to Google Contacts`);
        logToSheet(`DOB Input: ${dobInput}`);
        logToSheet(`Formatted Birthday: ${JSON.stringify(dob)}`);

        // Check for existing contact
        const existingContact = findContactByEmail(email);
        if (existingContact) {
            logToSheet(`Contact with email ${email} already exists: ${existingContact.resourceName}`);
            return createJsonResponse("error", `Contact with email ${email} already exists.`);
        }

        // Call function to add applicant to Google Contacts
        const newContact = addApplicantToGoogleContacts(fullName, email, phone, workStatus, language, experience, dob);

        if (newContact) {
            return createJsonResponse("success", `Contact '${fullName}' added successfully.`);
        } else {
            return createJsonResponse("error", "Failed to add contact.");
        }

    } catch (error) {
        logToSheet(`Error in doPost: ${error.message}`);
        return createJsonResponse("error", error.message);
    }
}

/**
 * Function to add an applicant to Google Contacts using Google People API.
 * @param {string} fullName - Full name of the applicant
 * @param {string} email - Email address of the applicant
 * @param {string} phone - Phone number of the applicant
 * @param {string} workStatus - Work status of the applicant
 * @param {string} language - Language of the applicant
 * @param {string} experience - Experience of the applicant
 * @param {Object} dob - Date of birth of the applicant in Google Contacts API format
 * @returns {Object|null} - The created contact or null if failed
 */
function addApplicantToGoogleContacts(fullName, email, phone, workStatus, language, experience, dob) {
    try {
        const url = "https://people.googleapis.com/v1/people:createContact";
        const accessToken = ScriptApp.getOAuthToken();

        // Create the payload for the new contact
        const contactPayload = {
            names: [{ givenName: fullName.split(" ")[0], familyName: fullName.split(" ").slice(1).join(" ") }],
            emailAddresses: email ? [{ value: email }] : [],
            phoneNumbers: phone ? [{ value: phone }] : [],
            biographies: experience ? [{ value: experience }] : [],
            birthdays: dob ? [{ date: dob }] : [],
            locales: language ? [{ value: language }] : [],
            userDefined: [
                { key: "Work Status", value: workStatus }
            ]
        };

        logToSheet(`Contact Payload: ${JSON.stringify(contactPayload)}`);

        const options = {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            payload: JSON.stringify(contactPayload),
            muteHttpExceptions: true
        };

        const response = UrlFetchApp.fetch(url, options);
        const jsonResponse = JSON.parse(response.getContentText());

        if (jsonResponse.resourceName) {
            logToSheet(`Contact added: ${jsonResponse.resourceName}`);
            return jsonResponse;
        } else {
            logToSheet(`Failed to add contact: ${JSON.stringify(jsonResponse)}`);
            return null;
        }

    } catch (error) {
        logToSheet(`Error adding applicant to Google Contacts: ${error.message}`);
        return null;
    }
}

/**
 * Function to find a contact by email using Google People API.
 * @param {string} email - Email address to search for
 * @returns {Object|null} - The found contact with person and resourceName or null if not found
 */
function findContactByEmail(email) {
  try {
    const url = `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(email)}&readMask=emailAddresses,names`;
    const accessToken = ScriptApp.getOAuthToken();

    const options = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const jsonResponse = JSON.parse(response.getContentText());

    // 🔎 Debug: log the raw response
    logToSheet(`Raw API response for ${email}: ${JSON.stringify(jsonResponse)}`);

    if (jsonResponse.results && jsonResponse.results.length > 0) {
      const contact = jsonResponse.results[0];
      logToSheet(`Found existing contact: ${JSON.stringify(contact)}`);
      return { person: contact.person, resourceName: contact.person.resourceName };
    } else {
      logToSheet(`No existing contact found for email: ${email}`);
      return null;
    }

  } catch (error) {
    logToSheet(`Error finding contact by email: ${error.message}`);
    return null;
  }
}



/**
 * Helper function to convert date format to Google Contacts API format.
 * @param {string} dateString - Date string in the format MM/DD/YYYY
 * @returns {Object|null} - Date object in Google Contacts API format or null if invalid
 */
function formatDateForGoogleContacts(dateString) {
    const dateParts = dateString.split("/");
    if (dateParts.length === 3) {
        const formattedDate = {
            year: parseInt(dateParts[2], 10),
            month: parseInt(dateParts[0], 10),
            day: parseInt(dateParts[1], 10)
        };
        logToSheet(`Formatted Birthday: ${JSON.stringify(formattedDate)}`);
        return formattedDate;
    }
    return null;
}

/**
 * Creates a JSON response for the webhook
 * @param {string} status - Response status
 * @param {string} message - Response message
 * @returns {GoogleAppsScript.Content.TextOutput} - JSON response
 */
function createJsonResponse(status, message) {
    return ContentService.createTextOutput(
        JSON.stringify({ status, message })
    ).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Updates Google Contacts display names with [Active] or [Inactive] based on Workers sheet Availability
 * Example: "John Doe (CLS)" → "John Doe (CLS) [Active]" or "John Doe (CLS) [Inactive]"
 */
function updateContactNamesWithAvailability() {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEETS.WORKERS);
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  const emailIndex = headers.indexOf(CONFIG.COLUMNS.WORKERS.EMAIL);
  const availabilityIndex = headers.indexOf(CONFIG.COLUMNS.WORKERS.AVAILABILITY);
  const displayNameIndex = headers.indexOf(CONFIG.COLUMNS.WORKERS.DISPLAY_NAME);

  if (emailIndex === -1 || availabilityIndex === -1 || displayNameIndex === -1) {
    throw new Error("Required columns not found in Workers sheet.");
  }

  const accessToken = ScriptApp.getOAuthToken();
  const updated = [];
  const skipped = [];
  const failed = [];

  logToSheet(`🚀 Starting contact name availability update...`);

  for (const row of data) {
    const email = row[emailIndex];
    const availability = row[availabilityIndex];
    let displayName = row[displayNameIndex];

    if (!email || !displayName) {
      skipped.push(`${displayName || 'Unknown'} - Missing email or name`);
      continue;
    }

    const statusLabel = availability === "Active" ? "[Active]" : "[Inactive]";
    
    // Build new display name with status
    let newDisplayName;
    if (displayName.includes("(CLS)")) {
      // Remove any existing status labels and add new one
      newDisplayName = displayName.replace(/\(CLS\)\s*\[(Active|Inactive)\]?/, `(CLS) ${statusLabel}`).trim();
      // If no existing status label, just append it
      if (!displayName.includes("[Active]") && !displayName.includes("[Inactive]")) {
        newDisplayName = displayName.replace(/\(CLS\)/, `(CLS) ${statusLabel}`).trim();
      }
    } else {
      newDisplayName = `${displayName} (CLS) ${statusLabel}`;
    }

    // Skip if name is already correct
    if (displayName === newDisplayName) {
      skipped.push(`${displayName} - Already up to date`);
      continue;
    }

    // Find existing contact by email
    const contact = findContactByEmail(email);
    if (contact && contact.person && contact.person.resourceName) {
      const resourceName = contact.person.resourceName;

      const url = `https://people.googleapis.com/v1/${resourceName}:updateContact?updatePersonFields=names`;
      
      // Parse the original name (without CLS/status labels) for structured fields
      const cleanName = displayName.replace(/\(CLS\)\s*\[(Active|Inactive)\]?/g, '').trim();
      const nameParts = cleanName.split(" ");
      const givenName = nameParts[0] || "";
      const familyNameBase = nameParts.slice(1).join(" ") || "";
      
      // Append (CLS) [Status] to familyName so it shows on mobile
      const familyName = `${familyNameBase} (CLS) ${statusLabel}`.trim();

      const payload = {
        names: [
          {
            displayName: newDisplayName,       // Shows on desktop
            givenName: givenName,              // First name (unchanged)
            familyName: familyName,            // Last name + (CLS) [Status] - shows on mobile!
            unstructuredName: newDisplayName   // Backup display name
          }
        ],
        etag: contact.person.etag
      };

      const options = {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      try {
        const response = UrlFetchApp.fetch(url, options);
        const responseCode = response.getResponseCode();
        
        if (responseCode === 200) {
          logToSheet(`✅ Updated: ${displayName} → ${newDisplayName}`);
          updated.push(newDisplayName);
        } else {
          const errorMsg = response.getContentText();
          logToSheet(`❌ Failed to update ${displayName}: ${responseCode} - ${errorMsg}`);
          failed.push(`${displayName} - HTTP ${responseCode}`);
        }
      } catch (error) {
        logToSheet(`❌ Error updating ${displayName}: ${error.message}`);
        failed.push(`${displayName} - ${error.message}`);
      }
    } else {
      skipped.push(`${displayName} - Contact not found in Google Contacts`);
    }
  }

  // Summary log
  logToSheet(`\n📊 Contact Name Update Summary:`);
  logToSheet(`✅ Updated: ${updated.length}`);
  logToSheet(`⏭️ Skipped: ${skipped.length}`);
  logToSheet(`❌ Failed: ${failed.length}`);
  
  if (failed.length > 0) {
    logToSheet(`\nFailed contacts:\n${failed.join('\n')}`);
  }

  return {
    success: true,
    updated: updated.length,
    skipped: skipped.length,
    failed: failed.length,
    details: { updated, skipped, failed }
  };
}

/**
 * Logs messages to the Log sheet
 * @param {string} message - The message to log
 */
function logToSheet(message) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Log");
    if (sheet) {
        const timestamp = new Date();
        sheet.appendRow([timestamp, message]);
    } else {
        Logger.log("Log sheet not found.");
    }
}