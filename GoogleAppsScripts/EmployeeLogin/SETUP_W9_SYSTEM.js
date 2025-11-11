// ======================================================
// W-9 System Setup Script
// Run this ONCE to set up W-9 columns and configuration
// ======================================================

/**
 * SETUP INSTRUCTIONS:
 * 1. Open this file in Google Apps Script Editor
 * 2. Run setupW9Columns() to add columns to Workers sheet
 * 3. Run createW9Template() to create the W-9 template document
 * 4. Run createW9Folder() to create the Drive folder
 * 5. Run storeW9Configuration() to save IDs to Script Properties
 * 6. Delete this file after setup is complete
 */

/**
 * Step 1: Add W-9 columns to Workers sheet
 */
function setupW9Columns() {
  try {
    Logger.log('📋 Starting W-9 column setup...');
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const workersSheet = ss.getSheetByName('Workers');
    
    if (!workersSheet) {
      throw new Error('Workers sheet not found!');
    }
    
    // Get current headers
    const headers = workersSheet.getRange(1, 1, 1, workersSheet.getLastColumn()).getValues()[0];
    Logger.log(`Current column count: ${headers.length}`);
    
    // W-9 columns to add
    const w9Columns = [
      'W9Status',
      'W9SubmittedDate',
      'W9ApprovedDate',
      'W9ApprovedBy',
      'W9SSN_Last4',
      'W9_PDF_URL'
    ];
    
    // Check which columns already exist
    const existingColumns = [];
    const columnsToAdd = [];
    
    w9Columns.forEach(col => {
      if (headers.indexOf(col) >= 0) {
        existingColumns.push(col);
      } else {
        columnsToAdd.push(col);
      }
    });
    
    if (existingColumns.length > 0) {
      Logger.log(`⚠️ Columns already exist: ${existingColumns.join(', ')}`);
    }
    
    if (columnsToAdd.length === 0) {
      Logger.log('✅ All W-9 columns already exist!');
      return {
        success: true,
        message: 'All W-9 columns already exist',
        existingColumns: existingColumns
      };
    }
    
    // Add new columns
    const nextColumn = headers.length + 1;
    workersSheet.getRange(1, nextColumn, 1, columnsToAdd.length).setValues([columnsToAdd]);
    
    // Format header row
    workersSheet.getRange(1, nextColumn, 1, columnsToAdd.length)
      .setFontWeight('bold')
      .setBackground('#FFC107')
      .setFontColor('#000000');
    
    // Set default value "none" for W9Status in all existing rows
    const lastRow = workersSheet.getLastRow();
    if (lastRow > 1) {
      const w9StatusCol = nextColumn; // First column added is W9Status
      workersSheet.getRange(2, w9StatusCol, lastRow - 1, 1).setValue('none');
    }
    
    Logger.log(`✅ Added ${columnsToAdd.length} W-9 columns: ${columnsToAdd.join(', ')}`);
    Logger.log(`✅ Set default W9Status='none' for ${lastRow - 1} existing workers`);
    
    return {
      success: true,
      message: 'W-9 columns added successfully',
      columnsAdded: columnsToAdd,
      existingColumns: existingColumns,
      workersUpdated: lastRow - 1
    };
    
  } catch (error) {
    Logger.log(`❌ Error: ${error.message}`);
    Logger.log(error.stack);
    throw error;
  }
}

/**
 * Step 2: Create W-9 template document
 */
