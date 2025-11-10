# W-9 Workflow Implementation Plan

**Project**: Carolina Lumpers Service - W-9 Compliance System  
**Start Date**: November 10, 2025  
**Status**: 🟡 In Progress  

---

## 🎯 Project Overview

Add complete W-9 compliance workflow to ensure all 1099 contractors have valid W-9 forms on file before they can access the dashboard and receive payments.

### Key Requirements:
- ✅ Every worker must submit W-9 before full access
- ✅ Admin approval workflow for W-9 submissions
- ✅ Automatic PDF generation and secure storage
- ✅ Login routing based on W-9 status
- ✅ SSN security (only last 4 visible)
- ❌ **NOT IMPLEMENTING**: Payroll guard (PayrollProject integration) - excluded per user request

---

## 📊 1. Database Schema Changes

### Status: ⏳ Not Started

### Add to Workers Sheet (6 new columns):

| Column | Header | Type | Values/Notes |
|--------|--------|------|--------------|
| W | W9Status | String | `none` \| `pending_admin_review` \| `approved` \| `rejected` |
| X | W9SubmittedDate | DateTime | When worker submitted W-9 |
| Y | W9ApprovedDate | DateTime | When admin approved it |
| Z | W9ApprovedBy | String | Admin WorkerID who approved |
| AA | W9SSN_Last4 | String | Last 4 digits only (e.g., "1234") |
| AB | W9_PDF_URL | URL | Link to PDF in Google Drive |

**Default Values for Existing Workers:**
- W9Status: `'none'`
- All other fields: empty

### New Sheet: W9_Records

| Column | Header | Type | Notes |
|--------|--------|------|-------|
| A | W9RecordID | String | Primary key (e.g., "W9-001", auto-increment) |
| B | WorkerID | String | References Workers.WorkerID |
| C | SubmissionDate | DateTime | When submitted |
| D | LegalName | String | Full legal name from W-9 |
| E | BusinessName | String | Optional DBA name |
| F | TaxClassification | String | Individual, LLC, Corporation, etc. |
| G | Address | String | Street address |
| H | City | String | City |
| I | State | String | State (2-letter code) |
| J | ZIP | String | ZIP code |
| K | SSN_Encrypted | String | Full SSN (Base64 encoded) |
| L | SSN_Last4 | String | Last 4 for display |
| M | BackupWithholding | Boolean | Subject to backup withholding? |
| N | Status | String | Same as Workers.W9Status |
| O | ApprovedBy | String | Admin WorkerID (if approved) |
| P | ApprovedDate | DateTime | Approval timestamp (if approved) |
| Q | RejectionReason | String | Why rejected (if applicable) |
| R | W9_PDF_URL | URL | Link to generated PDF |
| S | AdminNotes | String | Internal notes |

**Sheet Location**: CLS_Hub_Backend spreadsheet (Sheet ID: 1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk)

---

## 🔧 2. Backend Implementation

### Status: ⏳ Not Started

### 2.1. New File: `CLS_EmployeeLogin_W9.js`

#### Core Functions:

**Worker Functions:**
```javascript
submitW9Form(workerId, w9Data, device)
  → Input: { legalName, businessName, taxClass, address, city, state, zip, ssn, backupWithholding, signature }
  → Validates all fields
  → Creates W9_Records entry with new W9RecordID
  → Generates PDF via generateW9PDF()
  → Updates Workers.W9Status = 'pending_admin_review'
  → Updates Workers.W9SubmittedDate, W9SSN_Last4, W9_PDF_URL
  → Logs via TT_LOGGER.logW9Submission()
  → Sends notification email to admins
  → Returns: { ok: true, w9RecordId, message }

getW9Status(workerId)
  → Reads Workers sheet for W9Status
  → Returns: { status, submittedDate, approvedDate, last4, pdfUrl (if approved) }

getW9Details(workerId)
  → Reads W9_Records sheet
  → Returns full W-9 data for worker (admin only or own data)
```

