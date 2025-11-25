/**
 * Main function to process payroll and post bills to QuickBooks.
 * @param {string} weekPeriod - The week period to process (in "yyyy-MM-dd" format).
 * Dependencies: getActiveWorkers, mapWorkersById, getPayrollLineItems, 
 *               formatDateYYYYMMDD, parseDate, groupLineItemsByWorker, 
 *               buildBillPayloads, findExistingBill, callQBOApi, Logger, CONFIG
 */
function processPayroll(weekPeriod) {
  const summary = { success: true, weekPeriod: '', bills: [], errors: [], totalAmount: 0 };
  
  try {
    Logger.log("🚀 Starting Payroll Processing...");

    const workers = getActiveWorkers();
    const workerLookup = mapWorkersById(workers);

    let lineItems = getPayrollLineItems();
    if (!lineItems.length) {
      Logger.log("❌ No payroll line items found");
      summary.success = false;
      summary.errors.push("No payroll line items found");
      return summary;
    }

    const itemCols = CONFIG.COLUMNS.PAYROLL_LINE_ITEMS;
    const targetWeekPeriod = formatDateYYYYMMDD(parseDate(weekPeriod));
    summary.weekPeriod = targetWeekPeriod;

    lineItems = lineItems.filter(item =>
      formatDateYYYYMMDD(parseDate(item[itemCols.WEEK_PERIOD])) === targetWeekPeriod
    );
    
    if (!lineItems.length) {
      Logger.log(`❌ No payroll line items for ${targetWeekPeriod}`);
      summary.success = false;
      summary.errors.push(`No payroll line items for ${targetWeekPeriod}`);
      return summary;
    }

    const groupedByWorker = groupLineItemsByWorker(lineItems);
    const billPayloads = buildBillPayloads(groupedByWorker, workerLookup, targetWeekPeriod);
    
    // Add owner distribution bills even if they have no payroll line items
    const ownerBills = createOwnerDistributionBills(targetWeekPeriod, workerLookup);
    billPayloads.push(...ownerBills);

    Logger.log(`📋 Processing ${billPayloads.length} total bills (${billPayloads.length - ownerBills.length} workers + ${ownerBills.length} owners)`);

    for (const fullPayload of billPayloads) {
      try {
        const existingBill = findExistingBill(fullPayload.DocNumber);
        const action = existingBill ? 'updated' : 'created';
        
        if (existingBill) {
          fullPayload.Id = existingBill.Id;
          fullPayload.SyncToken = existingBill.SyncToken;
          const qboResponse = callQBOApi(`/bill`, 'POST', fullPayload);
          Logger.log(`✅ Bill updated: ${fullPayload.VendorRef.name} - $${fullPayload.TotalAmt}`);
        } else {
          const qboResponse = callQBOApi(`/bill`, 'POST', fullPayload);
          Logger.log(`✅ Bill created: ${fullPayload.VendorRef.name} - $${fullPayload.TotalAmt}`);
        }
        
        // Add to summary
        summary.bills.push({
          workerName: fullPayload.VendorRef.name,
          checkNumber: fullPayload.DocNumber,
          amount: fullPayload.TotalAmt,
          action: action
        });
        summary.totalAmount += fullPayload.TotalAmt;
        
      } catch (apiErr) {
        Logger.log(`❌ API Error for ${fullPayload.VendorRef.name}: ${apiErr.message}`);
        summary.errors.push(`${fullPayload.VendorRef.name}: ${apiErr.message}`);
      }
    }
    
    return summary;
    
  } catch (err) {
    Logger.log(`❌ processPayroll() Error: ${err.message}`);
    summary.success = false;
    summary.errors.push(err.message);
    return summary;
  }
}

/**
 * Calculates net income from Invoice LineItems minus Payroll LineItems for each week period.
 * @returns {Array} - Array of objects with WeekPeriod and NetIncome.
 */