function createW9Template() {
  try {
    Logger.log('📄 Creating W-9 template document...');
    
    // Create new Google Doc
    const doc = DocumentApp.create('W9_Template_CLS');
    const body = doc.getBody();
    
    // Set margins for single-page fit
    body.setMarginTop(36);      // 0.5 inches
    body.setMarginBottom(36);   // 0.5 inches
    body.setMarginLeft(54);     // 0.75 inches
    body.setMarginRight(54);    // 0.75 inches
    
    // === HEADER ===
    const header = body.appendParagraph('Form W-9');
    header.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    header.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    header.setSpacingAfter(2);
    header.setFontSize(16);
    
    const subtitle = body.appendParagraph('Request for Taxpayer Identification Number and Certification');
    subtitle.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    subtitle.setBold(true);
    subtitle.setFontSize(10);
    subtitle.setSpacingAfter(6);
    
    // === PART I: NAME & BUSINESS INFO (Compact) ===
    const part1 = body.appendTable([
      ['1. Name:', '{{LegalName}}'],
      ['2. Business Name:', '{{BusinessName}}'],
      ['3. Tax Classification:', '{{TaxClassification}}']
    ]);
    
    // Format Part I table
    part1.setBorderWidth(1);
    part1.setColumnWidth(0, 150);
    part1.setColumnWidth(1, 350);
    for (let i = 0; i < 3; i++) {
      part1.getRow(i).getCell(0).setBackgroundColor('#F3F3F3').getChild(0).asParagraph().setBold(true).setFontSize(9);
      part1.getRow(i).getCell(1).getChild(0).asParagraph().setFontSize(9);
    }
    body.appendParagraph('').setSpacingAfter(6);
    
    // === PART II: ADDRESS (Compact) ===
    const part2 = body.appendTable([
      ['Address:', '{{Address}}'],
      ['City, State, ZIP:', '{{City}}, {{State}} {{ZIP}}']
    ]);
    
    // Format Part II table
    part2.setBorderWidth(1);
    part2.setColumnWidth(0, 150);
    part2.setColumnWidth(1, 350);
    for (let i = 0; i < 2; i++) {
      part2.getRow(i).getCell(0).setBackgroundColor('#F3F3F3').getChild(0).asParagraph().setBold(true).setFontSize(9);
      part2.getRow(i).getCell(1).getChild(0).asParagraph().setFontSize(9);
    }
    body.appendParagraph('').setSpacingAfter(6);
    
    // === PART III: TIN ===
    const part3Header = body.appendParagraph('Part I - Taxpayer Identification Number (TIN)');
    part3Header.setBold(true);
    part3Header.setFontSize(10);
    part3Header.setSpacingBefore(0);
    part3Header.setSpacingAfter(3);
    
    const part3 = body.appendTable([
      ['Social Security Number / EIN:', '{{SSN}}']
    ]);
    
    // Format Part III table
    part3.setBorderWidth(1);
    part3.setColumnWidth(0, 200);
    part3.setColumnWidth(1, 300);
    part3.getRow(0).getCell(0).setBackgroundColor('#F3F3F3').getChild(0).asParagraph().setBold(true).setFontSize(9);
    part3.getRow(0).getCell(1).getChild(0).asParagraph().setFontSize(9);
    body.appendParagraph('').setSpacingAfter(6);
    
    // === PART IV: CERTIFICATION (Condensed) ===
    const part4Header = body.appendParagraph('Part II - Certification');
    part4Header.setBold(true);
    part4Header.setFontSize(10);
    part4Header.setSpacingBefore(0);
    part4Header.setSpacingAfter(3);
    
    const certText = 'Under penalties of perjury, I certify that: (1) The number shown is my correct TIN; (2) I am not subject to backup withholding; (3) I am a U.S. citizen or other U.S. person; (4) FATCA code(s) are correct.';
    
    const cert = body.appendParagraph(certText);
    cert.setFontSize(8);
    cert.setSpacingAfter(6);
    cert.setItalic(true);
    
    // Backup withholding status
    const backup = body.appendParagraph('Backup Withholding: {{BackupWithholding}}');
    backup.setFontSize(9);
    backup.setSpacingAfter(8);
    
    // === SIGNATURE SECTION (Compact) ===
    const sigTable = body.appendTable([
      ['Signature:', '{{Signature}}', 'Date:', '{{Date}}']
    ]);
    
    // Format signature table
    sigTable.setBorderWidth(1);
    sigTable.setColumnWidth(0, 80);
    sigTable.setColumnWidth(1, 220);
    sigTable.setColumnWidth(2, 60);
    sigTable.setColumnWidth(3, 140);
    
    sigTable.getRow(0).getCell(0).setBackgroundColor('#F3F3F3').getChild(0).asParagraph().setBold(true).setFontSize(9);
    sigTable.getRow(0).getCell(1).getChild(0).asParagraph().setFontSize(9);
    sigTable.getRow(0).getCell(2).setBackgroundColor('#F3F3F3').getChild(0).asParagraph().setBold(true).setFontSize(9);
    sigTable.getRow(0).getCell(3).getChild(0).asParagraph().setFontSize(9);
    
    // === FOOTER ===
    body.appendParagraph('').setSpacingAfter(6);
    const footer = body.appendParagraph('Carolina Lumpers Service - IRS Form W-9 (Rev. 2024)');
    footer.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    footer.setFontSize(8);
    footer.setItalic(true);
    footer.setForegroundColor('#999999');
    
    doc.saveAndClose();
    
    const templateId = doc.getId();
    const templateUrl = doc.getUrl();
    
    Logger.log(`✅ W-9 template created!`);
    Logger.log(`📄 Template ID: ${templateId}`);
    Logger.log(`🔗 Template URL: ${templateUrl}`);
    Logger.log(`\n⚠️ COPY THIS ID: ${templateId}`);
    
    return {
      success: true,
      templateId: templateId,
      templateUrl: templateUrl,
      message: 'W-9 template created successfully'
    };
    
  } catch (error) {
    Logger.log(`❌ Error: ${error.message}`);
    Logger.log(error.stack);
    throw error;
  }
}

