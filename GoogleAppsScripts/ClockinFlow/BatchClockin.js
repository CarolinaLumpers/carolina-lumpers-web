function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var batchSheet = ss.getSheetByName("Batch Clockin");
    var logSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.LOG);

    if (!batchSheet || !logSheet) {
      logToSheet(CONFIG.SHEET_NAMES.LOG, "[BATCH] Error: One or more sheets not found.");
      return ContentService.createTextOutput(JSON.stringify({status: "error", message: "Sheets not found"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var requestData = JSON.parse(e.postData.contents);
    var batchClockInID = requestData.batchClockInID;
    var date = requestData.date;
    var startTime = requestData.startTime;
    var endTime = requestData.endTime;
    var lunch = requestData.lunch;  // Expecting TRUE or FALSE
    var workers = requestData.names.split(",").map(name => name.trim()); // Assuming names are comma-separated

    // Determine Break (Minutes) based on Lunch
    var breakMinutes = (lunch === true || lunch === "TRUE") ? 30 : 0;

    var taskSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.TASKS);
    var taskData = taskSheet.getDataRange().getValues();
    var headers = taskData[0];
    var taskIDIndex = headers.indexOf("TaskID");
    var workerIndex = headers.indexOf("Worker");
    var dateIndex = headers.indexOf("Date");
    var startTimeIndex = headers.indexOf("Start Time");
    var endTimeIndex = headers.indexOf("End Time");
    var breakMinutesIndex = headers.indexOf("Break (Minutes)");
    var batchClockinIDIndex = headers.indexOf("BatchClockinID");

    if (taskIDIndex === -1 || workerIndex === -1 || breakMinutesIndex === -1 || batchClockinIDIndex === -1) {
      logToSheet(CONFIG.SHEET_NAMES.LOG, "[BATCH] Error: Required columns not found in Tasks sheet.");
      return ContentService.createTextOutput(JSON.stringify({status: "error", message: "Required columns not found"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var existingTaskRows = new Map();
    var allWorkers = new Set();

    // Scan the task sheet to find existing tasks with matching batchClockInID and Worker
    for (var i = 1; i < taskData.length; i++) {
      var rowBatchClockInID = taskData[i][batchClockinIDIndex];
      var rowWorker = taskData[i][workerIndex];
      var rowTaskID = taskData[i][taskIDIndex];
      if (rowBatchClockInID === batchClockInID) {
        existingTaskRows.set(rowWorker, rowTaskID); // Store TaskID
        allWorkers.add(rowWorker);
      }
    }

    var tasksToUpdate = [];
    var tasksToCreate = [];
    var tasksToDelete = [];

    // Identify tasks to update or create
    workers.forEach(worker => {
      var uuid = Utilities.getUuid().substring(0, 8);
      var dateFormatted = Utilities.formatDate(new Date(), "America/New_York", "yyMMdd");
      var taskID = `BATCHTASK-${dateFormatted}-${uuid}`;

      var taskData = {
        "TaskID": taskID,
        "Worker": worker,
        "Date": date,
        "Start Time": startTime,
        "End Time": endTime,
        "Break (Minutes)": breakMinutes,
        "BatchClockinID": batchClockInID
      };

      if (existingTaskRows.has(worker)) {
        // Update existing task
        taskData["TaskID"] = existingTaskRows.get(worker); // Use existing TaskID
        tasksToUpdate.push(taskData);
      } else {
        // Create new task
        tasksToCreate.push(taskData);
      }
    });

    // Identify tasks to delete
    allWorkers.forEach(worker => {
      if (!workers.includes(worker)) {
        var taskID = existingTaskRows.get(worker);
        tasksToDelete.push({ "TaskID": taskID });
      }
    });

    // Call AppSheet API to update, create, and delete tasks
    if (tasksToUpdate.length > 0) {
      callAppSheetAPI("Edit", tasksToUpdate);
    }
    if (tasksToCreate.length > 0) {
      callAppSheetAPI("Add", tasksToCreate);
    }
    if (tasksToDelete.length > 0) {
      callAppSheetAPI("Delete", tasksToDelete);
    }

    return ContentService.createTextOutput(JSON.stringify({status: "success", message: "Tasks updated/created/deleted"}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    logToSheet(CONFIG.SHEET_NAMES.LOG, `[BATCH] Error: ${error.toString()}`);
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function callAppSheetAPI(action, rows) {
  var apiKey = CONFIG.APPSHEET.API_KEY;
  var appId = CONFIG.APPSHEET.APP_ID;
  var tableName = CONFIG.APPSHEET.TABLE_NAME;

  var url = `https://api.appsheet.com/api/v2/apps/${appId}/tables/${tableName}/Action`;

  var payload = {
    "Action": action,
    "Properties": {
      "Locale": "en-US",
      "Timezone": "America/New_York",
      "UserSettings": {}
    },
    "Rows": rows
  };

  var options = {
    "method": "post",
    "contentType": "application/json",
    "headers": {
      "ApplicationAccessKey": apiKey
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  logToSheet(CONFIG.SHEET_NAMES.LOG, `📦 [BATCH][${action}] Payload → ${rows.length} rows | 🕒 America/New_York`);

  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseData = JSON.parse(response.getContentText());

    rows.forEach(row => {
      logToSheet(CONFIG.SHEET_NAMES.LOG, `[BATCH] ➡️ ${action}: ${row.Worker} | 🆔 ${row.TaskID} | ${row["Start Time"]}–${row["End Time"]} ⏱️ ${row["Break (Minutes)"]}m`);
    });
  } catch (error) {
    rows.forEach(row => {
      logToSheet(CONFIG.SHEET_NAMES.LOG, `[BATCH] ❌ Error ${action} task for worker: ${row.Worker} | 🆔 ${row.TaskID} | Error: ${error.message}`);
    });
  }
}

function logToSheet(logSheet, message) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(logSheet);
  if (!sheet) throw new Error(`Log Sheet '${logSheet}' not found!`);
  
  const timestamp = new Date();
  sheet.appendRow([timestamp, message]);
}