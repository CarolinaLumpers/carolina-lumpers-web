/**
 * Test function to verify net income calculation from Invoice and Payroll LineItems
 * Run this from the Apps Script editor to see if the calculation works correctly.
 */
function testNetIncomeCalculation() {
  Logger.log("🧪 Testing Net Income Calculation...\n");
  
  try {
    // Test the getWeeklyFinancialsFromSheet function
    const financials = getWeeklyFinancialsFromSheet();
    
    if (!financials || financials.length === 0) {
      Logger.log("⚠️ No financial data returned. Check if Invoice LineItems and Payroll LineItems sheets exist and have data.");
      return;
    }
    
    Logger.log(`✅ Found ${financials.length} week period(s) with data:\n`);
    
    // Display results in a formatted table
    financials.forEach((week, index) => {
      Logger.log(`Week ${index + 1}:`);
      Logger.log(`  📅 Period: ${week.WeekPeriod}`);
      Logger.log(`  💰 Net Income: $${week.NetIncome.toFixed(2)}`);
      Logger.log(`  👥 Steve's 1/3: $${(week.NetIncome / 3).toFixed(2)}`);
      Logger.log(`  👥 Daniela's 1/3: $${(week.NetIncome / 3).toFixed(2)}`);
      Logger.log(`  👥 Carlos's 1/3: $${(week.NetIncome / 3).toFixed(2)}\n`);
    });
    
    // Test with a specific week period (use a real date from your data)
    Logger.log("\n🎯 Testing with specific week periods:");
    
    if (financials.length > 0) {
      const testWeek = financials[0].WeekPeriod;
      Logger.log(`\nLooking for week: ${testWeek}`);
      
      const found = financials.find(row => row.WeekPeriod === testWeek);
      if (found) {
        Logger.log(`✅ Found matching week with Net Income: $${found.NetIncome.toFixed(2)}`);
        
        // Simulate what would be added to Steve's bill
        const steveDistribution = parseFloat((found.NetIncome / 3).toFixed(2));
        Logger.log(`\n📋 Steve's Bill Line Item would be:`);
        Logger.log(`   Description: "${testWeek} | Steve's 1/3 Share of $${found.NetIncome} Net Income"`);
        Logger.log(`   Amount: $${steveDistribution}`);
        Logger.log(`   Account: Partner Distributions:Steve Distributions (148)`);
        
        // Simulate what would be added to Daniela's bill
        const danielaDistribution = parseFloat((found.NetIncome / 3).toFixed(2));
        Logger.log(`\n📋 Daniela's Bill Line Item would be:`);
        Logger.log(`   Description: "${testWeek} | Daniela's 1/3 Share of $${found.NetIncome} Net Income"`);
        Logger.log(`   Amount: $${danielaDistribution}`);
        Logger.log(`   Account: Partner Distributions:Daniela Distributions (149)`);
      } else {
        Logger.log(`❌ Could not find matching week in results`);
      }
    }
    
    Logger.log("\n✅ Test completed successfully!");
    
  } catch (error) {
    Logger.log(`❌ Test failed with error: ${error.message}`);
    Logger.log(`Stack trace: ${error.stack}`);
  }
}

/**
 * Test with a specific week period date
 * Usage: testSpecificWeek("2025-01-18") or testSpecificWeek("2025-11-23")
 */
function testSpecificWeek(weekPeriod) {
  Logger.log(`🧪 Testing specific week: ${weekPeriod}\n`);
  
  try {
    const financials = getWeeklyFinancialsFromSheet();
    const found = financials.find(row => row.WeekPeriod === weekPeriod);
    
    if (found) {
      Logger.log(`✅ Week ${weekPeriod} found!`);
      Logger.log(`💰 Net Income: $${found.NetIncome.toFixed(2)}`);
      Logger.log(`👥 Each partner gets: $${(found.NetIncome / 3).toFixed(2)}`);
    } else {
      Logger.log(`❌ Week ${weekPeriod} not found in data`);
      Logger.log(`\nAvailable weeks:`);
      financials.forEach(w => Logger.log(`  - ${w.WeekPeriod}`));
    }
    
  } catch (error) {
    Logger.log(`❌ Error: ${error.message}`);
  }
}

/**
 * Test to verify Invoice and Payroll sheets are accessible
 */
function testSheetAccess() {
  Logger.log("🧪 Testing Sheet Access...\n");
  
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    Logger.log(`✅ Spreadsheet opened: ${ss.getName()}`);
    
    // Test Invoice LineItems
    const invoiceSheet = ss.getSheetByName("Invoice LineItems");
    if (invoiceSheet) {
      const invoiceRows = invoiceSheet.getLastRow();
      Logger.log(`✅ Invoice LineItems sheet found: ${invoiceRows} rows`);
    } else {
      Logger.log(`❌ Invoice LineItems sheet NOT found`);
    }
    
    // Test Payroll LineItems
    const payrollSheet = ss.getSheetByName(CONFIG.SHEETS.PAYROLL_LINE_ITEMS);
    if (payrollSheet) {
      const payrollRows = payrollSheet.getLastRow();
      Logger.log(`✅ Payroll LineItems sheet found: ${payrollRows} rows`);
    } else {
      Logger.log(`❌ Payroll LineItems sheet NOT found`);
    }
    
    Logger.log("\n✅ Sheet access test completed!");
    
  } catch (error) {
    Logger.log(`❌ Sheet access failed: ${error.message}`);
  }
}
