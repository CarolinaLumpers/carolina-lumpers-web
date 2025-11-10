# Google Apps Script Backend Projects

## 🏗️ Overview

This folder contains **8 Google Apps Script projects** that provide the backend services for Carolina Lumpers Service operations. These serverless applications handle everything from employee time tracking to QuickBooks integration.

```
┌─────────────────────────────────────────────────────────────┐
│           Frontend (carolina-lumpers-web/)                   │
│  - employeeDashboard.html                                    │
│  - apply.html                                                │
│  - Public website                                            │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│         GoogleAppsScripts/ (Backend Services)                │
│                                                              │
│  🔐 EmployeeLogin    → Time tracking & authentication       │
│  💼 PayrollProject   → Payroll generation & QBO sync        │
│  📄 InvoiceProject   → Invoice management & QBO sync        │
│  📋 JobApplication   → Job application processing           │
│  📊 LoggingLibrary   → Centralized logging (v1.2.0)         │
│  👥 VendorSync       → Worker/Vendor bidirectional sync     │
│  📞 ContactSync      → Google Contacts integration          │
│  ⏰ ClockinFlow      → Legacy batch clock-in (deprecated)   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data & Integrations                       │
│  - Google Sheets (CLS_Hub_Backend)                          │
│  - QuickBooks Online API                                    │
│  - Google People API (Contacts)                             │
│  - Gmail API (Notifications)                                │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Project Inventory

### Core Production Systems

#### 1. **EmployeeLogin/** - Primary Time Tracking System ⭐
**Status**: 🟢 Production | **Health**: 8/10 | **LOC**: ~1,200

- **Purpose**: Employee authentication, GPS clock-in/out, time tracking, reports
- **Key Features**:
  - User authentication (login/signup)
  - GPS-based clock-in with geofencing (0.3 mile radius)
  - Time edit request workflow (submit → approve/deny)
  - Admin reports and payroll summaries
  - Rate limiting and duplicate prevention
  - Multilingual support (EN/ES/PT)
- **Architecture**: Modular (9 files)
- **Logging**: Uses CLLogger v1.2.0 via TT_LOGGER wrapper
- **Database**: CLS_Hub_Backend (Sheet ID: 1U8hSNREN...)
- **Deployment**: Web app (via Cloudflare proxy)
- **Documentation**: [README.md](EmployeeLogin/README.md)

**API Endpoint**: `https://cls-proxy.s-garay.workers.dev`

---

#### 2. **LoggingLibrary/** - Centralized Logging System ⭐
**Status**: 🟢 Library v1.2.0 | **Health**: 9/10 | **LOC**: ~400

- **Purpose**: Standardized, AppSheet-optimized logging for all projects
- **Key Features**:
  - Unique Log IDs for AppSheet key column
  - 12+ convenience functions (logClockIn, logLogin, logError, etc.)
  - Structured event types and status values
  - Timezone-aware timestamps (America/New_York)
  - Separate lat/lng columns for map views
- **Used By**: EmployeeLogin (via TT_LOGGER wrapper)
- **Target**: Activity_Logs sheet (14 columns)
- **Documentation**: [README.md](LoggingLibrary/README.md) | [START_HERE.md](LoggingLibrary/START_HERE.md)

**Library ID**: `1aAsNI4ZSFg843_MvwTUI8RgmYe-qt_njBfiPRBgOwwEjvVSS8KrBhtrv`

---

#### 3. **PayrollProject/** - Payroll Generation & QuickBooks Sync
**Status**: 🟢 Production | **Health**: 8/10 | **LOC**: ~700

- **Purpose**: Generate weekly payroll reports and create QuickBooks Bills
- **Key Features**:
  - Multilingual PDF reports (EN/ES/PT)
  - QuickBooks Bill creation with line items
  - Partner distribution calculations
  - Email reports with PDF attachments
  - Webhook-triggered from AppSheet
- **Architecture**: Modular (6 files + Config/)
- **Dependencies**: OAuth2 Library v43
- **Database**: CLS_Hub_Backend
- **Documentation**: [README.md](PayrollProject/README.md)

---

#### 4. **InvoiceProject/** - Invoice Management & QuickBooks Sync
**Status**: 🟢 Production | **Health**: 7.5/10 | **LOC**: ~800

- **Purpose**: Sync invoices between AppSheet and QuickBooks Online
- **Key Features**:
  - Create QBO invoices from AppSheet data
  - Email PDF invoices to clients
  - Line item management
  - Status tracking (Draft → Sent → Paid)
  - OAuth2 authentication with token refresh