/**
 * Step 3: Create W-9 Drive folder
 */
function createW9Folder() {
  try {
    Logger.log('📁 Creating W9_Forms folder...');
    
    // Check if folder already exists
    const existingFolders = DriveApp.getFoldersByName('W9_Forms');
    
    if (existingFolders.hasNext()) {
      const folder = existingFolders.next();
      const folderId = folder.getId();
      const folderUrl = folder.getUrl();
      
      Logger.log(`⚠️ Folder already exists!`);
      Logger.log(`📁 Folder ID: ${folderId}`);
      Logger.log(`🔗 Folder URL: ${folderUrl}`);
      Logger.log(`\n⚠️ COPY THIS ID: ${folderId}`);
      
      return {
        success: true,
        folderId: folderId,
        folderUrl: folderUrl,
        message: 'W9_Forms folder already exists'
      };
    }
    
    // Create new folder
    const folder = DriveApp.createFolder('W9_Forms');
    const folderId = folder.getId();
    const folderUrl = folder.getUrl();
    
    // Set folder description
    folder.setDescription('Storage for W-9 tax forms submitted by Carolina Lumpers Service contractors');
    
    Logger.log(`✅ W9_Forms folder created!`);
    Logger.log(`📁 Folder ID: ${folderId}`);
    Logger.log(`🔗 Folder URL: ${folderUrl}`);
    Logger.log(`\n⚠️ COPY THIS ID: ${folderId}`);
    
    return {
      success: true,
      folderId: folderId,
      folderUrl: folderUrl,
      message: 'W9_Forms folder created successfully'
    };
    
  } catch (error) {
    Logger.log(`❌ Error: ${error.message}`);
    Logger.log(error.stack);
    throw error;
  }
}

/**
 * Step 4: Store W-9 configuration in Script Properties
 * RUN THIS AFTER running createW9Template() and createW9Folder()
 */
