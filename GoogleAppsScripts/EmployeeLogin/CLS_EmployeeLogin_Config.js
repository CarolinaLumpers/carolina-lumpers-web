// ======================================================
// Project: CLS Employee Login System
// File: CLS_EmployeeLogin_Config.js
// Description: Global configuration constants and settings
// for the employee login and clock-in system.
// ======================================================

// --- SCRIPT PROPERTIES (Secure Storage) ---
const PROPS = PropertiesService.getScriptProperties();

// --- SPREADSHEET CONFIGURATION ---
const SHEET_ID = PROPS.getProperty('SHEET_ID');

// --- SECURITY CONFIGURATION ---
const HASH_SALT = PROPS.getProperty('HASH_SALT');

// --- GEOFENCING CONFIGURATION ---
const GEOFENCE_RADIUS_MI = 1.0;

// --- TIMING CONFIGURATION ---
const LATE_CLOCK_IN_HOUR = 8;      // 8 AM
const LATE_CLOCK_IN_MINUTE = 5;    // 8:05 AM
const RATE_LIMIT_MINUTES = 20;     // Prevent double clock-ins within 20 minutes

// --- EMAIL CONFIGURATION ---
const INFO_EMAIL = PROPS.getProperty('INFO_EMAIL');
const CC_EMAIL = PROPS.getProperty('CC_EMAIL');

// --- PDF GENERATION CONFIGURATION ---
const LOGO_FILE_ID = PROPS.getProperty('LOGO_FILE_ID');
const PDF_FOLDER_ID = PROPS.getProperty('PDF_FOLDER_ID');
const SEND_PDF_TO_WORKER = false; // Toggle to email PDFs to workers

// --- LOGGING CONFIGURATION ---
const LOG_SHEET = 'Log';

// --- TIMEZONE CONFIGURATION ---
const TIMEZONE = 'America/New_York';