function getWeeklyFinancialsFromSheet() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    
    // Get Invoice LineItems
    const invoiceSheet = ss.getSheetByName("Invoice LineItems");
    const payrollSheet = ss.getSheetByName(CONFIG.SHEETS.PAYROLL_LINE_ITEMS);
    
    if (!invoiceSheet || !payrollSheet) {
      Logger.log("❌ Missing Invoice LineItems or Payroll LineItems sheet");
      return [];
    }
    
    const invoiceData = invoiceSheet.getDataRange().getValues();
    const payrollData = payrollSheet.getDataRange().getValues();
    
    if (invoiceData.length < 2 || payrollData.length < 2) {
      Logger.log("⚠️ No data in Invoice or Payroll LineItems");
      return [];
    }
    
    // Parse Invoice LineItems
    const invoiceHeaders = invoiceData[0];
    const iWeekPeriod = invoiceHeaders.indexOf("Week Period");
    const iInvoiceAmount = invoiceHeaders.indexOf("Invoice Amount");
    
    // Group invoice amounts by week period
    const invoiceByWeek = {};
    for (let i = 1; i < invoiceData.length; i++) {
      const weekPeriod = formatDateYYYYMMDD(parseDate(invoiceData[i][iWeekPeriod]));
      const amount = parseFloat(invoiceData[i][iInvoiceAmount]) || 0;
      
      if (!invoiceByWeek[weekPeriod]) {
        invoiceByWeek[weekPeriod] = 0;
      }
      invoiceByWeek[weekPeriod] += amount;
    }
    
    // Parse Payroll LineItems
    const payrollHeaders = payrollData[0];
    const pWeekPeriod = payrollHeaders.indexOf(CONFIG.COLUMNS.PAYROLL_LINE_ITEMS.WEEK_PERIOD);
    const pCheckAmount = payrollHeaders.indexOf(CONFIG.COLUMNS.PAYROLL_LINE_ITEMS.CHECK_AMOUNT);
    
    // Group payroll amounts by week period
    const payrollByWeek = {};
    for (let i = 1; i < payrollData.length; i++) {
      const weekPeriod = formatDateYYYYMMDD(parseDate(payrollData[i][pWeekPeriod]));
      const amount = parseFloat(payrollData[i][pCheckAmount]) || 0;
      
      if (!payrollByWeek[weekPeriod]) {
        payrollByWeek[weekPeriod] = 0;
      }
      payrollByWeek[weekPeriod] += amount;
    }
    
    // Calculate net income for each week
    const allWeeks = new Set([...Object.keys(invoiceByWeek), ...Object.keys(payrollByWeek)]);
    const financials = [];
    
    allWeeks.forEach(weekPeriod => {
      const invoiceTotal = invoiceByWeek[weekPeriod] || 0;
      const payrollTotal = payrollByWeek[weekPeriod] || 0;
      const netIncome = invoiceTotal - payrollTotal;
      
      financials.push({
        WeekPeriod: weekPeriod,
        NetIncome: parseFloat(netIncome.toFixed(2))
      });
      
      Logger.log(`📊 Week ${weekPeriod}: Invoice=$${invoiceTotal.toFixed(2)}, Payroll=$${payrollTotal.toFixed(2)}, Net=$${netIncome.toFixed(2)}`);
    });
    
    return financials;
  } catch (err) {
    Logger.log(`❌ Error calculating weekly financials: ${err.message}`);
    return [];
  }
}


/**
 * Searches for an existing bill by DocNumber.
 * @param {string} docNumber - The document number of the bill.
 * @returns {object|null} - The existing bill if found, otherwise null.
 * Dependencies: callQBOApi, Logger
 */
function findExistingBill(docNumber) {
  const query = `SELECT * FROM Bill WHERE DocNumber = '${docNumber}'`;
  const response = callQBOApi(`/query?query=${encodeURIComponent(query)}`, 'GET');
  if (response && response.QueryResponse && response.QueryResponse.Bill && response.QueryResponse.Bill.length > 0) {
    return response.QueryResponse.Bill[0];
  }
  return null;
}

/**
 * Groups an array of line items by their WorkerID into an object.
 * @param {Array} lineItems - The payroll line items.
 * @returns {Object} - Grouped line items by worker ID.
 * Dependencies: CONFIG
 */
function groupLineItemsByWorker(lineItems) {
  const itemCols = CONFIG.COLUMNS.PAYROLL_LINE_ITEMS;
  return lineItems.reduce((grouped, item) => {
    const workerId = item[itemCols.WORKER_ID];
    if (!grouped[workerId]) {
      grouped[workerId] = [];
    }
    grouped[workerId].push(item);
    return grouped;
  }, {});
}

/**
 * Creates distribution-only bills for owners (Steve and Daniela) if they don't have payroll entries.
 * @param {string} weekPeriod - The week period (yyyy-MM-dd).
 * @param {Object} workerLookup - Lookup table for worker details.
 * @returns {Array} - Array of owner distribution bill payloads.
 */