function storeW9Configuration() {
  try {
    Logger.log('💾 Storing W-9 configuration...');
    
    const props = PropertiesService.getScriptProperties();
    
    // Get current values
    const existingTemplateId = props.getProperty('W9_TEMPLATE_ID');
    const existingFolderId = props.getProperty('W9_FOLDER_ID');
    
    Logger.log('\n📋 Current Configuration:');
    Logger.log(`W9_TEMPLATE_ID: ${existingTemplateId || '(not set)'}`);
    Logger.log(`W9_FOLDER_ID: ${existingFolderId || '(not set)'}`);
    
    // Prompt to set values (you'll need to manually edit these after running createW9Template and createW9Folder)
    Logger.log('\n⚠️ MANUAL STEP REQUIRED:');
    Logger.log('1. Run createW9Template() and copy the Template ID');
    Logger.log('2. Run createW9Folder() and copy the Folder ID');
    Logger.log('3. Edit this function and uncomment the lines below:');
    Logger.log('4. Replace YOUR_TEMPLATE_ID and YOUR_FOLDER_ID with actual values');
    Logger.log('5. Run this function again');
    
    // UNCOMMENT AND EDIT THESE LINES AFTER GETTING IDs:
    // props.setProperty('W9_TEMPLATE_ID', 'YOUR_TEMPLATE_ID_HERE');
    // props.setProperty('W9_FOLDER_ID', 'YOUR_FOLDER_ID_HERE');
    
    // Example (EDIT WITH YOUR ACTUAL IDs):
    // props.setProperty('W9_TEMPLATE_ID', '1abc123xyz456def789ghi');
    // props.setProperty('W9_FOLDER_ID', '1xyz789abc456def123ghi');
    
    Logger.log('\n✅ Once you uncomment and run, configuration will be saved!');
    
    return {
      success: true,
      message: 'Please edit function with actual IDs and run again',
      currentTemplateId: existingTemplateId,
      currentFolderId: existingFolderId
    };
    
  } catch (error) {
    Logger.log(`❌ Error: ${error.message}`);
    Logger.log(error.stack);
    throw error;
  }
}

/**
 * Helper: View current W-9 configuration
 */
function viewW9Configuration() {
  const props = PropertiesService.getScriptProperties();
  
  const config = {
    SHEET_ID: props.getProperty('SHEET_ID'),
    W9_TEMPLATE_ID: props.getProperty('W9_TEMPLATE_ID'),
    W9_FOLDER_ID: props.getProperty('W9_FOLDER_ID'),
    HASH_SALT: props.getProperty('HASH_SALT') ? '(set)' : '(not set)',
    INFO_EMAIL: props.getProperty('INFO_EMAIL'),
    CC_EMAIL: props.getProperty('CC_EMAIL')
  };
  
  Logger.log('📋 Current Script Properties Configuration:');
  Logger.log(JSON.stringify(config, null, 2));
  
  return config;
}

/**
 * All-in-one setup (run this if you want to do everything at once)
 */
function runFullW9Setup() {
  Logger.log('🚀 Starting full W-9 setup...\n');
  
  // Step 1: Add columns
  Logger.log('=== STEP 1: Adding W-9 columns to Workers sheet ===');
  const columnsResult = setupW9Columns();
  Logger.log(JSON.stringify(columnsResult, null, 2));
  Logger.log('');
  
  // Step 2: Create template
  Logger.log('=== STEP 2: Creating W-9 template document ===');
  const templateResult = createW9Template();
  Logger.log(JSON.stringify(templateResult, null, 2));
  Logger.log('');
  
  // Step 3: Create folder
  Logger.log('=== STEP 3: Creating W9_Forms Drive folder ===');
  const folderResult = createW9Folder();
  Logger.log(JSON.stringify(folderResult, null, 2));
  Logger.log('');
  
  // Step 4: Store configuration
  Logger.log('=== STEP 4: Storing configuration ===');
  const props = PropertiesService.getScriptProperties();
  props.setProperty('W9_TEMPLATE_ID', templateResult.templateId);
  props.setProperty('W9_FOLDER_ID', folderResult.folderId);
  Logger.log('✅ Configuration saved to Script Properties!');
  Logger.log('');
  
  // View final configuration
  Logger.log('=== FINAL CONFIGURATION ===');
  viewW9Configuration();
  
  Logger.log('\n🎉 W-9 setup complete!');
  Logger.log('⚠️ Remember to delete SETUP_W9_SYSTEM.js after confirming everything works!');
}
