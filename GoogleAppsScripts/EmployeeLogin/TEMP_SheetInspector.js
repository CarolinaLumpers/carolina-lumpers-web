/**
 * TEMPORARY UTILITY FUNCTION
 * Lists all sheet tabs and their column headers from CLS_Hub_Backend
 * 
 * HOW TO USE:
 * 1. Copy this function to Apps Script editor
 * 2. Run inspectSpreadsheet() from the editor
 * 3. Check the execution log for results
 * 4. Delete this file when done
 */

function inspectSpreadsheet() {
  const SHEET_ID = '14dO3qB3Oa-N7eX9EcBTStydvyJaHprgi3_dQJsTvRx4';
  
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheets = ss.getSheets();
    
    Logger.log('='.repeat(80));
    Logger.log('SPREADSHEET: ' + ss.getName());
    Logger.log('URL: ' + ss.getUrl());
    Logger.log('TOTAL SHEETS: ' + sheets.length);
    Logger.log('='.repeat(80));
    Logger.log('');
    
    sheets.forEach((sheet, index) => {
      const sheetName = sheet.getName();
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();
      
      Logger.log(`[${index + 1}] SHEET: "${sheetName}"`);
      Logger.log(`    Rows: ${lastRow} | Columns: ${lastCol}`);
      
      if (lastRow > 0 && lastCol > 0) {
        // Get header row (row 1)
        const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        
        Logger.log('    HEADERS:');
        headers.forEach((header, colIndex) => {
          const columnLetter = getColumnLetter(colIndex + 1);
          Logger.log(`      ${columnLetter}: "${header}"`);
        });
      } else {
        Logger.log('    (Empty sheet)');
      }
      
      Logger.log('');
    });
    
    Logger.log('='.repeat(80));
    Logger.log('INSPECTION COMPLETE');
    Logger.log('='.repeat(80));
    
    // Also return as object for easier programmatic access
    const result = sheets.map(sheet => {
      const lastCol = sheet.getLastColumn();
      const headers = lastCol > 0 
        ? sheet.getRange(1, 1, 1, lastCol).getValues()[0]
        : [];
      
      return {
        name: sheet.getName(),
        rows: sheet.getLastRow(),
        columns: sheet.getLastColumn(),
        headers: headers
      };
    });
    
    return result;
    
  } catch (error) {
    Logger.log('ERROR: ' + error.message);
    Logger.log('Stack: ' + error.stack);
    throw error;
  }
}

/**
 * Helper function to convert column number to letter (A, B, C, etc.)
 */
function getColumnLetter(columnNumber) {
  let letter = '';
  while (columnNumber > 0) {
    const remainder = (columnNumber - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    columnNumber = Math.floor((columnNumber - 1) / 26);
  }
  return letter;
}

/**
 * ALTERNATIVE: Get specific sheet details
 * Usage: getSheetDetails('ClockIn')
 */
function getSheetDetails(sheetName) {
  const SHEET_ID = '1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk';
  
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      Logger.log(`Sheet "${sheetName}" not found!`);
      return null;
    }
    
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    const headers = lastCol > 0 
      ? sheet.getRange(1, 1, 1, lastCol).getValues()[0]
      : [];
    
    Logger.log(`SHEET: "${sheetName}"`);
    Logger.log(`Rows: ${lastRow} | Columns: ${lastCol}`);
    Logger.log('HEADERS:');
    headers.forEach((header, index) => {
      Logger.log(`  ${getColumnLetter(index + 1)}: "${header}"`);
    });
    
    return {
      name: sheetName,
      rows: lastRow,
      columns: lastCol,
      headers: headers
    };
    
  } catch (error) {
    Logger.log('ERROR: ' + error.message);
    throw error;
  }
}

/**
 * ALTERNATIVE: Export to formatted markdown
 */
function exportSheetsToMarkdown() {
  const SHEET_ID = '1U8hSNREN5fEhskp0UM-Z80iiW39beaOj3oIsaLZyFzk';
  
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheets = ss.getSheets();
    
    let markdown = '# CLS_Hub_Backend Sheet Structure\n\n';
    markdown += `**Spreadsheet ID**: \`${SHEET_ID}\`\n`;
    markdown += `**Total Sheets**: ${sheets.length}\n\n`;
    markdown += '---\n\n';
    
    sheets.forEach((sheet, index) => {
      const sheetName = sheet.getName();
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();
      
      markdown += `## ${index + 1}. ${sheetName}\n\n`;
      markdown += `- **Rows**: ${lastRow}\n`;
      markdown += `- **Columns**: ${lastCol}\n\n`;
      
      if (lastRow > 0 && lastCol > 0) {
        const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        
        markdown += '### Column Headers\n\n';
        markdown += '| Column | Header |\n';
        markdown += '|--------|--------|\n';
        
        headers.forEach((header, colIndex) => {
          const columnLetter = getColumnLetter(colIndex + 1);
          markdown += `| ${columnLetter} | ${header} |\n`;
        });
        
        markdown += '\n';
      } else {
        markdown += '*Empty sheet*\n\n';
      }
      
      markdown += '---\n\n';
    });
    
    Logger.log(markdown);
    return markdown;
    
  } catch (error) {
    Logger.log('ERROR: ' + error.message);
    throw error;
  }
}
