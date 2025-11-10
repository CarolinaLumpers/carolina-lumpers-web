// ======================================================
// Project: CLS Employee Login System
// File: CLS_EmployeeLogin_Utils.js
// Description: Utility functions for date formatting, logging,
// translations, and helper calculations.
// ======================================================

// ======================================================
//  DATE & TIME UTILITIES
// ======================================================
function getWeekEndSaturdayISO_(range) {
  const now = new Date(Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss"));
  const d = new Date(now);
  const dow = d.getDay();
  const delta = 6 - dow; // Days to Saturday
  d.setDate(d.getDate() + delta);
  if (range === 'previous') d.setDate(d.getDate() - 7);
  return Utilities.formatDate(d, TIMEZONE, 'yyyy-MM-dd');
}

function getWeekStartFromEnd_(weekEndISO) {
  const end = new Date(weekEndISO + 'T00:00:00');
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return Utilities.formatDate(start, TIMEZONE, 'yyyy-MM-dd');
}

function normalizeISO_(v) {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d) ? '' : Utilities.formatDate(d, TIMEZONE, 'yyyy-MM-dd');
}

function toNumberSafe_(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function round2_(v) {
  return Math.round(v * 100) / 100;
}

function formatTime_(timeValue) {
  if (!timeValue) return '';
  
  // If it's already a formatted string (return as-is)
  if (typeof timeValue === 'string') {
    return timeValue;
  }
  
  // If it's a Date object, format it
  if (timeValue instanceof Date && !isNaN(timeValue.getTime())) {
    return Utilities.formatDate(timeValue, TIMEZONE, 'hh:mm:ss a');
  }
  
  // Try to convert to Date if it's a timestamp or date-like value
  try {
    const t = new Date(timeValue);
    if (!isNaN(t.getTime())) {
      return Utilities.formatDate(t, TIMEZONE, 'hh:mm:ss a');
    }
  } catch (e) {
    // If conversion fails, return as string
    return String(timeValue);
  }
  
  return '';
}

// ======================================================
//  GEOLOCATION UTILITIES
// ======================================================
function getDistanceMi(lat1, lng1, lat2, lng2) {
  const R = 3958.8; // miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ======================================================
//  CRYPTOGRAPHY UTILITIES
// ======================================================
function hashPassword(password) {
  const raw = HASH_SALT + password;
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return Utilities.base64Encode(bytes);
}

// ======================================================
//  LOGGING UTILITIES
// ======================================================
/**
 * @deprecated Legacy logging function - DO NOT USE in production code
 * Use TT_LOGGER from CLS_EmployeeLogin_Logger.js instead
 * This function is kept only for backward compatibility with TestTools.js
 */
function logEvent_(event, details) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sh = ss.getSheetByName(LOG_SHEET);
    if (!sh) {
      sh = ss.insertSheet(LOG_SHEET);
      sh.appendRow(['Timestamp', 'Event', 'Details']);
    }
    const payload = (details && typeof details === 'object')
      ? JSON.stringify(details)
      : String(details || '');
    sh.appendRow([new Date(), String(event), payload]);
  } catch (err) {
    console.error('logEvent_ failed:', err);
  }
}

// ======================================================
//  MULTILINGUAL TRANSLATION UTILITIES
// ======================================================
function translateMsg_(type, lang, now) {
  const formattedTime = Utilities.formatDate(now, TIMEZONE, 'h:mm a');
  lang = (lang || 'en').toLowerCase();

  const messages = {
    en: {
      ontime: `✅ Clock-in successful!`,
      mild: `✅ Clock-in at ${formattedTime} — just a few minutes late.`,
      moderate: `⚠️ Clock-in at ${formattedTime} — marked late.`,
      severe: `⏰ Clock-in at ${formattedTime} — over 30 minutes late.`
    },
    es: {
      ontime: `✅ Registro exitoso!`,
      mild: `✅ Registro a las ${formattedTime} — unos minutos tarde.`,
      moderate: `⚠️ Registro a las ${formattedTime} — marcado como tarde.`,
      severe: `⏰ Registro a las ${formattedTime} — más de 30 minutos tarde.`
    },
    pt: {
      ontime: `✅ Registro bem-sucedido!`,
      mild: `✅ Registro às ${formattedTime} — apenas alguns minutos de atraso.`,
      moderate: `⚠️ Registro às ${formattedTime} — marcado como atrasado.`,
      severe: `⏰ Registro às ${formattedTime} — mais de 30 minutos de atraso.`
    }
  };

  // Default to English if language not found
  return messages[lang]?.[type] || messages.en[type];
}

// ======================================================
//  GEOCODING UTILITIES
// ======================================================
// ⚠️ NOTE: Clock-in function NO LONGER geocodes during clock-in (too slow)
// Run initGeocode() manually from Apps Script editor to populate missing coordinates
// Or set up a daily trigger to run this function automatically

function initGeocode() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Clients');
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idxAddr = headers.indexOf('JobAddress');
  const idxLat = headers.indexOf('Latitude');
  const idxLng = headers.indexOf('Longitude');

  if (idxAddr < 0 || idxLat < 0 || idxLng < 0) {
    return '❌ Clients sheet missing JobAddress/Latitude/Longitude columns.';
  }

  let geocoded = 0;
  for (let i = 1; i < rows.length; i++) {
    const addr = rows[i][idxAddr];
    const lat = rows[i][idxLat];
    const lng = rows[i][idxLng];
    if (addr && (!lat || !lng || lat === '' || lng === '')) {
      try {
        const geo = Maps.newGeocoder().geocode(addr);
        if (geo.status === 'OK' && geo.results.length > 0) {
          const loc = geo.results[0].geometry.location;
          sheet.getRange(i + 1, idxLat + 1).setValue(loc.lat);
          sheet.getRange(i + 1, idxLng + 1).setValue(loc.lng);
          geocoded++;
          Logger.log(`✅ Geocoded: ${addr} → ${loc.lat}, ${loc.lng}`);
        }
      } catch (err) {
        Logger.log('Geocode failed for ' + addr + ': ' + err);
      }
    }
  }
  return `✅ Geocoding completed. ${geocoded} locations updated.`;
}