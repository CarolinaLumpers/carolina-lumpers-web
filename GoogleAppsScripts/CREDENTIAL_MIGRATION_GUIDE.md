# Hardcoded Credentials Migration Guide

## 📋 Overview
This guide walks through extracting hardcoded credentials from Apps Script projects and moving them to Script Properties for better security and environment management.

## 🔴 Critical Priority Projects

### 1. EmployeeLogin (HIGHEST PRIORITY)
**Security Risk**: Password hashing salt exposed in code!

**Steps:**
1. Open EmployeeLogin project in Apps Script editor
2. Run `setupScriptProperties_EmployeeLogin()` function
3. Run `generateSecureSalt()` to create a new secure salt
4. Update the HASH_SALT property with the new salt
5. Update `CLS_EmployeeLogin_Config.js` (see code below)
6. Test authentication thoroughly
7. Deploy via `clasp push`

**Code Changes Needed:**
```javascript
// CLS_EmployeeLogin_Config.js - OLD
const SHEET_ID = '1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk';
const HASH_SALT = 'CLS2025';
const INFO_EMAIL = 'info@carolinalumpers.com';
// ... etc

// CLS_EmployeeLogin_Config.js - NEW
const props = PropertiesService.getScriptProperties();
const SHEET_ID = props.getProperty('SHEET_ID');
const HASH_SALT = props.getProperty('HASH_SALT');
const INFO_EMAIL = props.getProperty('INFO_EMAIL');
const CC_EMAIL = props.getProperty('CC_EMAIL');
const LOGO_FILE_ID = props.getProperty('LOGO_FILE_ID');
const PDF_FOLDER_ID = props.getProperty('PDF_FOLDER_ID');
```

---

### 2. ClockinFlow (HIGH PRIORITY)
**Security Risk**: AppSheet API key exposed in code!

**Steps:**
1. Open ClockinFlow project in Apps Script editor
2. Run `setupScriptProperties_ClockinFlow()` function
3. Update `6_Config.js` (see code below)
4. Consider rotating the AppSheet API key in AppSheet dashboard
5. Deploy via `clasp push`

**Code Changes Needed:**
```javascript
// 6_Config.js - OLD
const CONFIG = {
  APPSHEET: {
    API_KEY: 'V2-ZHKXU-KgQG7-2R2G9-sqDXc-lylt9-QGkjy-hQnBI-NHY4x',
    APP_ID: '4a5b8255-5ee1-4473-bc44-090ac907035b',
    TABLE_NAME: 'Tasks'
  }
};

// 6_Config.js - NEW
const CONFIG = {
  APPSHEET: {
    API_KEY: PropertiesService.getScriptProperties().getProperty('APPSHEET_API_KEY'),
    APP_ID: PropertiesService.getScriptProperties().getProperty('APPSHEET_APP_ID'),
    TABLE_NAME: 'Tasks'
  }
};
```

---

## 🟡 High Priority Projects

### 3. JobApplication
**Steps:**
1. Open JobApplication project in Apps Script editor
2. Run `setupScriptProperties_JobApplication()` function
3. Update `Code.js` (lines 3-7)
4. Deploy via `clasp push`

**Code Changes:**
```javascript
// Code.js - OLD (lines 3-7)
const SHEET_ID = '14dO3qB3Oa-N7eX9EcBTStydvyJaHprgi3_dQJsTvRx4';
const MAIN = 'Applications';
const HIST = 'Status_History';
const MIN_SUBMIT_MS = 1200;
const NOTIFY_EMAIL = 'jobs@carolinalumpers.com';

// Code.js - NEW
const props = PropertiesService.getScriptProperties();
const SHEET_ID = props.getProperty('SHEET_ID');
const MAIN = 'Applications';
const HIST = 'Status_History';
const MIN_SUBMIT_MS = 1200;
const NOTIFY_EMAIL = props.getProperty('NOTIFY_EMAIL');
```

---

### 4. VendorSync
**Steps:**
1. Open VendorSync project in Apps Script editor
2. Run `setupScriptProperties_VendorSync()` function
3. Update `Config.js` (line 32)
4. Deploy via `clasp push`

**Code Changes:**
```javascript
// Config.js - OLD (line 32)
SPREADSHEET_ID: '1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk',

// Config.js - NEW
SPREADSHEET_ID: PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'),
```

---

### 5. ContactSync
**Steps:**
Same as VendorSync (they share the same hardcoded SPREADSHEET_ID)

