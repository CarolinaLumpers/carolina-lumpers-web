/**
 * DEBUG: Test login response structure
 * Run this to see exactly what the login endpoint returns
 */
function debugLoginResponse() {
  const testEmail = 's.garay@CarolinaLumpers.com'; // Your email
  const testPassword = ''; // Leave empty - will fail auth but show structure
  
  Logger.log('=== DEBUG LOGIN RESPONSE ===');
  
  // Simulate login request
  const mockEvent = {
    parameter: {
      email: testEmail,
      password: 'testpassword123', // Wrong password on purpose
      device: 'DEBUG - Test'
    }
  };
  
  // Test loginUser function
  Logger.log('\n1. Testing loginUser() function:');
  const authResult = loginUser(mockEvent);
  Logger.log('loginUser returned:');
  Logger.log(JSON.stringify(authResult, null, 2));
  
  // Test getRole_ function
  Logger.log('\n2. Testing getRole_() function:');
  const workerId = 'SG-001-844c9f7b';
  const role = getRole_(workerId);
  Logger.log(`getRole_('${workerId}') = "${role}"`);
  
  // Test full login flow (simulating Main.js)
  Logger.log('\n3. Testing FULL login response (as Main.js would build it):');
  
  // Get a valid worker for testing
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Workers');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const emailIdx = headers.indexOf('Email');
  const idIdx = headers.indexOf('WorkerID');
  const nameIdx = headers.indexOf('Display Name');
  const w9StatusIdx = headers.indexOf('W9Status');
  
  // Find your row
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][emailIdx]).toLowerCase() === testEmail.toLowerCase()) {
      const workerId = data[i][idIdx];
      const displayName = data[i][nameIdx];
      const w9Status = data[i][w9StatusIdx];
      
      // Build response EXACTLY as Main.js does (lines 69-82)
      const fullResponse = {
        success: true,
        workerId: workerId,
        displayName: displayName,
        email: testEmail,
        w9Status: w9Status || 'none',
        w9SubmittedDate: '',
        w9ApprovedDate: '',
        w9SsnLast4: '',
        w9PdfUrl: '',
        role: getRole_(workerId),  // ← This is the critical line
        device: 'DEBUG - Test'
      };
      
      Logger.log('Full login response object:');
      Logger.log(JSON.stringify(fullResponse, null, 2));
      
      Logger.log('\n4. Checking if role field is present:');
      Logger.log(`fullResponse.role = "${fullResponse.role}"`);
      Logger.log(`typeof fullResponse.role = ${typeof fullResponse.role}`);
      Logger.log(`fullResponse.hasOwnProperty('role') = ${fullResponse.hasOwnProperty('role')}`);
      
      break;
    }
  }
  
  Logger.log('\n=== END DEBUG ===');
}