function createOwnerDistributionBills(weekPeriod, workerLookup) {
  const billPayloads = [];
  const weeklyFinancials = getWeeklyFinancialsFromSheet();
  const thisWeek = weeklyFinancials.find(row => row.WeekPeriod === weekPeriod);
  
  if (!thisWeek || isNaN(thisWeek.NetIncome)) {
    Logger.log("⚠️ No valid net income for owner distributions");
    return billPayloads;
  }
  
  const distAmount = parseFloat((thisWeek.NetIncome / 3).toFixed(2));
  const txnDate = weekPeriod;
  const dueDate = formatDateYYYYMMDD(getNextFriday(parseDate(txnDate)));
  
  // Steve's distribution bill
  const steveId = "SG-001-844c9f7b";
  if (workerLookup[steveId] && workerLookup[steveId].qboVendorId) {
    const steveCheckNumber = `${steveId}-${weekPeriod}`;
    
    billPayloads.push({
      TxnDate: txnDate,
      DueDate: dueDate,
      VendorRef: { value: workerLookup[steveId].qboVendorId, name: workerLookup[steveId].displayName },
      DocNumber: steveCheckNumber,
      PrivateNote: steveCheckNumber,
      Line: [{
        LineNum: 1,
        Description: `${txnDate} | Steve's 1/3 Share of $${thisWeek.NetIncome} Net Income`,
        Amount: distAmount,
        DetailType: "AccountBasedExpenseLineDetail",
        AccountBasedExpenseLineDetail: {
          AccountRef: { value: "148", name: "Partner Distributions:Steve Distributions" },
          BillableStatus: "NotBillable",
          TaxCodeRef: { value: "NON" }
        }
      }],
      TotalAmt: distAmount,
      CurrencyRef: { value: "USD", name: "United States Dollar" },
      APAccountRef: { value: "7", name: "Accounts Payable (A/P)" }
    });
    
    Logger.log(`✅ Created distribution bill for Steve: $${distAmount}`);
  }
  
  // Daniela's distribution bill
  const danielaId = "DMR-002-5c6334ca";
  if (workerLookup[danielaId] && workerLookup[danielaId].qboVendorId) {
    const danielaCheckNumber = `${danielaId}-${weekPeriod}`;
    
    billPayloads.push({
      TxnDate: txnDate,
      DueDate: dueDate,
      VendorRef: { value: workerLookup[danielaId].qboVendorId, name: workerLookup[danielaId].displayName },
      DocNumber: danielaCheckNumber,
      PrivateNote: danielaCheckNumber,
      Line: [{
        LineNum: 1,
        Description: `${txnDate} | Daniela's 1/3 Share of $${thisWeek.NetIncome} Net Income`,
        Amount: distAmount,
        DetailType: "AccountBasedExpenseLineDetail",
        AccountBasedExpenseLineDetail: {
          AccountRef: { value: "149", name: "Partner Distributions:Daniela Distributions" },
          BillableStatus: "NotBillable",
          TaxCodeRef: { value: "NON" }
        }
      }],
      TotalAmt: distAmount,
      CurrencyRef: { value: "USD", name: "United States Dollar" },
      APAccountRef: { value: "7", name: "Accounts Payable (A/P)" }
    });
    
    Logger.log(`✅ Created distribution bill for Daniela: $${distAmount}`);
  }
  
  return billPayloads;
}

/**
 * Builds an array of Bill payloads, one Bill per worker.
 * @param {Object} groupedLineItems - Line items grouped by worker ID.
 * @param {Object} workerLookup - Lookup table for worker details.
 * @param {string} targetWeekPeriod - Week period for distributions.
 * @returns {Array} - Array of bill payloads.
 * Dependencies: CONFIG, formatDateYYYYMMDD, parseDate, getNextFriday
 */
