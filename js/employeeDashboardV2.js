(function () {
  const API_BASE = "https://cls-proxy.s-garay.workers.dev";

  const state = {
    workerId: localStorage.getItem("CLS_WorkerID") || "",
    authToken: localStorage.getItem("CLS_AuthToken") || "",
    displayName: localStorage.getItem("CLS_WorkerName") || "Employee",
    email: localStorage.getItem("CLS_Email") || "",
    role: localStorage.getItem("CLS_Role") || "Worker",
    viewAsWorker: "",
    payrollWeekPeriod: "",
  };

  const dom = {
    userChip: document.getElementById("userChip"),
    shiftStatusPill: document.getElementById("shiftStatusPill"),
    shiftState: document.getElementById("shiftState"),
    lastEntry: document.getElementById("lastEntry"),
    lastSite: document.getElementById("lastSite"),
    entryCount: document.getElementById("entryCount"),
    hoursEstimate: document.getElementById("hoursEstimate"),
    syncState: document.getElementById("syncState"),
    todayEntriesBody: document.getElementById("todayEntriesBody"),
    payrollBody: document.getElementById("payrollBody"),
    payrollTotal: document.getElementById("payrollTotal"),
    rangeSelect: document.getElementById("rangeSelect"),
    viewAsSelect: document.getElementById("viewAsSelect"),
    roleTag: document.getElementById("roleTag"),
    adminDrawer: document.getElementById("adminDrawer"),
    offlineBanner: document.getElementById("offlineBanner"),
    toast: document.getElementById("toast"),
  };

  function getDeviceInfo() {
    const ua = navigator.userAgent;
    let deviceType = "Unknown";
    if (/iPhone/.test(ua)) deviceType = "iPhone";
    else if (/iPad/.test(ua)) deviceType = "iPad";
    else if (/Android/.test(ua)) deviceType = "Android";
    else if (/Windows/.test(ua)) deviceType = "Windows";
    else if (/Macintosh|Mac OS X/.test(ua)) deviceType = "macOS";
    else if (/Linux/.test(ua)) deviceType = "Linux";

    let browserType = "Unknown Browser";
    if (/Edg\//.test(ua)) browserType = "Edge";
    else if (/Chrome/.test(ua) && !/Edg/.test(ua)) browserType = "Chrome";
    else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browserType = "Safari";
    else if (/Firefox/.test(ua)) browserType = "Firefox";

    return `${deviceType} - ${browserType}`;
  }

  function getAuthParam() {
    return state.authToken
      ? `&authToken=${encodeURIComponent(state.authToken)}`
      : "";
  }

  function showToast(message, type) {
    dom.toast.textContent = message;
    dom.toast.classList.remove("hidden");
    dom.toast.style.background =
      type === "error" ? "rgba(120, 22, 22, 0.95)" : "rgba(24, 32, 40, 0.94)";
    setTimeout(() => dom.toast.classList.add("hidden"), 2800);
  }

  function jsonp(url) {
    return new Promise((resolve, reject) => {
      const cb = "hub_cb_" + Math.round(Math.random() * 10000000);
      const script = document.createElement("script");
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error("Request timeout"));
      }, 25000);

      function cleanup() {
        clearTimeout(timeoutId);
        delete window[cb];
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[cb] = (data) => {
        cleanup();
        resolve(data);
      };

      script.onerror = () => {
        cleanup();
        reject(new Error("JSONP request failed"));
      };

      script.src = `${url}${url.includes("?") ? "&" : "?"}callback=${cb}`;
      document.head.appendChild(script);
    });
  }

  function estDateInEastern() {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    }).format(new Date());
  }

  function isPrivileged(role) {
    return role === "Admin" || role === "Supervisor" || role === "Lead";
  }

  function normalizeRows(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => {
      if (Array.isArray(row)) {
        return {
          date: row[0] || "",
          time: row[1] || "",
          site: row[2] || "",
          clockOut: row[3] || "",
          id: row[4] || "",
          hours: row[5] || "",
        };
      }
      return {
        date: row.date || row.Date || "",
        time: row.time || row.Time || row.clockInTime || "",
        site: row.site || row.Site || row.client || "",
        clockOut: row.clockOut || row.clockout || row.outTime || "",
        id: row.id || row.recordId || row.ClockinID || "",
        hours: row.hours || row.Hours || row.totalHours || "",
      };
    });
  }

  function normalizePayrollRows(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => ({
      date: row.date || row.Date || "",
      detail: row.hoursBreak || row.lineItemDetail || row.detail || "",
      checkAmount: Number(row.checkAmount || row.amount || 0),
    }));
  }

  function renderEntries(records) {
    const today = estDateInEastern();
    const todayRows = normalizeRows(records).filter((r) => r.date === today);

    if (!todayRows.length) {
      dom.todayEntriesBody.innerHTML =
        "<tr><td colspan='3' class='muted'>No entries today.</td></tr>";
      dom.entryCount.textContent = "0";
      dom.hoursEstimate.textContent = "0.00";
      dom.lastEntry.textContent = "-";
      dom.lastSite.textContent = "-";
      dom.shiftState.textContent = "Off Shift";
      dom.shiftStatusPill.textContent = "Off Shift";
      return;
    }

    const sorted = [...todayRows].sort((a, b) => (a.time < b.time ? 1 : -1));
    dom.todayEntriesBody.innerHTML = sorted
      .slice(0, 6)
      .map(
        (r) =>
          `<tr><td>${r.date}</td><td>${r.time || "-"}</td><td>${r.site || "-"}</td></tr>`,
      )
      .join("");

    dom.entryCount.textContent = String(todayRows.length);

    const hours = todayRows.reduce((sum, row) => {
      const n = Number(String(row.hours).replace(/[^0-9.-]/g, ""));
      return Number.isFinite(n) ? sum + n : sum;
    }, 0);
    dom.hoursEstimate.textContent = hours.toFixed(2);

    const latest = sorted[0];
    dom.lastEntry.textContent = `${latest.date} ${latest.time || ""}`.trim();
    dom.lastSite.textContent = latest.site || "-";

    const active = !latest.clockOut || String(latest.clockOut).trim() === "";
    const statusText = active ? "On Shift" : "Off Shift";
    dom.shiftState.textContent = statusText;
    dom.shiftStatusPill.textContent = statusText;
  }

  function renderPayroll(payload) {
    const rows = normalizePayrollRows(payload?.rows || []);
    if (!rows.length) {
      dom.payrollBody.innerHTML =
        "<tr><td colspan='3' class='muted'>No payroll rows found.</td></tr>";
      dom.payrollTotal.textContent = "Total: $0.00";
      return;
    }

    dom.payrollBody.innerHTML = rows
      .map(
        (r) =>
          `<tr><td>${r.date || "-"}</td><td>${r.detail || "-"}</td><td>$${r.checkAmount.toFixed(2)}</td></tr>`,
      )
      .join("");

    const amount = Number(
      payload?.totals?.checkAmountSum ||
        rows.reduce((sum, r) => sum + r.checkAmount, 0),
    );
    dom.payrollTotal.textContent = `Total: $${amount.toFixed(2)}`;
    dom.payrollWeekPeriod = payload?.period?.weekEnd || "";
    state.payrollWeekPeriod = payload?.period?.weekEnd || "";
  }

  async function fetchWhoAmI() {
    const url = `${API_BASE}?action=whoami&requesterId=${encodeURIComponent(state.workerId)}&workerId=${encodeURIComponent(state.workerId)}${getAuthParam()}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.role) {
      state.role = data.role;
      localStorage.setItem("CLS_Role", state.role);
    }
    return data;
  }

  async function loadWorkersForAdmin() {
    const url = `${API_BASE}?action=reportAll&requesterId=${encodeURIComponent(state.workerId)}`;
    const res = await fetch(url);
    const data = await res.json();
    const records = Array.isArray(data?.records) ? data.records : [];

    const unique = new Map();
    for (const r of records) {
      const id = r.workerId || r.workerID || r.WorkerID || r.id;
      const name = r.workerName || r.displayName || r.name || id;
      if (id && !unique.has(id)) unique.set(id, name);
    }

    const options = [`<option value="">Select worker...</option>`].concat(
      Array.from(unique.entries()).map(
        ([id, name]) => `<option value="${id}">${name} (${id})</option>`,
      ),
    );

    dom.viewAsSelect.innerHTML = options.join("");
  }

  async function loadReport() {
    dom.todayEntriesBody.innerHTML =
      "<tr><td colspan='3' class='muted'>Loading...</td></tr>";

    let data;
    if (state.viewAsWorker && state.role === "Admin") {
      const url = `${API_BASE}?action=reportAs&requesterId=${encodeURIComponent(state.workerId)}&targetId=${encodeURIComponent(state.viewAsWorker)}`;
      data = await jsonp(url);
    } else {
      const target = state.workerId;
      const url = `${API_BASE}?action=report&requesterId=${encodeURIComponent(state.workerId)}&workerId=${encodeURIComponent(target)}${getAuthParam()}`;
      data = await jsonp(url);
    }
    renderEntries(data?.records || []);
  }

  async function loadPayroll() {
    dom.payrollBody.innerHTML =
      "<tr><td colspan='3' class='muted'>Loading...</td></tr>";
    const range = dom.rangeSelect.value || "current";

    let data;
    if (state.viewAsWorker && state.role === "Admin") {
      const url = `${API_BASE}?action=payrollAs&requesterId=${encodeURIComponent(state.workerId)}&targetId=${encodeURIComponent(state.viewAsWorker)}&range=${encodeURIComponent(range)}`;
      data = await jsonp(url);
    } else {
      const url = `${API_BASE}?action=payroll&requesterId=${encodeURIComponent(state.workerId)}&workerId=${encodeURIComponent(state.workerId)}&range=${encodeURIComponent(range)}${getAuthParam()}`;
      data = await jsonp(url);
    }

    renderPayroll(data || {});
  }

  async function handleClockAction() {
    if (!navigator.onLine) {
      showToast("Offline detected. Reconnect to submit clock action.", "error");
      dom.syncState.textContent = "Offline";
      return;
    }

    let pos;
    try {
      pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
    } catch (err) {
      showToast("Location unavailable. Please enable GPS and retry.", "error");
      return;
    }

    const url = `${API_BASE}?action=clockin&workerId=${encodeURIComponent(state.workerId)}&lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&lang=${encodeURIComponent(localStorage.getItem("CLS_Lang") || "en")}&email=${encodeURIComponent(state.email)}&device=${encodeURIComponent(getDeviceInfo())}`;

    const btn = document.getElementById("clockActionBtn");
    btn.disabled = true;
    btn.textContent = "Recording...";

    try {
      const res = await jsonp(url);
      if (res && res.success) {
        showToast(res.message || "Clock event recorded.", "ok");
        dom.syncState.textContent = "Synced";
      } else {
        throw new Error(
          (res && (res.error || res.message)) || "Clock action failed",
        );
      }
      await Promise.all([loadReport(), loadPayroll()]);
    } catch (err) {
      showToast(err.message || "Clock action failed.", "error");
      dom.syncState.textContent = "Error";
    } finally {
      btn.disabled = false;
      btn.textContent = "Clock In / Out";
    }
  }

  async function sendPayrollReport() {
    if (!state.payrollWeekPeriod) {
      showToast("Load payroll first.", "error");
      return;
    }

    const url = `${API_BASE}?action=payrollPdf&workerId=${encodeURIComponent(state.viewAsWorker || state.workerId)}&requesterId=${encodeURIComponent(state.workerId)}&workerName=${encodeURIComponent(state.displayName || "")}&weekPeriod=${encodeURIComponent(state.payrollWeekPeriod)}`;

    try {
      const res = await jsonp(url);
      if (res && res.success !== false) {
        showToast("Payroll report sent.", "ok");
      } else {
        throw new Error("Unable to send payroll report");
      }
    } catch (err) {
      showToast(err.message || "Unable to send payroll report", "error");
    }
  }

  function updateOnlineState() {
    dom.offlineBanner.classList.toggle("hidden", navigator.onLine);
    dom.syncState.textContent = navigator.onLine ? "Synced" : "Offline";
  }

  function logout() {
    localStorage.removeItem("CLS_WorkerID");
    localStorage.removeItem("CLS_WorkerName");
    localStorage.removeItem("CLS_Email");
    localStorage.removeItem("CLS_Role");
    localStorage.removeItem("CLS_W9Status");
    localStorage.removeItem("CLS_AuthToken");
    localStorage.removeItem("CLS_AuthTokenExp");
    location.href = "employeelogin.html";
  }

  function attachEvents() {
    document
      .getElementById("clockActionBtn")
      .addEventListener("click", handleClockAction);
    document
      .getElementById("refreshBtn")
      .addEventListener("click", () =>
        Promise.all([loadReport(), loadPayroll()]),
      );
    document
      .getElementById("requestEditBtn")
      .addEventListener("click", () =>
        showToast(
          "Time edit request flow will be connected in next pass.",
          "ok",
        ),
      );
    document
      .getElementById("sendPayrollBtn")
      .addEventListener("click", sendPayrollReport);
    document.getElementById("logoutBtn").addEventListener("click", logout);
    document
      .getElementById("langBtn")
      .addEventListener("click", () =>
        showToast("Language switch will be added to V2 next.", "ok"),
      );
    dom.rangeSelect.addEventListener("change", loadPayroll);

    document
      .getElementById("applyViewBtn")
      .addEventListener("click", async () => {
        state.viewAsWorker = dom.viewAsSelect.value || "";
        await Promise.all([loadReport(), loadPayroll()]);
        showToast(
          state.viewAsWorker
            ? `Viewing as ${state.viewAsWorker}`
            : "View cleared",
          "ok",
        );
      });

    document
      .getElementById("clearViewBtn")
      .addEventListener("click", async () => {
        state.viewAsWorker = "";
        dom.viewAsSelect.value = "";
        await Promise.all([loadReport(), loadPayroll()]);
        showToast("Returned to your worker view", "ok");
      });

    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
  }

  async function init() {
    if (!state.workerId) {
      location.href = "employeelogin.html";
      return;
    }

    dom.userChip.textContent = `${state.displayName} (${state.workerId})`;
    updateOnlineState();
    attachEvents();

    try {
      const who = await fetchWhoAmI();
      dom.roleTag.textContent = state.role;

      if (isPrivileged(state.role)) {
        dom.adminDrawer.classList.remove("hidden");
        await loadWorkersForAdmin();
      }

      if (!who || !who.ok) {
        showToast("Role check returned limited data.", "error");
      }
    } catch (_err) {
      showToast(
        "Role check unavailable. Continuing with cached role.",
        "error",
      );
    }

    try {
      await Promise.all([loadReport(), loadPayroll()]);
    } catch (err) {
      showToast(`Data load error: ${err.message || err}`, "error");
    }
  }

  init();
})();
