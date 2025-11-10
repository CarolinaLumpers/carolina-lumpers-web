// ======================================================
// Project: CLS Employee Login System
// File: CLS_EmployeeLogin_Admin.js
// Description: Admin utilities, report access, and
// payroll PDF generation functions.
// ======================================================

// ======================================================
//  ADMIN REPORT FUNCTIONS
// ======================================================
function handleReportAll_(requestingWorkerId, workersCSV) {
  const role = getRole_(requestingWorkerId);
  if (role !== 'Admin' && role !== 'Lead') {
    return { ok: false, message: 'Access denied' };
  }

  const filterSet = new Set(
    (workersCSV || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  );

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName('ClockIn');
  if (!sh) return { ok: false, message: 'ClockIn sheet not found' };

  const values = sh.getDataRange().getValues();
  if (values.length < 2) return { ok: true, workers: [], records: {} };

  const headers = values[0].map(String);
  const iWorker = headers.indexOf('WorkerID');
  const iDate = headers.indexOf('Date');
  const iTime = headers.indexOf('Time');
  if (iWorker < 0 || iDate < 0 || iTime < 0) {
    return { ok: false, message: 'ClockIn sheet missing WorkerID/Date/Time columns' };
  }

  const names = getWorkerNames_();
  const records = {}; // { workerId: [ {date,time} ] }

  const todayISO = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');

  for (let r = 1; r < values.length; r++) {
    const w = String(values[r][iWorker] || '').trim();
    if (!w) continue;
    if (filterSet.size && !filterSet.has(w)) continue;

    const rawDate = values[r][iDate];
    const d = normalizeISO_(rawDate);
    if (d !== todayISO) continue; // ✅ Only include today's records

    const t = values[r][iTime];
    let timeStr = '';
    if (t instanceof Date && !isNaN(t)) {
      timeStr = Utilities.formatDate(t, TIMEZONE, 'hh:mm:ss a');
    } else if (typeof t === 'string') {
      timeStr = t;
    }

    if (!records[w]) records[w] = [];
    records[w].push({ date: d, time: timeStr });
  }

  // ✅ ALWAYS return all workers from Workers sheet, not just those with clock-ins
  const allWorkers = Object.keys(names).map(id => ({ id, name: names[id] || id }));
  return { ok: true, workers: allWorkers, records };
}

function handleReportForWorker_(workerId) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName('ClockIn');
  if (!sh) return { ok: false, message: 'ClockIn sheet not found' };
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return { ok: true, records: [] };

  const headers = values[0].map(String);
  const iWorker = headers.indexOf('WorkerID');
  const iDate   = headers.indexOf('Date');
  const iTime   = headers.indexOf('Time');

  const todayISO = Utilities.formatDate(new Date(), TIMEZONE, 'MM/dd/yyyy'); // matches your sheet format

  const recs = [];
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][iWorker]) !== String(workerId)) continue;
    const d = values[r][iDate];
    const dateStr = (d instanceof Date) ? Utilities.formatDate(d, TIMEZONE, 'MM/dd/yyyy') : String(d);
    if (dateStr !== todayISO) continue;
    const t = values[r][iTime];
    const timeStr = (t instanceof Date) ? Utilities.formatDate(t, TIMEZONE, 'hh:mm:ss a') : String(t || '');
    recs.push({ date: dateStr, time: timeStr });
  }
  return { ok: true, records: recs };
}

// ======================================================
//  PAYROLL FUNCTIONS
// ======================================================
function getPayrollSummary_(workerId, range) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Payroll LineItems');
  if (!sheet) return { success: false, message: '❌ Payroll LineItems sheet not found.' };

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { success: true, rows: [] };

  const headers = values[0].map(h => String(h).trim());
  const idx = name => headers.indexOf(name);

  const iWorker = idx('WorkerID');
  const iWeek = idx('Week Period');
  const iDate = idx('Date');
  const iDetail = idx('LineItemDetail');
  const iAmt = idx('Check Amount');
  const iClient = idx('ClientID');

  // If range is an ISO date (YYYY-MM-DD), use it directly; otherwise calculate from 'current' or 'previous'
  const weekEndISO = range && range.match(/^\d{4}-\d{2}-\d{2}$/) 
    ? range 
    : getWeekEndSaturdayISO_(range);
    
  const data = values.slice(1)
    .filter(r =>
      String(r[iWorker]).trim() === String(workerId) &&
      normalizeISO_(r[iWeek]) === weekEndISO
    )
    .map(r => ({
      date: normalizeISO_(r[iDate]),
      client: r[iClient] || '',
      hoursBreak: r[iDetail] || '',
      checkAmount: toNumberSafe_(r[iAmt])
    }));

  const total = data.reduce((sum, r) => sum + (r.checkAmount || 0), 0);
  const weekStart = getWeekStartFromEnd_(weekEndISO);

  return {
    success: true,
    period: { weekStart, weekEnd: weekEndISO },
    totals: { entries: data.length, checkAmountSum: round2_(total) },
    rows: data
  };
}

function handlePayrollForWorker_(workerId, range) {
  // Call the existing payroll handler with the target worker ID
  return getPayrollSummary_(workerId, range);
}

