/**
 * DEBUG: Test role lookup for your account
 * Run this in Apps Script editor to see what's happening
 */
function debugMyRole() {
  const workerId = 'SG-001-84c9f7b'; // Your WorkerID from screenshot
  
  Logger.log('=== DEBUG ROLE LOOKUP ===');
  Logger.log('Looking up workerId: ' + workerId);
  
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName('Workers');
  const data = sh.getDataRange().getValues();
  const headers = data[0].map(String);
  
  Logger.log('Headers: ' + JSON.stringify(headers));
  
  const iWorker = headers.indexOf('WorkerID');
  const iRole = headers.indexOf('App Access');
  
  Logger.log('WorkerID column index: ' + iWorker);
  Logger.log('App Access column index: ' + iRole);
  
  if (iWorker < 0) {
    Logger.log('❌ WorkerID column not found!');
    return;
  }
  
  if (iRole < 0) {
    Logger.log('❌ App Access column not found!');
    return;
  }
  
  // Search for your row
  let found = false;
  for (let r = 1; r < data.length; r++) {
    const sheetWorkerId = String(data[r][iWorker]);
    const sheetRole = String(data[r][iRole]);
    
    if (sheetWorkerId === workerId) {
      found = true;
      Logger.log('✅ FOUND YOUR ROW (row ' + (r + 1) + ')');
      Logger.log('   WorkerID in sheet: "' + sheetWorkerId + '"');
      Logger.log('   App Access value: "' + sheetRole + '"');
      Logger.log('   Exact match: ' + (sheetWorkerId === workerId));
      
      // Show all columns for this row
      Logger.log('   Full row data:');
      for (let c = 0; c < headers.length; c++) {
        Logger.log('     ' + headers[c] + ': ' + data[r][c]);
      }
      break;
    }
  }
  
  if (!found) {
    Logger.log('❌ WorkerID not found in sheet!');
    Logger.log('Checking all WorkerIDs in sheet:');
    for (let r = 1; r < Math.min(data.length, 20); r++) {
      Logger.log('  Row ' + (r + 1) + ': "' + String(data[r][iWorker]) + '"');
    }
  }
  
  // Test getRole_ function
  Logger.log('\n=== TESTING getRole_() ===');
  const role = getRole_(workerId);
  Logger.log('getRole_(' + workerId + ') returned: "' + role + '"');
}