- **Architecture**: Modular (config/, handlers/, lib/, utils/)
- **Dependencies**: OAuth2 Library v43, AppSheetAPI
- **Database**: CLS_Hub_Backend
- **Documentation**: [README.md](InvoiceProject/README.md)

---

#### 5. **JobApplication/** - Job Application Processing
**Status**: 🟢 Production | **Health**: 8.5/10 | **LOC**: ~200

- **Purpose**: Process job applications from apply.html form
- **Key Features**:
  - 6-step wizard form processing
  - Anti-spam protection (honeypot + timing)
  - Email notifications
  - Multilingual support
  - Data validation and sanitization
- **Architecture**: Single file (simple)
- **Database**: CLS_AppSheet_Application_Form (Sheet ID: 14dO3...)
- **Documentation**: [README.md](JobApplication/README.md)

**Endpoint**: `https://script.google.com/macros/s/AKfycbxdD80.../exec`

---

### Supporting Services

#### 6. **VendorSync/** - Worker/Vendor Bidirectional Sync
**Status**: 🟡 Active | **Health**: 7/10 | **LOC**: ~300

- **Purpose**: Sync worker data with QuickBooks Vendor records
- **Key Features**:
  - Bidirectional sync (Sheets ↔ QuickBooks)
  - Create/update vendors in QBO
  - Sync vendor metadata back to sheets
  - OAuth2 authentication
- **Dependencies**: Custom OAuth2.js (⚠️ should migrate to OAuth2 Library v43)
- **Database**: CLS_Hub_Backend
- **Documentation**: [README.md](VendorSync/README.md)

---

#### 7. **ContactSync/** - Google Contacts Integration (Legacy)
**Status**: 🟠 Legacy | **Health**: 6.5/10 | **LOC**: ~200

- **Purpose**: Create Google Contacts from worker data
- **Status**: ⚠️ **Being replaced by GContactsFromNewApps**
- **Dependencies**: OAuth2 Library v43
- **Note**: Prefer GContactsFromNewApps for new integrations
- **Documentation**: [README.md](ContactSync/README.md)

---

#### 8. **GContactsFromNewApps/** - Google Contacts (Modern)
**Status**: 🟢 Active | **Health**: 8.5/10 | **LOC**: ~150

- **Purpose**: Simplified contact creation from worker/client data
- **Key Features**:
  - Flexible field mapping (camelCase/PascalCase)
  - Native OAuth (no library dependency)
  - Cleaner code, better error handling
  - Self-contained configuration
- **Replaces**: ContactSync
- **Documentation**: [README.md](GContactsFromNewApps/README.md)

---

#### 9. **ClockinFlow/** - Batch Clock-In Operations (Deprecated)
**Status**: 🔴 Legacy/Deprecated | **Health**: 5.5/10 | **LOC**: ~800

- **Purpose**: Original batch clock-in system
- **Status**: ⚠️ **Being phased out** - functionality moved to EmployeeLogin
- **Issues**: 
  - Overlaps with EmployeeLogin (duplicate logic)
  - Outdated patterns (getActiveSpreadsheet)
  - Not using centralized logging
- **Recommendation**: Migrate remaining usage to EmployeeLogin
- **Documentation**: [README.md](ClockinFlow/README.md)

---

## 🚀 Quick Start

### Prerequisites
- Node.js and npm installed
- Google Cloud Platform project with Apps Script API enabled
- `clasp` CLI installed: `npm install -g @google/clasp`
- Authenticated with `clasp login`

### Deploying All Projects
```powershell
# From GoogleAppsScripts/ folder
.\push-all.ps1
```

### Deploying Single Project
```powershell
# Navigate to project folder
cd GoogleAppsScripts\EmployeeLogin

# Push to Google Apps Script
clasp push

# View in Apps Script editor
clasp open
```

### Pulling Latest from Google
```powershell
# Pull all projects
.\pull-all.ps1

# Or pull single project
cd EmployeeLogin
clasp pull
```

## 🔧 Project Architecture Patterns

### Modular Projects (Best Practice) ✅
**Used in**: EmployeeLogin, InvoiceProject, PayrollProject

```
Project/
├── ProjectName_Main.js        # Entry point (doGet/doPost)
├── ProjectName_Config.js      # Configuration constants
├── ProjectName_BusinessLogic.js # Core functionality
├── ProjectName_Utils.js       # Helper functions
├── ProjectName_Logger.js      # Logging wrapper
└── README.md                  # Documentation
```

