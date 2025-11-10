/**
 * Main function to process payroll and post bills to QuickBooks.
 * @param {string} weekPeriod - The week period to process (in "yyyy-MM-dd" format).
 * Dependencies: getActiveWorkers, mapWorkersById, getPayrollLineItems, 
 *               formatDateYYYYMMDD, parseDate, groupLineItemsByWorker, 
 *               buildBillPayloads, findExistingBill, callQBOApi, Logger, CONFIG
 */
function processPayroll(weekPeriod) {
  try {
    Logger.log("🚀 Starting Payroll Processing...");

    const workers = getActiveWorkers();
    const workerLookup = mapWorkersById(workers);

    let lineItems = getPayrollLineItems();
    if (!lineItems.length) return Logger.log("❌ No payroll line items found");

    const itemCols = CONFIG.COLUMNS.PAYROLL_LINE_ITEMS;
    const targetWeekPeriod = formatDateYYYYMMDD(parseDate(weekPeriod));

    lineItems = lineItems.filter(item =>
      formatDateYYYYMMDD(parseDate(item[itemCols.WEEK_PERIOD])) === targetWeekPeriod
    );
    if (!lineItems.length) return Logger.log(`❌ No payroll line items for ${targetWeekPeriod}`);

    const groupedByWorker = groupLineItemsByWorker(lineItems);
    const billPayloads = buildBillPayloads(groupedByWorker, workerLookup);

    for (const fullPayload of billPayloads) {
      Logger.log(`📤 Processing Bill: ${fullPayload.DocNumber}, TotalAmt: ${fullPayload.TotalAmt}`);

      try {
        const existingBill = findExistingBill(fullPayload.DocNumber);
        if (existingBill) {
          Logger.log(`🔄 Updating existing Bill: ${fullPayload.DocNumber}`);
          fullPayload.Id = existingBill.Id;
          fullPayload.SyncToken = existingBill.SyncToken;
          const response = callQBOApi(`/bill`, 'POST', fullPayload);
          Logger.log(`✅ API Response: ${JSON.stringify(response, null, 2)}`);
        } else {
          Logger.log(`📤 Creating new Bill: ${fullPayload.DocNumber}`);
          const response = callQBOApi(`/bill`, 'POST', fullPayload);
          Logger.log(`✅ API Response: ${JSON.stringify(response, null, 2)}`);
        }
      } catch (apiErr) {
        Logger.log(`❌ API Error: ${apiErr.message}`);
      }
    }
  } catch (err) {
    Logger.log(`❌ processPayroll() Error: ${err.message}`);
  }
}

function getWeeklyFinancialsFromSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("WeeklyFinancials");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  return data.slice(1).map(row => ({
    WeekPeriod: formatDateYYYYMMDD(new Date(row[headers.indexOf("Week Period")])),
    NetIncome: parseFloat(row[headers.indexOf("Net Income")])
  }));
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
 * Builds an array of Bill payloads, one Bill per worker.
 * @param {Object} groupedLineItems - Line items grouped by worker ID.
 * @param {Object} workerLookup - Lookup table for worker details.
 * @returns {Array} - Array of bill payloads.
 * Dependencies: CONFIG, formatDateYYYYMMDD, parseDate, getNextFriday
 */
function buildBillPayloads(groupedLineItems, workerLookup) {
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