**Admin Functions:**
```javascript
listPendingW9s()
  → Queries W9_Records where Status = 'pending_admin_review'
  → Returns: [ { w9RecordId, workerId, displayName, submittedDate, pdfUrl }, ... ]

approveW9(w9RecordId, adminId, device)
  → Validates adminId has Admin role
  → Updates W9_Records.Status = 'approved', sets ApprovedBy, ApprovedDate
  → Updates Workers.W9Status = 'approved', W9ApprovedDate, W9ApprovedBy
  → Logs via TT_LOGGER.logW9Approval()
  → Sends approval email to worker
  → Returns: { ok: true, message }

rejectW9(w9RecordId, adminId, reason, device)
  → Validates adminId has Admin role
  → Updates W9_Records.Status = 'rejected', RejectionReason
  → Updates Workers.W9Status = 'rejected'
  → Logs via TT_LOGGER.logW9Rejection()
  → Sends rejection email to worker with reason
  → Returns: { ok: true, message }
```

**Utility Functions:**
```javascript
obfuscateSSN(ssn)
  → Input: "123-45-6789"
  → Returns: "6789" (last 4 only)

encryptSSN(ssn)
  → Input: "123-45-6789"
  → Returns: Base64(ssn + SALT) - simple obscuring
  → Note: NOT true encryption, just makes it non-obvious

decryptSSN(encrypted)
  → Reverses encryptSSN()
  → Used only for PDF generation

validateSSN(ssn)
  → Checks format: ###-##-#### or #########
  → Returns: { valid: true/false, formatted: "###-##-####" }

generateW9PDF(w9Data)
  → Creates W-9 PDF from Google Doc template
  → Stores in Drive folder: W9_Forms/
  → Filename: "W9_{WorkerID}_{Timestamp}.pdf"
  → Returns: { pdfUrl, pdfId }

getNextW9RecordId()
  → Reads W9_Records sheet
  → Finds max number, increments
  → Returns: "W9-001", "W9-002", etc.
```

**Status:** ⏳ Not Started

---

### 2.2. Update: `CLS_EmployeeLogin_Main.js`

#### New API Routes:

```javascript
// Add to handleRequest() switch statement

case 'submitW9':
  // POST: workerId, legalName, businessName, taxClass, address, city, state, zip, ssn, backupWithholding, signature, device
  return submitW9Form(params.workerId, w9Data, params.device);

case 'getW9Status':
  // GET: workerId
  return getW9Status(params.workerId);

case 'listPendingW9s':
  // GET: (admin only)
  return listPendingW9s();

case 'approveW9':
  // POST: w9RecordId, adminId, device
  return approveW9(params.w9RecordId, params.adminId, params.device);

case 'rejectW9':
  // POST: w9RecordId, adminId, reason, device
  return rejectW9(params.w9RecordId, params.adminId, params.reason, params.device);

case 'getW9Pdf':
  // GET: workerId (returns PDF URL if worker owns it or is admin)
  return getW9PdfUrl(params.workerId, params.requestorId);
```

**Status:** ⏳ Not Started

---

### 2.3. Update: `CLS_EmployeeLogin_Workers.js`

#### Modify `loginUser()` function:

**Add W-9 Status to Response:**
```javascript
// After successful login, add these fields:
return {
  success: true,
  workerId: workerId,
  displayName: displayName,
  email: email,
  role: role,
  // NEW FIELDS:
  w9Status: row[w9StatusIdx] || 'none',
  w9Last4: row[w9Last4Idx] || '',
  w9ApprovedDate: row[w9ApprovedDateIdx] || '',
  w9PdfUrl: row[w9PdfUrlIdx] || ''
};
```

**Column Indices to Add:**
```javascript
const w9StatusIdx = headers.indexOf('W9Status');
const w9Last4Idx = headers.indexOf('W9SSN_Last4');
const w9ApprovedDateIdx = headers.indexOf('W9ApprovedDate');
const w9PdfUrlIdx = headers.indexOf('W9_PDF_URL');
```

**Status:** ⏳ Not Started

---

### 2.4. Update: `CLS_EmployeeLogin_Logger.js`

#### Add W-9 Logging Functions:

```javascript
/**
 * Log W-9 submission by worker
 */
logW9Submission: function(workerData, w9RecordId) {
  return CLLogger.logEvent('W9_SUBMISSION', workerData.workerId, workerData.displayName, 
    `W-9 submitted for review`, {
      sheetId: SHEET_ID,
      project: 'TIME_TRACKING',
      status: 'PENDING',
      device: workerData.device || 'Unknown',
      details: {
        w9RecordId: w9RecordId,
        email: workerData.email
      }
    }
  );
},

/**
 * Log W-9 approval by admin
 */
logW9Approval: function(workerData, adminData, w9RecordId) {
  return CLLogger.logEvent('W9_APPROVAL', workerData.workerId, workerData.displayName,
    `W-9 approved by ${adminData.displayName}`, {
      sheetId: SHEET_ID,
      project: 'TIME_TRACKING',
      status: 'SUCCESS',
      device: adminData.device || 'Unknown',
      details: {
        w9RecordId: w9RecordId,
        approvedBy: adminData.workerId,
        approverName: adminData.displayName
      }
    }
  );
},

/**
 * Log W-9 rejection by admin
 */
logW9Rejection: function(workerData, adminData, w9RecordId, reason) {
  return CLLogger.logEvent('W9_REJECTION', workerData.workerId, workerData.displayName,
    `W-9 rejected by ${adminData.displayName}`, {
      sheetId: SHEET_ID,
      project: 'TIME_TRACKING',
      status: 'REJECTED',
      device: adminData.device || 'Unknown',
      details: {
        w9RecordId: w9RecordId,
        rejectedBy: adminData.workerId,
        rejecterName: adminData.displayName,
        reason: reason
      }
    }
  );
},

/**
 * Log W-9 PDF view
 */
logW9View: function(workerData, w9RecordId) {
  return CLLogger.logEvent('W9_VIEW', workerData.workerId, workerData.displayName,
    `Viewed W-9 PDF`, {
      sheetId: SHEET_ID,
      project: 'TIME_TRACKING',
      status: 'SUCCESS',
      device: workerData.device || 'Unknown',
      details: {
        w9RecordId: w9RecordId
      }
    }
  );
}
```

**Status:** ⏳ Not Started

---

## 🎨 3. Frontend Implementation

### Status: ⏳ Not Started

### 3.1. New File: `w9Form.html`

**Purpose**: Worker W-9 submission form  
**Accessed By**: Workers with W9Status = `none` or `rejected`

**Form Fields:**
- Legal Name (required, text)
- Business Name / DBA (optional, text)
- Tax Classification (required, dropdown)
  - Options: Individual/Sole Proprietor, LLC, C Corporation, S Corporation, Partnership, Trust/Estate, Other
