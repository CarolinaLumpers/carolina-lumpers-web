// ======================================================
// Project: CLS Employee Login System
// File: CLS_EmployeeLogin_Config.js
// Description: Global configuration constants and settings
// for the employee login and clock-in system.
// ======================================================

// --- SPREADSHEET CONFIGURATION ---
const SHEET_ID = '1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk';

// --- SECURITY CONFIGURATION ---
const HASH_SALT = 'CLS2025';

// --- GEOFENCING CONFIGURATION ---
const GEOFENCE_RADIUS_MI = 0.3;

// --- TIMING CONFIGURATION ---
const LATE_CLOCK_IN_HOUR = 8;      // 8 AM
const LATE_CLOCK_IN_MINUTE = 5;    // 8:05 AM
const RATE_LIMIT_MINUTES = 20;     // Prevent double clock-ins within 20 minutes

// --- EMAIL CONFIGURATION ---
const INFO_EMAIL = 'info@carolinalumpers.com';
const CC_EMAIL = 's.garay@carolinalumpers.com';

// --- PDF GENERATION CONFIGURATION ---
const LOGO_FILE_ID = '1JWcy02cP-iRj2LgJPsFE6v7w2u5WaRtL';
const PDF_FOLDER_ID = '1rIyse0m8_vZkwkp-jlllwKuo85JFMeBb';
const SEND_PDF_TO_WORKER = false; // Toggle to email PDFs to workers

// --- LOGGING CONFIGURATION ---
const LOG_SHEET = 'Log';

// --- TIMEZONE CONFIGURATION ---
const TIMEZONE = 'America/New_York';