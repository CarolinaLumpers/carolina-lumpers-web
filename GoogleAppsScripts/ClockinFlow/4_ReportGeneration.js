
/*
  function generateClockInReport(message, workerName, groupedByDate) {
    if (!groupedByDate || typeof groupedByDate !== 'object') {
      logToSheet(CONFIG.SHEET_NAMES.LOG, `❌ Invalid groupedByDate input: ${JSON.stringify(groupedByDate)}`);
      throw new Error('Invalid groupedByDate: Expected an object.');
    }
    const styles = `
      body { font-family: Arial, sans-serif; color: #f2f2f2; background-color: #000; padding: 10px; margin: 0; text-align: center; }
      .header { color: #ffcc00; margin-bottom: 20px; }
      .header h1 { font-size: 3.6em; }
      .header img { max-width: 120px; margin-top: 10px; }
      .message { margin-bottom: 20px; font-size: 2.4em; }
      .worker-name { font-size: 3.6em; margin-bottom: 20px; }
      .group-container { margin-top: 20px; display: inline-block; }
      .day-group { margin-bottom: 20px; }
      .day-title { font-size: 3em; font-weight: bold; margin-bottom: 10px; color: #ffcc00; }
      .time-item { font-size: 3em; border-bottom: 1px solid #555; padding: 5px 0; }
    `;

    const generateDayGroupHtml = (date, entries) => {
      const timeItemsHtml = entries.map(en => `<div class="time-item">${en.time}</div>`).join('');
      return `<div class="day-group"><div class="day-title">${date}</div>${timeItemsHtml}</div>`;
    };

    const dayGroupsHtml = Object.keys(groupedByDate)
      .sort((a, b) => new Date(a) - new Date(b))
      .map(date => generateDayGroupHtml(date, groupedByDate[date]))
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Clock-In Report</title>
          <style>${styles}</style>
        </head>
        <body>
          <div class="header">
            <h1>Clock-In Report</h1>
            <img src="https://carolinalumpers.com/assets/CLS-003%20(1)%20dark.webp" alt="Logo">
          </div>
          <div class="message">${message}</div>
          <div class="worker-name">${workerName}</div>
          <div class="group-container">${dayGroupsHtml}</div>
        </body>
      </html>`;
  }


  function renderClockInReport(message, workerName, groupedByDate) {
    const t = HtmlService.createTemplateFromFile('ClockInReport');
    t.message = message;
    t.workerName = workerName;
    t.groupedByDate = Object.keys(groupedByDate).map(d => ({ date: d, entries: groupedByDate[d] }));
    return t.evaluate().setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }


  function getWorkerClockInHistory(workerId) {
    try {
      const data = getSheetData(CONFIG.SHEET_NAMES.CLOCK_IN);
      const idxWorker = CONFIG.COLUMNS.CLOCK_IN.INDICES.WORKER_ID - 1;
      const idxDate   = CONFIG.COLUMNS.CLOCK_IN.INDICES.DATE - 1;
      const idxTime   = CONFIG.COLUMNS.CLOCK_IN.INDICES.TIME - 1;

      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const grouped = Object.create(null);

      data.slice(1).forEach(row => {
        if (row[idxWorker] !== workerId) return;
        const d = new Date(row[idxDate]);
        if (d < sevenDaysAgo) return; // ⬅️ filter: ignore anything older than 7 days

        const dateKey = Utilities.formatDate(d, Session.getScriptTimeZone(), 'MM/dd/yyyy');

        let tVal = row[idxTime];
        if (tVal instanceof Date) {
          tVal = Utilities.formatDate(tVal, Session.getScriptTimeZone(), 'HH:mm:ss');
        } else if (typeof tVal === 'string') {
          const parsed = parseHHMMSS(tVal);
          tVal = parsed ? formatHHMMSS(parsed.h, parsed.m, parsed.s) : tVal;
        }

        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push({ time: tVal });
      });

      // sort times within each day
      for (const k of Object.keys(grouped)) {
        grouped[k].sort((a, b) => a.time.localeCompare(b.time));
      }

      return grouped;
    } catch (error) {
      logToSheet(CONFIG.SHEET_NAMES.LOG, `Error in getWorkerClockInHistory: ${error.message}`);
      return {};
    }
  }



  function formatClockInDate(dateValue) {
    return Utilities.formatDate(new Date(dateValue), Session.getScriptTimeZone(), 'MM/dd/yyyy');
  }

  function formatClockInTime(timeValue) {
    if (timeValue instanceof Date) {
      return Utilities.formatDate(timeValue, Session.getScriptTimeZone(), 'HH:mm:ss');
    }
    const t = parseHHMMSS(timeValue);
    return t ? formatHHMMSS(t.h, t.m, t.s) : String(timeValue);
  }

  function formatHHMMSS(h, m, s) {
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
*/