- Address (required, text)
- City (required, text)
- State (required, dropdown - all US states)
- ZIP Code (required, text, pattern validation)
- Social Security Number (required, type="password", format: ###-##-####)
- Confirm SSN (required, must match)
- Backup Withholding (checkbox + explanation)
- Electronic Signature (required, text - typed name)
- Date (auto-filled, read-only)

**Features:**
- Multilingual support (EN/ES/PT using data-en/data-es/data-pt)
- Client-side validation:
  - SSN format check
  - SSN confirmation match
  - All required fields filled
- Device detection via getDeviceInfo()
- Loading spinner during submission
- Error handling with user-friendly messages
- Submit via POST to `${API_URL}?action=submitW9`

**On Success:**
- Redirect to `w9Status.html?status=submitted`

**On Error:**
- Show error message inline
- Allow retry

**Status:** ⏳ Not Started

---

### 3.2. New File: `w9Status.html`

**Purpose**: Show W-9 review status  
**Accessed By**: Workers with W9Status = `pending_admin_review`

**Content:**
- Header: "W-9 Under Review"
- Submission date display
- Status icon (pending spinner)
- Explanation text: "Your W-9 is being reviewed by our admin team. You'll receive an email once it's approved."
- Estimated review time: "1-2 business days"
- Contact information if questions
- Refresh button to check status (calls `?action=getW9Status`)
- Auto-refresh every 30 seconds

**Status States:**
- **Pending**: Show waiting message
- **Approved**: Redirect to `w9Success.html`
- **Rejected**: Show rejection reason, button to resubmit (goes to w9Form.html)

**Multilingual:** EN/ES/PT

**Status:** ⏳ Not Started

---

### 3.3. New File: `w9Success.html`

**Purpose**: Confirmation page after approval  
**Accessed By**: Workers with W9Status = `approved` (redirected from w9Status.html)

**Content:**
- Success icon ✅
- "W-9 Approved!"
- Approval date
- Last 4 of SSN
- View/Download PDF button
- "Continue to Dashboard" button → employeeDashboard.html

**Multilingual:** EN/ES/PT

**Status:** ⏳ Not Started

---

### 3.4. Update: `employeeDashboard.html`

#### For Workers - Add W-9 Status Card:

```html
<!-- W-9 Status Section (for all workers) -->
<div class="card w9-status-card" id="worker-w9-status">
  <h3 data-en="W-9 Status" data-es="Estado W-9" data-pt="Status W-9">W-9 Status</h3>
  <div id="w9-status-content">
    <!-- Dynamic content based on status -->
    <p class="status-badge status-approved" id="w9-status-badge"></p>
    <p id="w9-ssn-display"></p>
    <p id="w9-approved-date"></p>
    <a href="#" onclick="viewW9Pdf()" id="w9-view-pdf-link" style="display:none;">
      <span data-en="View W-9 PDF" data-es="Ver PDF W-9" data-pt="Ver PDF W-9">View W-9 PDF</span>
    </a>
  </div>
</div>
```

**JavaScript to Add:**
```javascript
// Load W-9 status on dashboard load
async function loadW9Status() {
  const workerId = localStorage.getItem('CLS_WorkerID');
  const response = await jsonp(`${API_URL}?action=getW9Status&workerId=${workerId}`);
  
  if (response.ok) {
    displayW9Status(response.status, response.last4, response.approvedDate, response.pdfUrl);
  }
}

function displayW9Status(status, last4, approvedDate, pdfUrl) {
  const badge = document.getElementById('w9-status-badge');
  const ssnDisplay = document.getElementById('w9-ssn-display');
  const dateDisplay = document.getElementById('w9-approved-date');
  const pdfLink = document.getElementById('w9-view-pdf-link');
  
  if (status === 'approved') {
    badge.textContent = '✅ Approved';
    badge.className = 'status-badge status-approved';
    ssnDisplay.textContent = `Last 4 SSN: ****${last4}`;
    dateDisplay.textContent = `Approved: ${new Date(approvedDate).toLocaleDateString()}`;
    pdfLink.style.display = 'inline-block';
  } else if (status === 'pending_admin_review') {
    badge.textContent = '⏳ Under Review';
    badge.className = 'status-badge status-pending';
    ssnDisplay.textContent = '';
    dateDisplay.textContent = '';
  } else if (status === 'rejected') {
    badge.textContent = '❌ Rejected';
    badge.className = 'status-badge status-rejected';
    ssnDisplay.innerHTML = '<a href="w9Form.html">Resubmit W-9</a>';
  } else {
    badge.textContent = '⚠️ Required';
    badge.className = 'status-badge status-none';
    ssnDisplay.innerHTML = '<a href="w9Form.html">Submit W-9</a>';
  }
}

function viewW9Pdf() {
  const workerId = localStorage.getItem('CLS_WorkerID');
  window.open(`${API_URL}?action=getW9Pdf&workerId=${workerId}`, '_blank');
}
```

#### For Admins - Add W-9 Review Section:

```html
<!-- Admin W-9 Review Section (only for Admins) -->
<div class="card admin-w9-section" id="admin-w9-section" style="display:none;">
  <h2 data-en="Pending W-9 Reviews" data-es="Revisiones W-9 Pendientes" data-pt="Revisões W-9 Pendentes">
    Pending W-9 Reviews
  </h2>
  <div id="pending-w9-count" class="notification-badge"></div>
  
  <div id="pending-w9-list">
    <!-- Dynamic list populated via JavaScript -->
  </div>
</div>
```

**JavaScript to Add:**
```javascript
// Load pending W-9s for admins
async function loadPendingW9s() {
  const role = localStorage.getItem('CLS_Role');
  if (role !== 'Admin') return;
  
  document.getElementById('admin-w9-section').style.display = 'block';
  
  const response = await jsonp(`${API_URL}?action=listPendingW9s`);
  
  if (response.ok && response.pending.length > 0) {
    displayPendingW9s(response.pending);
    document.getElementById('pending-w9-count').textContent = response.pending.length;
  } else {
    document.getElementById('pending-w9-list').innerHTML = '<p>No pending W-9 reviews</p>';
  }
}

function displayPendingW9s(pending) {
  const listHtml = pending.map(w9 => `
    <div class="w9-review-item">
      <div class="w9-info">
        <strong>${w9.displayName}</strong> (${w9.workerId})
        <br>
        <small>Submitted: ${new Date(w9.submittedDate).toLocaleDateString()}</small>
      </div>
      <div class="w9-actions">
        <button onclick="window.open('${w9.pdfUrl}', '_blank')" class="btn-secondary">
          View PDF
        </button>
        <button onclick="approveW9('${w9.w9RecordId}')" class="btn-success">
          Approve
        </button>
        <button onclick="rejectW9Dialog('${w9.w9RecordId}')" class="btn-danger">
          Reject
        </button>
      </div>
    </div>
  `).join('');
  
  document.getElementById('pending-w9-list').innerHTML = listHtml;
}

async function approveW9(w9RecordId) {
  if (!confirm('Approve this W-9?')) return;
  
  const adminId = localStorage.getItem('CLS_WorkerID');
  const deviceInfo = getDeviceInfo();
  
  const url = `${API_URL}?action=approveW9&w9RecordId=${w9RecordId}&adminId=${adminId}&device=${encodeURIComponent(deviceInfo.displayString)}`;
  const response = await jsonp(url);
  
  if (response.ok) {
    alert('W-9 approved successfully!');
    loadPendingW9s(); // Refresh list
  } else {
    alert('Error: ' + response.message);
  }
}

function rejectW9Dialog(w9RecordId) {
  const reason = prompt('Enter rejection reason:');
  if (!reason) return;
  
  rejectW9(w9RecordId, reason);
}

async function rejectW9(w9RecordId, reason) {
  const adminId = localStorage.getItem('CLS_WorkerID');
  const deviceInfo = getDeviceInfo();
  
  const url = `${API_URL}?action=rejectW9&w9RecordId=${w9RecordId}&adminId=${adminId}&reason=${encodeURIComponent(reason)}&device=${encodeURIComponent(deviceInfo.displayString)}`;
  const response = await jsonp(url);
  
  if (response.ok) {
    alert('W-9 rejected. Worker has been notified.');
    loadPendingW9s(); // Refresh list
  } else {
    alert('Error: ' + response.message);
  }
}
```

**Status:** ⏳ Not Started

---

### 3.5. Update: `employeelogin.html` & `employeeSignup.html`

#### Add W-9 Routing Logic:

**After successful login response, add routing:**

```javascript
// In handleLogin() function, after receiving response:
if (response.success) {
  // Store session data
  localStorage.setItem('CLS_WorkerID', response.workerId);
  localStorage.setItem('CLS_WorkerName', response.displayName);
  localStorage.setItem('CLS_Email', response.email);
  localStorage.setItem('CLS_Role', response.role || 'Worker');
  
  // NEW: Route based on W-9 status
  const w9Status = response.w9Status || 'none';
  
  if (w9Status === 'none' || w9Status === 'rejected') {
    // No W-9 or rejected → force W-9 submission
    window.location.href = 'w9Form.html';
  } else if (w9Status === 'pending_admin_review') {
    // W-9 submitted but not yet approved → status page
    window.location.href = 'w9Status.html';
  } else if (w9Status === 'approved') {
    // W-9 approved → proceed to dashboard
    window.location.href = 'employeeDashboard.html';
  } else {
    // Fallback (shouldn't happen)
    window.location.href = 'employeeDashboard.html';
  }
}
```

**Status:** ⏳ Not Started

---

## 🔐 4. Security Implementation

### SSN Handling:

**Storage:**
- Full SSN stored in W9_Records.SSN_Encrypted (Base64 + salt)
- Last 4 stored in Workers.W9SSN_Last4 and W9_Records.SSN_Last4
- Never send full SSN to frontend after initial submission

**Input:**
- `<input type="password">` for SSN fields
- Masked on screen
- Validation: ###-##-#### format
- Confirmation field (must match)

**Transmission:**
- HTTPS only (already enforced)
- SSN sent only once during form submission
- Immediately encoded on backend

**Access Control:**
- Workers can only view their own last 4
- Admins can view full W-9 records (but only last 4 in UI)
- PDF viewing restricted: worker (if approved) or admin only

### Google Drive Folder Setup:

**Create W9_Forms/ Folder:**
- Location: Root of shared Drive or subfolder
- Permissions: Service account + admin emails only
- No public sharing
- PDFs named: `W9_{WorkerID}_{Timestamp}.pdf`

**Folder ID**: Add to Script Properties as `W9_FOLDER_ID`

**Status:** ⏳ Not Started

---

## 📋 5. PDF Generation

### Approach: Google Docs Template Method

**Steps:**

1. **Create W-9 Template Document:**
   - Copy official IRS W-9 form to Google Doc
   - Add placeholders:
     - `{{LegalName}}`
     - `{{BusinessName}}`
     - `{{TaxClassification}}`
     - `{{Address}}`
     - `{{City}}`
     - `{{State}}`
     - `{{ZIP}}`
     - `{{SSN}}`
     - `{{BackupWithholding}}`
     - `{{Signature}}`
     - `{{Date}}`
   - Store template ID in Script Properties as `W9_TEMPLATE_ID`

2. **PDF Generation Function:**
   ```javascript
   function generateW9PDF(w9Data) {
     // Copy template
     const templateId = PropertiesService.getScriptProperties().getProperty('W9_TEMPLATE_ID');
     const template = DriveApp.getFileById(templateId);
     const copy = template.makeCopy(`W9_${w9Data.workerId}_TEMP`);
     
     // Open as Doc and replace placeholders
     const doc = DocumentApp.openById(copy.getId());
     const body = doc.getBody();
     body.replaceText('{{LegalName}}', w9Data.legalName);
     body.replaceText('{{BusinessName}}', w9Data.businessName || 'N/A');
     // ... replace all placeholders
     
     doc.saveAndClose();
     
     // Convert to PDF
     const blob = copy.getAs('application/pdf');
     const folderId = PropertiesService.getScriptProperties().getProperty('W9_FOLDER_ID');
     const folder = DriveApp.getFolderById(folderId);
     const pdfName = `W9_${w9Data.workerId}_${new Date().getTime()}.pdf`;
     const pdf = folder.createFile(blob).setName(pdfName);
     
     // Delete temp doc
     copy.setTrashed(true);
     
     return {
       pdfUrl: pdf.getUrl(),
       pdfId: pdf.getId()
     };
   }
   ```

**Template Document**: Need to create this manually first

**Status:** ⏳ Not Started

---

## ✅ Implementation Checklist

### Phase 1: Database & Backend Core
- [ ] 1.1. Add 6 columns to Workers sheet (W9Status, W9SubmittedDate, W9ApprovedDate, W9ApprovedBy, W9SSN_Last4, W9_PDF_URL)
- [ ] 1.2. Create W9_Records sheet with 19 columns
- [ ] 1.3. Create W-9 Google Doc template with placeholders
- [ ] 1.4. Create W9_Forms/ folder in Drive, add folder ID to Script Properties
- [ ] 1.5. Add W9_TEMPLATE_ID and W9_FOLDER_ID to Script Properties
- [ ] 2.1. Create `CLS_EmployeeLogin_W9.js` with all functions
- [ ] 2.2. Test PDF generation function standalone
- [ ] 2.3. Test SSN encryption/decryption functions

### Phase 2: Backend Integration
- [ ] 3.1. Update `CLS_EmployeeLogin_Main.js` with 6 new API routes
- [ ] 3.2. Update `CLS_EmployeeLogin_Workers.js` loginUser() to return W9Status
- [ ] 3.3. Add 4 W-9 logging functions to `CLS_EmployeeLogin_Logger.js`
- [ ] 3.4. Test all API endpoints via Apps Script editor

### Phase 3: Frontend - W-9 Pages
- [ ] 4.1. Create `w9Form.html` with full form and validation
- [ ] 4.2. Create `w9Status.html` with status display
- [ ] 4.3. Create `w9Success.html` with success message
- [ ] 4.4. Add multilingual translations for all W-9 pages
- [ ] 4.5. Test form submission end-to-end

### Phase 4: Dashboard Integration
- [ ] 5.1. Add W-9 status card for workers in `employeeDashboard.html`
- [ ] 5.2. Add W-9 review section for admins in `employeeDashboard.html`
- [ ] 5.3. Update `employeelogin.html` with W-9 routing logic
- [ ] 5.4. Update `employeeSignup.html` with W-9 routing logic

### Phase 5: Testing & Deployment
- [ ] 6.1. Test full worker flow: signup → W-9 form → submit → pending status
- [ ] 6.2. Test admin approval flow: view pending → approve → worker sees approved status
- [ ] 6.3. Test admin rejection flow: reject → worker sees rejection → resubmit
- [ ] 6.4. Test PDF generation and viewing
- [ ] 6.5. Test with multiple workers simultaneously
- [ ] 6.6. Deploy to production via `clasp push` and `clasp deploy`

### Phase 6: Production Rollout
- [ ] 7.1. Email existing workers about W-9 requirement
- [ ] 7.2. Set grace period (e.g., 2 weeks) before enforcing
- [ ] 7.3. Monitor admin dashboard for pending W-9s
- [ ] 7.4. Process approvals/rejections
- [ ] 7.5. Follow up with non-compliant workers

---

## 🚫 Excluded from Scope

### Payroll Integration (User Requested Exclusion)
- ❌ **NOT implementing**: PayrollProject W-9 guard
- ❌ **NOT implementing**: Payroll exclusion logic for workers without W-9
- ❌ **NOT implementing**: W-9 compliance reports in payroll

**Reason**: Per user request, payroll integration excluded from this implementation

---

## 📝 Notes & Decisions

### Existing Workers
- All current workers will default to `W9Status = 'none'`
- Need to send notification email asking them to submit W-9
- Consider grace period before blocking dashboard access
- Or admin can manually mark trusted workers as 'approved' (requires UI for this)

### SSN Encryption
- Using Base64 + salt for simple obscuring
- **NOT** true encryption (would need Google Cloud KMS)
- Sufficient for obscuring in sheet, but full SSN still accessible to anyone with sheet access
- For production, consider:
  - Storing full SSN elsewhere (encrypted vault)
  - Or using Google Cloud KMS
  - Or only storing last 4 permanently

### Legal Considerations
- This system helps with W-9 collection, not legal compliance
- Consult accountant/lawyer about:
  - Retention requirements
  - State-specific regulations
  - IRS reporting requirements (1099 generation separate)

### Future Enhancements
- Add "Admin Override" to manually mark worker as approved without W-9 (for special cases)
- Add W-9 expiration/renewal (W-9s should be updated if info changes)
- Add bulk approve/reject for admins
- Add W-9 audit log report
- Add 1099 export that uses W-9 data

---

## 📞 Questions for User

1. ✅ Exclude payroll integration - **CONFIRMED**
2. ⏳ Do you want a grace period for existing workers before enforcing W-9 requirement?
3. ⏳ Should admins have ability to manually mark someone as approved without W-9 submission?
4. ⏳ What email should W-9 notifications come from? (use INFO_EMAIL?)
5. ⏳ Do you have an official IRS W-9 PDF/Doc we should use as template?

---

## 🔗 Related Documentation

- Main Copilot Instructions: `../.github/copilot-instructions.md`
- Database Schema: `../.github/DATABASE_SCHEMA.md`
- EmployeeLogin README: `README.md`
- Logging Library: `../LoggingLibrary/START_HERE.md`

---

**Last Updated**: November 10, 2025  
**Implementation Status**: 0% Complete (0/10 tasks)