### Simple Projects (Single File) ✅
**Used in**: JobApplication, GContactsFromNewApps

```
Project/
├── Code.js                    # All functionality
├── appsscript.json           # Apps Script manifest
└── README.md                  # Documentation
```

### Legacy Projects (Mixed) ⚠️
**Found in**: ClockinFlow, ContactSync

- Inconsistent file organization
- Mixed patterns
- Needs refactoring

## 🔐 Configuration Management

### Environment Variables (Script Properties)
All sensitive data stored in Script Properties, never hardcoded:

```javascript
// Setup Script Properties (run once)
function setupScriptProperties() {
  const props = PropertiesService.getScriptProperties();
  props.setProperties({
    'ENVIRONMENT': 'production',
    'SHEET_ID': '1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk',
    'QBO_CLIENT_ID': 'your_client_id',
    'QBO_CLIENT_SECRET': 'your_client_secret',
    'HASH_SALT': 'secure_random_salt',
    // ... other sensitive values
  });
}

// Access in code
const CONFIG = {
  SHEET_ID: PropertiesService.getScriptProperties().getProperty('SHEET_ID')
};
```

### Configuration Pattern
```javascript
// ProjectName_Config.js
function getConfig() {
  const props = PropertiesService.getScriptProperties();
  
  return {
    // From Script Properties (sensitive)
    SHEET_ID: props.getProperty('SHEET_ID'),
    API_KEY: props.getProperty('API_KEY'),
    
    // Inline constants (non-sensitive)
    GEOFENCE_RADIUS_MI: 0.3,
    RATE_LIMIT_MINUTES: 20,
    
    // Sheet names
    SHEET_NAMES: {
      WORKERS: 'Workers',
      CLOCK_IN: 'ClockIn'
    }
  };
}

const CONFIG = getConfig();
```

## 📊 Centralized Logging

All projects should use the **LoggingLibrary v1.2.0** for consistent, structured logging.

### Setup in Your Project
1. Add library reference in Apps Script editor:
   - Script ID: `1aAsNI4ZSFg843_MvwTUI8RgmYe-qt_njBfiPRBgOwwEjvVSS8KrBhtrv`
   - Identifier: `CLLogger`

2. Create wrapper (recommended pattern):
```javascript
// ProjectName_Logger.js
const PROJECT_LOGGER = {
  logEvent(eventType, userId, displayName, summary, details) {
    return CLLogger.logEvent(eventType, userId, displayName, summary, {
      sheetId: CONFIG.SHEET_ID,
      project: 'YOUR_PROJECT_NAME',
      details: details
    });
  },
  
  logError(userId, displayName, errorMessage, errorDetails) {
    return CLLogger.logError(userId, displayName, errorMessage, {
      sheetId: CONFIG.SHEET_ID,
      project: 'YOUR_PROJECT_NAME',
      details: errorDetails
    });
  }
};
```

3. Use in code:
```javascript
PROJECT_LOGGER.logEvent('CLOCK_IN', workerId, displayName, 'Clocked in at warehouse', {
  site: 'Raleigh Warehouse',
  device: 'iPhone - Safari'
});
```

### Benefits
- Centralized audit trail (Activity_Logs sheet)
- Structured, queryable data
- AppSheet-compatible format
- Consistent across all projects

## 🧪 Testing

### Backend Testing (Apps Script Editor)
Each project may have test functions:

```javascript
// Run in Apps Script editor
function testSystemConfig() {
  // Verify configuration
}

function testApiEndpoint() {
  // Test API functionality
}
```

### Integration Testing
```powershell
# Test API endpoints using curl or Postman
curl "https://cls-proxy.s-garay.workers.dev?action=whoami&workerId=W001"
```

## 📚 Key Documentation

### Project-Specific
- **EmployeeLogin**: [README.md](EmployeeLogin/README.md) - Complete time tracking system
- **LoggingLibrary**: [START_HERE.md](LoggingLibrary/START_HERE.md) - Logging implementation guide
- **PayrollProject**: [README.md](PayrollProject/README.md) - Payroll generation
- **InvoiceProject**: [README.md](InvoiceProject/README.md) - Invoice management

