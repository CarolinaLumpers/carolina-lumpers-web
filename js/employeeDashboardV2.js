(function () {
  const API_BASE = "https://cls-proxy.s-garay.workers.dev";

  const state = {
    workerId: localStorage.getItem("CLS_WorkerID") || "",
    authToken: localStorage.getItem("CLS_AuthToken") || "",
    displayName: localStorage.getItem("CLS_WorkerName") || "Employee",
    email: localStorage.getItem("CLS_Email") || "",
    role: localStorage.getItem("CLS_Role") || "Worker",
    lang: (localStorage.getItem("CLS_Lang") || "en").toLowerCase(),
    viewAsWorker: "",
    payrollWeekPeriod: "",
    busy: {
      refresh: false,
      payrollSend: false,
      applyView: false,
      clearView: false,
      clock: false,
    },
  };

  const I18N = {
    en: {
      hubTitle: "Worker Hub",
      menu: "Menu",
      close: "Close",
      language: "Language",
      refreshData: "Refresh Data",
      logout: "Logout",
      clockAction: "Clock In / Out",
      refresh: "Refresh",
      offlineBanner:
        "You are offline. Clock actions may be queued until connection returns.",
      currentShift: "Current Shift",
      state: "State",
      lastEntry: "Last Entry",
      site: "Site",
      todayEntries: "Today Entries",
      date: "Date",
      time: "Time",
      dailyTotals: "Daily Totals",
      entries: "Entries",
      hoursEst: "Hours (est.)",
      status: "Status",
      payrollSnapshot: "Payroll Snapshot",
      current: "Current",
      week: "Week",
      previous: "Previous",
      sendReport: "Send Report",
      hoursDetail: "Hours / Detail",
      checkAmount: "Check Amount",
      adminDrawer: "Admin / Lead Drawer",
      adminHelp: "View data as another worker.",
      applyView: "Apply View",
      clear: "Clear",
      loading: "Loading...",
      noEntriesToday: "No entries today.",
      noPayrollRows: "No payroll rows found.",
      offShift: "Off Shift",
      onShift: "On Shift",
      synced: "Synced",
      offline: "Offline",
      dataRefreshed: "Data refreshed",
      languageUpdated: "Language updated",
      viewingAs: "Viewing as",
      viewCleared: "View cleared",
      returnedToOwnView: "Returned to your worker view",
      roleCheckLimited: "Role check returned limited data.",
      roleCheckUnavailable:
        "Role check unavailable. Continuing with cached role.",
      dataLoadError: "Data load error",
      recording: "Recording...",
      clockRecorded: "Clock event recorded.",
      clockFailed: "Clock action failed.",
      locationUnavailable: "Location unavailable. Please enable GPS and retry.",
      offlineDetected: "Offline detected. Reconnect to submit clock action.",
      loadPayrollFirst: "Load payroll first.",
      payrollSent: "Payroll report sent.",
      payrollSendFailed: "Unable to send payroll report",
    },
    es: {
      hubTitle: "Panel de Trabajo",
      menu: "Menu",
      close: "Cerrar",
      language: "Idioma",
      refreshData: "Actualizar Datos",
      logout: "Cerrar Sesion",
      clockAction: "Marcar Entrada / Salida",
      refresh: "Actualizar",
      offlineBanner:
        "Sin conexion. Las marcaciones pueden quedar en cola hasta reconectar.",
      currentShift: "Turno Actual",
      state: "Estado",
      lastEntry: "Ultimo Registro",
      site: "Sitio",
      todayEntries: "Entradas de Hoy",
      date: "Fecha",
      time: "Hora",
      dailyTotals: "Totales del Dia",
      entries: "Entradas",
      hoursEst: "Horas (est.)",
      status: "Estado",
      payrollSnapshot: "Resumen de Nomina",
      current: "Actual",
      week: "Semana",
      previous: "Anterior",
      sendReport: "Enviar Reporte",
      hoursDetail: "Horas / Detalle",
      checkAmount: "Monto del Cheque",
      adminDrawer: "Panel Admin / Lead",
      adminHelp: "Ver datos como otro trabajador.",
      applyView: "Aplicar Vista",
      clear: "Limpiar",
      loading: "Cargando...",
      noEntriesToday: "Sin entradas hoy.",
      noPayrollRows: "No hay filas de nomina.",
      offShift: "Fuera de Turno",
      onShift: "En Turno",
      synced: "Sincronizado",
      offline: "Sin conexion",
      dataRefreshed: "Datos actualizados",
      languageUpdated: "Idioma actualizado",
      viewingAs: "Viendo como",
      viewCleared: "Vista limpiada",
      returnedToOwnView: "Volviste a tu vista",
      roleCheckLimited: "La verificacion de rol devolvio datos limitados.",
      roleCheckUnavailable:
        "Verificacion de rol no disponible. Continuando con el rol en cache.",
      dataLoadError: "Error de carga",
      recording: "Registrando...",
      clockRecorded: "Evento registrado.",
      clockFailed: "Fallo al registrar.",
      locationUnavailable:
        "Ubicacion no disponible. Activa GPS e intenta de nuevo.",
      offlineDetected: "Sin conexion. Reconecta para enviar el registro.",
      loadPayrollFirst: "Primero carga la nomina.",
      payrollSent: "Reporte de nomina enviado.",
      payrollSendFailed: "No se pudo enviar el reporte de nomina",
    },
    pt: {
      hubTitle: "Painel de Trabalho",
      menu: "Menu",
      close: "Fechar",
      language: "Idioma",
      refreshData: "Atualizar Dados",
      logout: "Sair",
      clockAction: "Registrar Entrada / Saida",
      refresh: "Atualizar",
      offlineBanner:
        "Sem conexao. Os registros podem ficar em fila ate reconectar.",
      currentShift: "Turno Atual",
      state: "Estado",
      lastEntry: "Ultimo Registro",
      site: "Local",
      todayEntries: "Entradas de Hoje",
      date: "Data",
      time: "Hora",
      dailyTotals: "Totais do Dia",
      entries: "Entradas",
      hoursEst: "Horas (est.)",
      status: "Status",
      payrollSnapshot: "Resumo da Folha",
      current: "Atual",
      week: "Semana",
      previous: "Anterior",
      sendReport: "Enviar Relatorio",
      hoursDetail: "Horas / Detalhe",
      checkAmount: "Valor do Cheque",
      adminDrawer: "Painel Admin / Lead",
      adminHelp: "Ver dados como outro trabalhador.",
      applyView: "Aplicar Visualizacao",
      clear: "Limpar",
      loading: "Carregando...",
      noEntriesToday: "Sem entradas hoje.",
      noPayrollRows: "Sem linhas de folha.",
      offShift: "Fora do Turno",
      onShift: "Em Turno",
      synced: "Sincronizado",
      offline: "Sem conexao",
      dataRefreshed: "Dados atualizados",
      languageUpdated: "Idioma atualizado",
      viewingAs: "Visualizando como",
      viewCleared: "Visualizacao limpa",
      returnedToOwnView: "Voce voltou para sua visualizacao",
      roleCheckLimited: "Verificacao de papel retornou dados limitados.",
      roleCheckUnavailable:
        "Verificacao de papel indisponivel. Continuando com papel em cache.",
      dataLoadError: "Erro de carregamento",
      recording: "Registrando...",
      clockRecorded: "Evento registrado.",
      clockFailed: "Falha ao registrar.",
      locationUnavailable:
        "Localizacao indisponivel. Ative o GPS e tente novamente.",
      offlineDetected: "Sem conexao. Reconecte para enviar o registro.",
      loadPayrollFirst: "Carregue a folha primeiro.",
      payrollSent: "Relatorio de folha enviado.",
      payrollSendFailed: "Nao foi possivel enviar o relatorio",
    },
  };

  function normalizeLang(lang) {
    return ["en", "es", "pt"].includes(lang) ? lang : "en";
  }

  state.lang = normalizeLang(state.lang);

  function t(key) {
    const dict = I18N[state.lang] || I18N.en;
    return dict[key] || I18N.en[key] || key;
  }

  function applyLanguage() {
    document.documentElement.lang = state.lang;

    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    setText("hubTitle", t("hubTitle"));
    setText("menuTitle", t("menu"));
    setText("menuCloseBtn", t("close"));
    dom.langSelect.value = state.lang;
    setText("menuRefreshBtn", t("refreshData"));
    setText("menuLogoutBtn", t("logout"));
    setText("clockActionBtn", t("clockAction"));
    setText("refreshBtn", t("refresh"));
    setText("offlineBanner", t("offlineBanner"));

    setText("currentShiftTitle", t("currentShift"));
    setText("labelState", t("state"));
    setText("labelLastEntry", t("lastEntry"));
    setText("labelSite", t("site"));
    setText("todayEntriesTitle", t("todayEntries"));
    setText("thDateToday", t("date"));
    setText("thTimeToday", t("time"));
    setText("thSiteToday", t("site"));
    setText("dailyTotalsTitle", t("dailyTotals"));
    setText("labelEntries", t("entries"));
    setText("labelHours", t("hoursEst"));
    setText("labelStatus", t("status"));

    setText("payrollTitle", t("payrollSnapshot"));
    setText("sendPayrollBtn", t("sendReport"));
    setText("thPayrollDate", t("date"));
    setText("thPayrollDetail", t("hoursDetail"));
    setText("thPayrollAmount", t("checkAmount"));

    setText("adminDrawerTitle", t("adminDrawer"));
    setText("adminHelpText", t("adminHelp"));
    setText("applyViewBtn", t("applyView"));
    setText("clearViewBtn", t("clear"));

    const optionCurrent = dom.rangeSelect.querySelector(
      "option[value='current']",
    );
    const optionWeek = dom.rangeSelect.querySelector("option[value='week']");
    const optionPrevious = dom.rangeSelect.querySelector(
      "option[value='previous']",
    );
    if (optionCurrent) optionCurrent.textContent = t("current");
    if (optionWeek) optionWeek.textContent = t("week");
    if (optionPrevious) optionPrevious.textContent = t("previous");
  }



  const dom = {
    langSelect: document.getElementById("menuLangSelect"),
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
    menuToggle: document.getElementById("menuToggle"),
    hubMenu: document.getElementById("hubMenu"),
    menuCloseBtn: document.getElementById("menuCloseBtn"),
    hubMenuBackdrop: document.getElementById("hubMenuBackdrop"),
  };

  function closeMenu() {
    dom.hubMenu.classList.add("hidden");
    dom.hubMenuBackdrop.classList.add("hidden");
    dom.menuToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  function toggleMenu() {
    const willOpen = dom.hubMenu.classList.contains("hidden");
    dom.hubMenu.classList.toggle("hidden", !willOpen);
    dom.hubMenuBackdrop.classList.toggle("hidden", !willOpen);
    dom.menuToggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
    document.body.style.overflow = willOpen ? "hidden" : "";
  }

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

  async function runWithBusyFlag(flagName, action, { onFinally } = {}) {
    if (state.busy[flagName]) return;
    state.busy[flagName] = true;
    try {
      await action();
    } finally {
      state.busy[flagName] = false;
      if (typeof onFinally === "function") onFinally();
    }
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
      dom.todayEntriesBody.innerHTML = `<tr><td colspan='3' class='muted'>${t("noEntriesToday")}</td></tr>`;
      dom.entryCount.textContent = "0";
      dom.hoursEstimate.textContent = "0.00";
      dom.lastEntry.textContent = "-";
      dom.lastSite.textContent = "-";
      dom.shiftState.textContent = t("offShift");
      dom.shiftStatusPill.textContent = t("offShift");
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
    const statusText = active ? t("onShift") : t("offShift");
    dom.shiftState.textContent = statusText;
    dom.shiftStatusPill.textContent = statusText;
  }

  function renderPayroll(payload) {
    const rows = normalizePayrollRows(payload?.rows || []);
    if (!rows.length) {
      dom.payrollBody.innerHTML = `<tr><td colspan='3' class='muted'>${t("noPayrollRows")}</td></tr>`;
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
    dom.todayEntriesBody.innerHTML = `<tr><td colspan='3' class='muted'>${t("loading")}</td></tr>`;

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
    dom.payrollBody.innerHTML = `<tr><td colspan='3' class='muted'>${t("loading")}</td></tr>`;
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
    if (state.busy.clock) return;
    if (!navigator.onLine) {
      showToast(t("offlineDetected"), "error");
      dom.syncState.textContent = t("offline");
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
      showToast(t("locationUnavailable"), "error");
      return;
    }

    const url = `${API_BASE}?action=clockin&workerId=${encodeURIComponent(state.workerId)}&lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&lang=${encodeURIComponent(localStorage.getItem("CLS_Lang") || "en")}&email=${encodeURIComponent(state.email)}&device=${encodeURIComponent(getDeviceInfo())}`;

    const btn = document.getElementById("clockActionBtn");
    const originalText = btn.textContent;

    await runWithBusyFlag(
      "clock",
      async () => {
        btn.disabled = true;
        btn.textContent = t("recording");
        try {
          const res = await jsonp(url);
          if (res && res.success) {
            showToast(res.message || t("clockRecorded"), "ok");
            dom.syncState.textContent = t("synced");
          } else {
            throw new Error(
              (res && (res.error || res.message)) || t("clockFailed"),
            );
          }
          await Promise.all([loadReport(), loadPayroll()]);
        } catch (err) {
          showToast(err.message || t("clockFailed"), "error");
          dom.syncState.textContent = "Error";
        }
      },
      {
        onFinally: () => {
          btn.disabled = false;
          btn.textContent = originalText;
        },
      },
    );
  }

  async function sendPayrollReport() {
    if (state.busy.payrollSend) return;
    if (!state.payrollWeekPeriod) {
      showToast(t("loadPayrollFirst"), "error");
      return;
    }

    const url = `${API_BASE}?action=payrollPdf&workerId=${encodeURIComponent(state.viewAsWorker || state.workerId)}&requesterId=${encodeURIComponent(state.workerId)}&workerName=${encodeURIComponent(state.displayName || "")}&weekPeriod=${encodeURIComponent(state.payrollWeekPeriod)}`;

    const btn = document.getElementById("sendPayrollBtn");
    const originalText = btn.textContent;

    await runWithBusyFlag(
      "payrollSend",
      async () => {
        btn.disabled = true;
        btn.textContent = t("loading");
        try {
          const res = await jsonp(url);
          if (res && res.success !== false) {
            showToast(t("payrollSent"), "ok");
          } else {
            throw new Error(t("payrollSendFailed"));
          }
        } catch (err) {
          showToast(err.message || t("payrollSendFailed"), "error");
        }
      },
      {
        onFinally: () => {
          btn.disabled = false;
          btn.textContent = originalText;
        },
      },
    );
  }

  function updateOnlineState() {
    dom.offlineBanner.classList.toggle("hidden", navigator.onLine);
    dom.syncState.textContent = navigator.onLine ? t("synced") : t("offline");
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
      .addEventListener("click", async () => {
        if (state.busy.refresh) return;
        const btn = document.getElementById("refreshBtn");
        const originalText = btn.textContent;
        await runWithBusyFlag(
          "refresh",
          async () => {
            btn.disabled = true;
            btn.textContent = t("loading");
            await Promise.all([loadReport(), loadPayroll()]);
            showToast(t("dataRefreshed"), "ok");
          },
          {
            onFinally: () => {
              btn.disabled = false;
              btn.textContent = originalText;
            },
          },
        );
      });
    document
      .getElementById("sendPayrollBtn")
      .addEventListener("click", sendPayrollReport);
    dom.menuToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleMenu();
    });
    dom.menuCloseBtn.addEventListener("click", closeMenu);
    dom.hubMenuBackdrop.addEventListener("click", closeMenu);
    document.getElementById("menuLogoutBtn").addEventListener("click", logout);
    document
      .getElementById("menuRefreshBtn")
      .addEventListener("click", async () => {
        if (state.busy.refresh) return;
        closeMenu();
        const btn = document.getElementById("menuRefreshBtn");
        const originalText = btn.textContent;
        await runWithBusyFlag(
          "refresh",
          async () => {
            btn.disabled = true;
            btn.textContent = t("loading");
            await Promise.all([loadReport(), loadPayroll()]);
            showToast(t("dataRefreshed"), "ok");
          },
          {
            onFinally: () => {
              btn.disabled = false;
              btn.textContent = originalText;
            },
          },
        );
      });
    dom.langSelect.addEventListener("change", () => {
      state.lang = dom.langSelect.value.toLowerCase();
      localStorage.setItem("CLS_Lang", state.lang);
      applyLanguage();
      showToast(`${t("languageUpdated")}: ${state.lang.toUpperCase()}`, "ok");
    });
    dom.rangeSelect.addEventListener("change", loadPayroll);

    document
      .getElementById("applyViewBtn")
      .addEventListener("click", async () => {
        if (state.busy.applyView) return;
        const btn = document.getElementById("applyViewBtn");
        const originalText = btn.textContent;
        await runWithBusyFlag(
          "applyView",
          async () => {
            btn.disabled = true;
            btn.textContent = t("loading");
            state.viewAsWorker = dom.viewAsSelect.value || "";
            await Promise.all([loadReport(), loadPayroll()]);
            showToast(
              state.viewAsWorker
                ? `${t("viewingAs")} ${state.viewAsWorker}`
                : t("viewCleared"),
              "ok",
            );
          },
          {
            onFinally: () => {
              btn.disabled = false;
              btn.textContent = originalText;
            },
          },
        );
      });

    document
      .getElementById("clearViewBtn")
      .addEventListener("click", async () => {
        if (state.busy.clearView) return;
        const btn = document.getElementById("clearViewBtn");
        const originalText = btn.textContent;
        await runWithBusyFlag(
          "clearView",
          async () => {
            btn.disabled = true;
            btn.textContent = t("loading");
            state.viewAsWorker = "";
            dom.viewAsSelect.value = "";
            await Promise.all([loadReport(), loadPayroll()]);
            showToast(t("returnedToOwnView"), "ok");
          },
          {
            onFinally: () => {
              btn.disabled = false;
              btn.textContent = originalText;
            },
          },
        );
      });

    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
    document.addEventListener("click", (event) => {
      if (
        !dom.hubMenu.contains(event.target) &&
        !dom.menuToggle.contains(event.target)
      ) {
        closeMenu();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  async function init() {
    if (!state.workerId) {
      location.href = "employeelogin.html";
      return;
    }

    dom.userChip.textContent = `${state.displayName} (${state.workerId})`;
    applyLanguage();
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
        showToast(t("roleCheckLimited"), "error");
      }
    } catch (_err) {
      showToast(t("roleCheckUnavailable"), "error");
    }

    try {
      await Promise.all([loadReport(), loadPayroll()]);
    } catch (err) {
      showToast(`${t("dataLoadError")}: ${err.message || err}`, "error");
    }
  }

  init();
})();