function buildBillPayloads(groupedLineItems, workerLookup, targetWeekPeriod) {
  const billPayloads = [];
  const weeklyFinancials = getWeeklyFinancialsFromSheet();

  Object.entries(groupedLineItems).forEach(([workerId, lineItems]) => {
    const workerDetails = workerLookup[workerId];
    if (!workerDetails || !workerDetails.qboVendorId) return;

    const checkNumber = lineItems[0][CONFIG.COLUMNS.PAYROLL_LINE_ITEMS.CHECK_NUMBER];
    if (!checkNumber) return;

    const txnDate = formatDateYYYYMMDD(lineItems[0][CONFIG.COLUMNS.PAYROLL_LINE_ITEMS.WEEK_PERIOD]);
    const dueDate = formatDateYYYYMMDD(getNextFriday(parseDate(txnDate)));

    // Sort lineItems by PAYROLL_DATE
    lineItems.sort((a, b) =>
      new Date(a[CONFIG.COLUMNS.PAYROLL_LINE_ITEMS.PAYROLL_DATE]) -
      new Date(b[CONFIG.COLUMNS.PAYROLL_LINE_ITEMS.PAYROLL_DATE])
    );

    const formattedLineItems = lineItems.map((item, index) => {
      const payrollDate = formatDateYYYYMMDD(parseDate(item[CONFIG.COLUMNS.PAYROLL_LINE_ITEMS.PAYROLL_DATE]));
      return {
        LineNum: index + 1,
        Description: `${payrollDate} | ${item[CONFIG.COLUMNS.PAYROLL_LINE_ITEMS.DETAILS]}`,
        Amount: parseFloat(item[CONFIG.COLUMNS.PAYROLL_LINE_ITEMS.CHECK_AMOUNT]),
        DetailType: "AccountBasedExpenseLineDetail",
        AccountBasedExpenseLineDetail: {
          AccountRef: { value: "142", name: "Subcontractor Expense" },
          BillableStatus: "NotBillable",
          TaxCodeRef: { value: "NON" }
        }
      };
    }).filter(item => item.Amount > 0);

    // Add Partner Distribution Line (if applicable)
    const thisWeek = weeklyFinancials.find(row => row.WeekPeriod === txnDate);

    if (thisWeek && !isNaN(thisWeek.NetIncome)) {
      const distAmount = parseFloat((thisWeek.NetIncome / 3).toFixed(2));

      if (workerId === "SG-001-844c9f7b") {
        formattedLineItems.push({
          LineNum: formattedLineItems.length + 1,
          Description: `${txnDate} | Steve's 1/3 Share of $${thisWeek.NetIncome} Net Income`,
          Amount: distAmount,
          DetailType: "AccountBasedExpenseLineDetail",
          AccountBasedExpenseLineDetail: {
            AccountRef: { value: "148", name: "Partner Distributions:Steve Distributions" },
            BillableStatus: "NotBillable",
            TaxCodeRef: { value: "NON" }
          }
        });
      }

      if (workerId === "DMR-002-5c6334ca") {
        formattedLineItems.push({
          LineNum: formattedLineItems.length + 1,
          Description: `${txnDate} | Daniela's 1/3 Share of $${thisWeek.NetIncome} Net Income`,
          Amount: distAmount,
          DetailType: "AccountBasedExpenseLineDetail",
          AccountBasedExpenseLineDetail: {
            AccountRef: { value: "149", name: "Partner Distributions:Daniela Distributions" },
            BillableStatus: "NotBillable",
            TaxCodeRef: { value: "NON" }
          }
        });
      }
    }

    const totalAmount = formattedLineItems.reduce((sum, item) => sum + item.Amount, 0);

    const billPayload = {
      TxnDate: txnDate,
      DueDate: dueDate,
      VendorRef: { value: workerDetails.qboVendorId, name: workerDetails.displayName },
      DocNumber: checkNumber,
      PrivateNote: checkNumber,
      Line: formattedLineItems,
      TotalAmt: totalAmount,
      CurrencyRef: { value: "USD", name: "United States Dollar" },
      APAccountRef: { value: "7", name: "Accounts Payable (A/P)" }
    };

    billPayloads.push(billPayload);
  });

  return billPayloads;
}


/**
 * Maps workers by their WorkerID for quick lookup.
 * @param {Array} workers - The list of workers.
 * @returns {Object} - Lookup table for worker details.
 * Dependencies: CONFIG, Logger
 */
function mapWorkersById(workers) {
  const workerCols = CONFIG.COLUMNS.WORKERS;
  return workers.reduce((lookup, worker) => {
    const workerId = worker[workerCols.WORKER_ID];
    const qboVendorId = worker[workerCols.QBO_VENDOR_ID];

    if (!qboVendorId) {
      Logger.log(`❌ QBO Vendor ID missing for Worker ID: ${workerId}`);
    }

    lookup[workerId] = {
      qboVendorId,
      displayName: worker[workerCols.DISPLAY_NAME]
    };
    return lookup;
  }, {});
}

/**
 * Safely parse a date from different possible formats.
 * @param {string|Date} value - The date value to parse.
 * @returns {Date} - Parsed date object.
 * Dependencies: None
 */
function parseDate(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return value;
  }
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
}

/**
 * Returns a date string in "yyyy-MM-dd" format.
 * @param {Date} dateObj - The date object to format.
 * @returns {string} - Formatted date string.
 * Dependencies: None
 */
function formatDateYYYYMMDD(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns the next Friday after the given date.
 * @param {Date} dateObj - The starting date.
 * @returns {Date} - The next Friday date.
 * Dependencies: None
 */
function getNextFriday(dateObj) {
  const nextFriday = new Date(dateObj);
  const dayOfWeek = nextFriday.getDay();
  const offset = (12 - dayOfWeek) % 7 || 7;
  nextFriday.setDate(nextFriday.getDate() + offset);
  return nextFriday;
}