### System-Wide
- **Main README**: `../README.md` - Complete system overview
- **Copilot Instructions**: `../.github/copilot-instructions.md` - Developer guide with patterns
- **Database Schema**: `../.github/DATABASE_SCHEMA.md` - Complete database structure
- **Refactoring Plan**: [APPS_SCRIPT_REVIEW_AND_REFACTORING_PLAN.md](APPS_SCRIPT_REVIEW_AND_REFACTORING_PLAN.md)

## 🔗 Dependencies

### External Libraries Used
- **OAuth2 Library v43** (InvoiceProject, PayrollProject, ContactSync)
  - Script ID: `1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF`
- **CLLogger Library v1.2.0** (EmployeeLogin)
  - Script ID: `1aAsNI4ZSFg843_MvwTUI8RgmYe-qt_njBfiPRBgOwwEjvVSS8KrBhtrv`

### External APIs
- **QuickBooks Online API** (InvoiceProject, PayrollProject, VendorSync)
- **Google People API** (ContactSync, GContactsFromNewApps)
- **AppSheet API** (InvoiceProject)

### Primary Database
**CLS_Hub_Backend** - Main Google Sheets database
- **Sheet ID**: `1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk`
- **22 Sheets**: Workers, ClockIn, Clients, Activity_Logs, TimeEditRequests, etc.
- **Documentation**: `../.github/DATABASE_SCHEMA.md`

## ⚠️ Common Pitfalls

### ❌ Wrong: Using getActiveSpreadsheet()
```javascript
var ss = SpreadsheetApp.getActiveSpreadsheet(); // Breaks in web apps!
```

### ✅ Correct: Always use openById()
```javascript
const SHEET_ID = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
var ss = SpreadsheetApp.openById(SHEET_ID);
```

---

### ❌ Wrong: Hardcoded credentials
```javascript
const API_KEY = 'abc123xyz'; // Never hardcode!
```

### ✅ Correct: Use Script Properties
```javascript
const API_KEY = PropertiesService.getScriptProperties().getProperty('API_KEY');
```

---

### ❌ Wrong: Legacy logging
```javascript
Logger.log("Event occurred"); // Only in execution logs
```

### ✅ Correct: Use centralized logging
```javascript
CLLogger.logEvent('EVENT_TYPE', userId, displayName, summary, options);
```

## 🔄 Project Status Summary

| Project | Status | Purpose | Recommend |
|---------|--------|---------|-----------|
| **EmployeeLogin** | 🟢 Active | Time tracking | Keep |
| **LoggingLibrary** | 🟢 Library | Centralized logging | Keep |
| **PayrollProject** | 🟢 Active | Payroll generation | Keep |
| **InvoiceProject** | 🟢 Active | Invoice management | Keep |
| **JobApplication** | 🟢 Active | Job applications | Keep |
| **GContactsFromNewApps** | 🟢 Active | Contacts (modern) | Keep |
| **VendorSync** | 🟡 Active | Worker/vendor sync | Refactor OAuth |
| **ContactSync** | 🟠 Legacy | Contacts (old) | Deprecate |
| **ClockinFlow** | 🔴 Deprecated | Batch clock-in | Phase out |

## 📈 Roadmap & Improvements

### High Priority 🔴
1. **Extract hardcoded credentials** to Script Properties (all projects)
2. **Consolidate clock-in logic** (merge ClockinFlow into EmployeeLogin)
3. **Deprecate ContactSync** (migrate to GContactsFromNewApps)

### Medium Priority 🟡
4. **Create shared utilities library** (date formatting, email, validation)
5. **Migrate VendorSync** to OAuth2 Library v43
6. **Implement environment configuration** (dev/staging/prod)

### Low Priority 🟢
7. **Add comprehensive testing framework**
8. **Update all documentation**
9. **Code style consistency**

See [APPS_SCRIPT_REVIEW_AND_REFACTORING_PLAN.md](APPS_SCRIPT_REVIEW_AND_REFACTORING_PLAN.md) for detailed refactoring plan.

## 🛠️ Development Scripts

Located in this folder:

- **`push-all.ps1`** - Deploy all projects to Google Apps Script
- **`pull-all.ps1`** - Pull all projects from Google Apps Script
- **`clone-all.ps1`** - Clone all projects from Google Apps Script

## 👥 Contact

For questions or support:
- **Developer**: Steve Garay - s.garay@carolinalumpers.com
- **Documentation**: See individual project READMEs
- **System Guide**: `../.github/copilot-instructions.md`

---

**Last Updated**: 2025-11-10  
**Total Projects**: 8 (+ 1 library)  
**Total LOC**: ~4,500+  
**Overall Health**: 7.2/10