---

### 6. InvoiceProject
**Steps:**
1. Open InvoiceProject in Apps Script editor
2. Manually set APP_ID property:
```javascript
PropertiesService.getScriptProperties().setProperty('APP_ID', '4a5b8255-5ee1-4473-bc44-090ac907035b');
```
3. Update `config/Config.js` (line 7)
4. Deploy via `clasp push`

**Code Changes:**
```javascript
// config/Config.js - OLD (line 7)
APP_ID: "4a5b8255-5ee1-4473-bc44-090ac907035b",

// config/Config.js - NEW
APP_ID: PropertiesService.getScriptProperties().getProperty("APP_ID"),
```

---

## ✅ Already Secure

### PayrollProject
**Status**: ✅ All credentials already in Script Properties!
**No action needed.**

---

### LoggingLibrary
**Status**: ✅ No hardcoded credentials (library project)
**No action needed.**

---

### GContactsFromNewApps
**Status**: ✅ Uses native OAuth, no hardcoded credentials
**No action needed.**

---

## 🔄 Migration Workflow

### For Each Project:

1. **Backup Current Code**
   ```powershell
   cd GoogleAppsScripts/[ProjectName]
   git commit -m "Backup before credential migration"
   ```

2. **Add Setup Script**
   - Copy the appropriate `SETUP_SCRIPT_PROPERTIES.js` to the project folder
   - Push to Apps Script: `clasp push`

3. **Run Setup in Apps Script Editor**
   - Open project in Apps Script editor: `clasp open`
   - Run the `setupScriptProperties_XXX()` function
   - Run the `verifyScriptProperties_XXX()` function to confirm

4. **Update Config File**
   - Modify the config file to read from Script Properties
   - Keep non-sensitive constants inline (e.g., GEOFENCE_RADIUS_MI)

5. **Test Thoroughly**
   - Test all main functions
   - Verify API calls work
   - Check database connections

6. **Deploy**
   ```powershell
   clasp push
   ```

7. **Verify in Production**
   - Test the deployed web app
   - Check logs for errors
   - Monitor for 24 hours

---

## 🔐 Security Best Practices

### 1. Password Salt (EmployeeLogin)
- **CRITICAL**: Generate a new salt, don't use 'CLS2025'
- Use `generateSecureSalt()` function
- Store the salt in a password manager
- Never commit the salt to version control

### 2. API Keys
- Rotate exposed API keys immediately after migration
- Use different keys for dev/staging/prod environments
- Monitor API usage for anomalies

### 3. Script Properties
- Only accessible to project editors
- Not visible in code repository
- Can be different per deployment

### 4. Environment Separation
After migration, set up dev/staging environments:
```javascript
// Future enhancement
const env = PropertiesService.getScriptProperties().getProperty('ENVIRONMENT');
const SHEET_ID = props.getProperty(`${env}_SHEET_ID`);
```

---

## 📊 Migration Checklist

- [ ] **EmployeeLogin** - CRITICAL (HASH_SALT + others)
- [ ] **ClockinFlow** - CRITICAL (API_KEY)
- [ ] **JobApplication** - HIGH (SHEET_ID, email)
- [ ] **VendorSync** - MEDIUM (SPREADSHEET_ID)
- [ ] **ContactSync** - MEDIUM (SPREADSHEET_ID)
- [ ] **InvoiceProject** - MEDIUM (APP_ID)
- [ ] **PayrollProject** - ✅ Already done
- [ ] **LoggingLibrary** - ✅ N/A
- [ ] **GContactsFromNewApps** - ✅ N/A

---

## 🆘 Rollback Plan

If something breaks:

1. **Immediate Rollback**
   ```powershell
   git revert HEAD
   clasp push
   ```

2. **Keep Script Properties**
   - Script Properties persist even if you revert code
   - This allows gradual migration

3. **Hybrid Approach**
   ```javascript
   // Fallback to hardcoded if Script Property not set
   const SHEET_ID = PropertiesService.getScriptProperties().getProperty('SHEET_ID') 
                    || '1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk';
   ```

---

## 📞 Support

If you encounter issues during migration:
1. Check execution logs in Apps Script editor
2. Verify Script Properties are set: run `verifyScriptProperties_XXX()`
3. Test in Apps Script editor before deploying
4. Refer to `.github/copilot-instructions.md` for patterns

---

**Last Updated**: 2025-11-10
**Status**: Ready for migration