function getPayrollWeekPeriods_(workerId) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('Payroll LineItems');
    
    if (!sheet) {
      Logger.log('❌ Payroll LineItems sheet not found');
      return { success: false, message: '❌ Payroll LineItems sheet not found.' };
    }

    const values = sheet.getDataRange().getValues();
    Logger.log(`📊 Sheet has ${values.length} rows (including header)`);
    
    if (values.length < 2) {
      Logger.log('No data rows in Payroll LineItems');
      return { success: true, periods: [] };
    }

    const headers = values[0].map(h => String(h).trim());
    const iWorker = headers.indexOf('WorkerID');
    const iWeek = headers.indexOf('Week Period');

    Logger.log(`Column indexes - WorkerID: ${iWorker}, Week Period: ${iWeek}`);
    Logger.log(`Looking for workerId: "${workerId}"`);

    if (iWorker < 0 || iWeek < 0) {
      Logger.log('❌ Missing required columns');
      return { success: false, message: '❌ Missing WorkerID or Week Period columns' };
    }

    // Get unique week periods for this worker
    const periodSet = new Set();
    let matchCount = 0;
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const rowWorkerId = String(row[iWorker] || '').trim();
      const rowWeekPeriod = row[iWeek];
      
      if (rowWorkerId === String(workerId).trim()) {
        matchCount++;
        const weekPeriod = normalizeISO_(rowWeekPeriod);
        if (weekPeriod) {
          periodSet.add(weekPeriod);
          Logger.log(`✓ Found period: ${weekPeriod} for worker ${rowWorkerId}`);
        }
      }
    }

    Logger.log(`Found ${matchCount} records for worker ${workerId}, ${periodSet.size} unique periods`);

    // Convert to array and sort descending (newest first)
    const periods = Array.from(periodSet).sort((a, b) => b.localeCompare(a));

    return { success: true, periods: periods };
    
  } catch (err) {
    Logger.log('❌ Error in getPayrollWeekPeriods_: ' + err.toString());
    return { success: false, message: '❌ Error: ' + err.message };
  }
}

// ======================================================
//  PDF GENERATION
// ======================================================
function generatePayrollPdf_(workerId, workerName, weekEndISO) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Payroll LineItems');
  if (!sheet) return null;

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;

  const headers = values[0].map(h => String(h).trim());
  const idx = name => headers.indexOf(name);

  const iWorker = idx('WorkerID');
  const iName = idx('Worker Name');
  const iDate = idx('Date');
  const iWeek = idx('Week Period');
  const iDetail = idx('LineItemDetail'); // ✅ confirmed header name
  const iAmt = idx('Check Amount');
  const iClient = idx('ClientID');
  const iCheck = idx('Check Number');
  const iQty = idx('Qty');
  const iEmail = idx('Email'); // optional column

  const records = values.slice(1)
    .filter(r =>
      String(r[iWorker]).trim() === String(workerId) &&
      normalizeISO_(r[iWeek]) === weekEndISO
    )
    .map(r => ({
      workerId: r[iWorker],
      workerName: r[iName],
      date: normalizeISO_(r[iDate]),
      lineItemDetail: r[iDetail],
      checkAmount: toNumberSafe_(r[iAmt]),
      clientId: r[iClient],
      checkNumber: r[iCheck],
      qty: toNumberSafe_(r[iQty]),
      email: iEmail !== -1 ? (r[iEmail] || null) : null
    }));

  if (!records.length) return null;

  const totalAmount = records.reduce((s, r) => s + (r.checkAmount || 0), 0);
  const weekStart = getWeekStartFromEnd_(weekEndISO);

  const logoBlob = DriveApp.getFileById(LOGO_FILE_ID).getBlob();
  const logoBase64 = Utilities.base64Encode(logoBlob.getBytes());
  const logoUri = `data:${logoBlob.getContentType()};base64,${logoBase64}`;

  // Build HTML for PDF
  let html = `
  <html><head><style>
  body{font-family:Arial,sans-serif;font-size:14px;color:#333;margin:10px;}
  h1,h2{text-align:center;}
  table{width:100%;border-collapse:collapse;margin-top:20px;}
  th,td{border:1px solid #ccc;padding:8px;text-align:left;}
  th{background:#f2f2f2;}
  tr:nth-child(even){background:#f9f9f9;}
  </style></head><body>
  <div style="text-align:center">
    <img src="${logoUri}" style="max-width:200px;">
    <h1>Payroll Report</h1>
    <h3>Week: ${weekStart} – ${weekEndISO}</h3>
    <p>Worker: ${workerName || records[0].workerName}</p>
  </div>
  <table>
    <tr><th>Date</th><th>Hours / Break</th><th>Check Amount</th></tr>`;

  records.forEach(r => {
    html += `<tr>
      <td>${r.date}</td>
      <td>${r.lineItemDetail || ''}</td>
      <td>$${(r.checkAmount || 0).toFixed(2)}</td>
    </tr>`;
  });

  html += `</table>
  <h3 style="text-align:right">Total: $${totalAmount.toFixed(2)}</h3>
  <p style="font-size:12px;text-align:center">
    Generated ${Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd HH:mm")}
  </p></body></html>`;

  // Generate PDF file
  const htmlBlob = Utilities.newBlob(html, 'text/html', 'payroll.html');
  const pdf = htmlBlob.getAs('application/pdf');
  const folder = DriveApp.getFolderById(PDF_FOLDER_ID);
  const fileName = `${workerId}-${weekEndISO}.pdf`;
  const file = folder.createFile(pdf).setName(fileName);

  // === Email logic ===
  const subject = `Payroll Report – ${workerName || records[0].workerName}`;
  const body = `Attached is the payroll report for ${workerName || records[0].workerName} (week ending ${weekEndISO}).`;
  const emailOptions = {
    attachments: [file.getAs('application/pdf')],
    name: 'Carolina Lumper Service',
    cc: CC_EMAIL
  };

  // Always send to info
  GmailApp.sendEmail(INFO_EMAIL, subject, body, emailOptions);

  // Optionally send to worker
  if (SEND_PDF_TO_WORKER && records[0].email) {
    GmailApp.sendEmail(records[0].email, subject, body, {
      ...emailOptions,
      cc: `${CC_EMAIL},${INFO_EMAIL}`
    });
  }

  return { success: true, pdfUrl: file.getUrl() };
}