/* ================================
   API CONFIGURATION
   ================================ */
const API_BASE = "https://cls-proxy.s-garay.workers.dev";

/* ================================
   DEVICE DETECTION UTILITIES
   ================================ */
/**
 * Detect device type from user agent
 * @returns {string} Device type (iPhone, iPad, Android, Windows, macOS, Linux, Unknown)
 */
function getDeviceType() {
  const ua = navigator.userAgent;

  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows";
  if (/Macintosh|Mac OS X/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";

  return "Unknown";
}

/**
 * Detect browser type from user agent
 * @returns {string} Browser name
 */
function getBrowserType() {
  const ua = navigator.userAgent;

  // Check for specific browsers
  if (/Edg\//.test(ua)) return "Edge";
  if (/Chrome/.test(ua) && !/Edg/.test(ua)) return "Chrome";
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return "Safari";
  if (/Firefox/.test(ua)) return "Firefox";
  if (/MSIE|Trident/.test(ua)) return "IE";
  if (/Opera|OPR/.test(ua)) return "Opera";

  return "Unknown Browser";
}

/**
 * Get comprehensive device information for logging
 * @returns {Object} Device info object
 */
function getDeviceInfo() {
  const deviceType = getDeviceType();
  const browserType = getBrowserType();
  const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);

  return {
    type: deviceType,
    browser: browserType,
    isMobile: isMobile,
    platform: navigator.platform || "Unknown",
    language: navigator.language || "en",
    userAgent: navigator.userAgent,
    screenSize: `${screen.width}x${screen.height}`,
    displayString: `${deviceType} - ${browserType}`,
  };
}

/* ================================
   CENTRALIZED MULTILINGUAL TEXT
   ================================ */
const CLS_TEXT = {
  pwa: {
    installPrompt: {
      en: "📲 Install CLS Employee App for faster access and offline features!",
      es: "📲 ¡Instala la App de Empleado CLS para un acceso más rápido y funciones sin conexión!",
      pt: "📲 Instale o App do Funcionário CLS para acesso mais rápido e recursos offline!",
    },
    installButton: {
      en: "Install CLS Employee App",
      es: "Instalar App de Empleado CLS",
      pt: "Instalar App do Funcionário CLS",
    },
    installing: {
      en: "Installing...",
      es: "Instalando...",
      pt: "Instalando...",
    },
    installed: {
      en: "App installed successfully!",
      es: "¡Aplicación instalada con éxito!",
      pt: "Aplicativo instalado com sucesso!",
    },
    dismissed: {
      en: "Installation skipped.",
      es: "Instalación omitida.",
      pt: "Instalação ignorada.",
    },
    laterButton: {
      en: "Later",
      es: "Más tarde",
      pt: "Depois",
    },
  },
  login: {
    sending: {
      en: "⏳ Logging in...",
      es: "⏳ Iniciando sesión...",
      pt: "⏳ Entrando...",
    },
    success: {
      en: "✅ Login successful! Redirecting...",
      es: "✅ ¡Inicio de sesión exitoso! Redirigiendo...",
      pt: "✅ Login realizado com sucesso! Redirecionando...",
    },
    invalid: {
      en: "❌ Invalid email or password.",
      es: "❌ Correo o contraseña inválidos.",
      pt: "❌ E-mail ou senha inválidos.",
    },
    error: {
      en: "⚠️ Error connecting to server.",
      es: "⚠️ Error al conectar con el servidor.",
      pt: "⚠️ Erro ao conectar ao servidor.",
    },
    offline: {
      en: "You're offline — please connect to the internet.",
      es: "Estás sin conexión — conéctate a Internet.",
      pt: "Você está offline — conecte-se à Internet.",
    },
    missing: {
      en: "⚠️ Please enter both email and password.",
      es: "⚠️ Por favor ingrese correo y contraseña.",
      pt: "⚠️ Por favor, insira email e senha.",
    },
    serverError: {
      en: "⚠️ Server error. Try again later.",
      es: "⚠️ Error del servidor. Intente nuevamente.",
      pt: "⚠️ Erro no servidor. Tente novamente.",
    },
  },
  pwaStatus: {
    offlineMode: {
      en: "📱 Offline Mode Active",
      es: "📱 Modo Sin Conexión Activo",
      pt: "📱 Modo Offline Ativo",
    },
    installedPwa: {
      en: "📱 App Mode: Installed PWA",
      es: "📱 Modo App: PWA Instalada",
      pt: "📱 Modo App: PWA Instalado",
    },
    serviceWorkerActive: {
      en: "🔄 App Mode: Online",
      es: "🔄 Modo App: En Línea",
      pt: "🔄 Modo App: Online",
    },
    defaultActive: {
      en: "📱 App Mode Active",
      es: "📱 Modo App Activo",
      pt: "📱 Modo App Ativo",
    },
  },
  dashboard: {
    greeting: {
      en: "Welcome",
      es: "¡Bienvenido",
      pt: "Bem-vindo",
    },
    sessionExpired: {
      en: "Session expired. Please log in again.",
      es: "Sesión expirada. Por favor, inicie sesión nuevamente.",
      pt: "Sessão expirada. Por favor, faça login novamente.",
    },
    workerIdLabel: {
      en: "Worker ID",
      es: "ID de Empleado",
      pt: "ID do Funcionário",
    },
  },
};

// Helper function to get text with placeholder replacement
function getText(path, lang, placeholders = []) {
  const keys = path.split(".");
  let text = CLS_TEXT;

  // Navigate through the object structure
  for (const key of keys) {
    text = text[key];
    if (!text) break;
  }

  // Get the text for the language, fallback to English
  let result = text?.[lang] || text?.en || "";

  // Replace placeholders {0}, {1}, etc.
  placeholders.forEach((placeholder, index) => {
    result = result.replace(`{${index}}`, placeholder);
  });

  return result;
}

// Make CLS_TEXT and helper function globally accessible
window.CLS_TEXT = CLS_TEXT;
window.getText = getText;

// Legacy PWA_TEXT compatibility
const PWA_TEXT = CLS_TEXT.pwa;
window.PWA_TEXT = PWA_TEXT;

/* ================================
   PWA INSTALL PROMPT SYSTEM
   ================================ */
let deferredPrompt;

function initPwaInstallPrompt() {
  console.log("🔧 Initializing PWA install prompt system");

  // Listen for the beforeinstallprompt event
  window.addEventListener("beforeinstallprompt", (e) => {
    console.log("📲 PWA install prompt available");
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;

    // Show install banner if present
    showInstallBanner();

    // Show floating install button if present
    showFloatingInstallButton();
  });

  // Listen for app installed event
  window.addEventListener("appinstalled", (e) => {
    console.log("✅ PWA was installed successfully");
    hideInstallElements();
    deferredPrompt = null;
  });

  // Setup install button click handlers
  setupInstallButtons();
}

function showInstallBanner() {
  const banner = document.getElementById("pwaInstallBanner");
  if (banner) {
    banner.style.display = "block";
    console.log("📱 PWA install banner shown");
  }
}

function showFloatingInstallButton() {
  const floatingBtn = document.querySelector(".floating-install-btn");
  if (floatingBtn) {
    floatingBtn.style.display = "flex";
    console.log("🎈 PWA floating install button shown");
  }
}

function hideInstallElements() {
  const banner = document.getElementById("pwaInstallBanner");
  const floatingBtn = document.querySelector(".floating-install-btn");

  if (banner) banner.style.display = "none";
  if (floatingBtn) floatingBtn.style.display = "none";

  console.log("👻 PWA install elements hidden");
}

function setupInstallButtons() {
  // Setup main install button
  const installBtn = document.getElementById("installPwaBtn");
  if (installBtn) {
    installBtn.addEventListener("click", handleInstallClick);
  }

  // Setup floating install button
  const floatingBtn = document.querySelector(".floating-install-btn");
  if (floatingBtn) {
    floatingBtn.addEventListener("click", handleInstallClick);
  }

  // Setup banner dismiss button
  const dismissBtn = document.getElementById("dismissPwaBtn");
  if (dismissBtn) {
    dismissBtn.addEventListener("click", () => {
      const banner = document.getElementById("pwaInstallBanner");
      if (banner) banner.style.display = "none";
    });
  }
}

async function handleInstallClick() {
  if (!deferredPrompt) {
    console.log("❌ No install prompt available");
    return;
  }

  console.log("🚀 Triggering PWA install prompt");

  // Show the install prompt
  deferredPrompt.prompt();

  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.userChoice;

  if (outcome === "accepted") {
    console.log("✅ User accepted the install prompt");
  } else {
    console.log("❌ User dismissed the install prompt");
  }

  // Clear the deferredPrompt so it can only be used once
  deferredPrompt = null;
}

// Device Type Detection Function
function getDeviceType() {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  if (/android/i.test(ua)) return "Android";
  if (/iPad|iPhone|iPod/.test(ua)) return "iOS";
  if (/Macintosh|Mac OS X/.test(ua) && !/Mobile/.test(ua)) return "Mac Desktop";
  if (/Windows NT/.test(ua)) return "Windows Desktop";
  if (/Linux/.test(ua)) return "Linux Desktop";
  return "Unknown";
}

// Browser Detection Function
function getBrowserType() {
  const ua = navigator.userAgent;

  // Check for Edge first (since it contains "Chrome" in user agent)
  if (/Edg/.test(ua)) return "Microsoft Edge";

  // Check for Chrome (must be before Safari since Chrome contains "Safari")
  if (/Chrome/.test(ua) && !/Edg/.test(ua)) return "Google Chrome";

  // Check for Safari
  if (/Safari/.test(ua) && !/Chrome/.test(ua)) return "Safari";

  // Check for Firefox
  if (/Firefox/.test(ua)) return "Mozilla Firefox";

  // Check for Opera
  if (/Opera|OPR/.test(ua)) return "Opera";

  // Check for Internet Explorer
  if (/Trident|MSIE/.test(ua)) return "Internet Explorer";

  return "Unknown Browser";
}

/* ================================
   SHARED COMPONENTS
   ================================ */

// Global Navbar Functionality
function initializeNavbar() {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("primary-nav");

  if (!header || !toggle || !nav) {
    return;
  }

  function setOpen(isOpen) {
    header.classList.toggle("menu-open", isOpen);
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    toggle.setAttribute(
      "aria-label",
      isOpen ? "Close navigation" : "Open navigation",
    );
    document.body.style.overflow = isOpen ? "hidden" : "";
  }

  toggle.addEventListener("click", function () {
    setOpen(!header.classList.contains("menu-open"));
  });

  nav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      setOpen(false);
    });
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 900) {
      setOpen(false);
    }
  });
}

// Load Navbar Component
async function loadNavbar() {
  try {
    const response = await fetch("components/navbar.html");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const navbarHTML = await response.text();

    const navbarContainer = document.getElementById("navbar-container");
    if (navbarContainer) {
      navbarContainer.innerHTML = navbarHTML;

      // Check if we're on the dashboard page and customize navigation
      const currentPage =
        window.location.pathname.split("/").pop() || "index.html";
      if (
        currentPage === "employeeDashboard.html" ||
        currentPage === "employeeDashboard-refactored.html"
      ) {
        const navLinks =
          document.querySelector(".nav-links") ||
          document.getElementById("primary-nav");

        // Replace nav links with dashboard/admin/logout menu + theme toggle
        if (navLinks) {
          const storedRole = localStorage.getItem("CLS_Role") || "";
          const isAdmin = storedRole.toLowerCase() === "admin";
          const adminLinkHtml = isAdmin
            ? '<li><a href="adminDashboard.html" id="navAdminDashboard" data-en="Admin Dashboard" data-es="Panel Admin" data-pt="Painel Admin">Admin Dashboard</a></li>'
            : "";
          const adminLinkHtmlPlain = isAdmin
            ? '<a href="adminDashboard.html" id="navAdminDashboard" data-en="Admin Dashboard" data-es="Panel Admin" data-pt="Painel Admin">Admin Dashboard</a>'
            : "";

          const dashboardNavHtml =
            navLinks.tagName === "UL"
              ? `
            ${adminLinkHtml}
            <li><a href="#" id="navLogout" data-en="Logout" data-es="Cerrar Sesión" data-pt="Sair">Logout</a></li>
            <li class="nav-theme-toggle">
              <button id="themeToggle" onclick="toggleTheme()" title="Toggle Light/Dark Theme" aria-label="Toggle theme">
                <i data-feather="moon" class="theme-icon theme-icon-dark"></i>
                <i data-feather="sun" class="theme-icon theme-icon-light"></i>
              </button>
            </li>
          `
              : `
            ${adminLinkHtmlPlain}
            <a href="#" id="navLogout" data-en="Logout" data-es="Cerrar Sesión" data-pt="Sair">Logout</a>
          `;

          navLinks.innerHTML = dashboardNavHtml;

          // Add language dropdown after nav-links (separate container)
          const navbarContainer = navLinks.parentElement;
          let langContainer = navbarContainer.querySelector(
            ".nav-language-container",
          );
          if (!langContainer) {
            langContainer = document.createElement("div");
            langContainer.className = "nav-language-container";
            langContainer.innerHTML = `
              <select id="languageSelect" onchange="setUserLanguage(this.value)" aria-label="Select Language">
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="pt">Português</option>
              </select>
            `;
            navbarContainer.appendChild(langContainer);
          }

          // Set current language in dropdown
          const currentLang = getPreferredLanguage();
          setTimeout(() => {
            const langSelect = document.getElementById("languageSelect");
            if (langSelect) langSelect.value = currentLang;
          }, 0);

          // Re-initialize Feather icons after dynamic content load
          if (typeof feather !== "undefined") {
            feather.replace();
          }

          // Attach logout handler
          setTimeout(() => {
            const logoutLink = document.getElementById("navLogout");
            if (logoutLink) {
              logoutLink.addEventListener("click", (e) => {
                e.preventDefault();
                if (typeof window.logout === "function") {
                  window.logout();
                } else {
                  localStorage.clear();
                  window.location.href = "employeelogin.html";
                }
              });
            }
          }, 100);
        }

        // Initialize navbar functionality
        initializeNavbar();

        // Initialize language
        window.switchLanguage = switchLanguage;
        window.setUserLanguage = setUserLanguage;
        switchLanguage(getPreferredLanguage());

        // Update PWA status icon after navbar is loaded
        if (typeof updatePWAStatus === "function") {
          setTimeout(() => updatePWAStatus(), 100);
        }

        // Dispatch event to notify that navbar is ready
        window.dispatchEvent(new CustomEvent("navbarLoaded"));
      } else {
        // Initialize navbar functionality for other pages
        initializeNavbar();

        // Set active page highlighting
        setActiveNavLink();
      }
    } else {
      console.warn("Navbar container not found");
    }
  } catch (error) {
    console.error("Error loading navbar:", error);
  }
}

// Set Active Navigation Link
function setActiveNavLink() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const navLinks = document.querySelectorAll(".nav-links a, #primary-nav a");

  // Remove any existing active classes
  navLinks.forEach((link) => {
    link.classList.remove("active");
    link.removeAttribute("aria-current");
  });

  // Find and highlight the current page link
  navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (
      href === currentPage ||
      (currentPage === "" && href === "index.html") ||
      (currentPage === "/" && href === "index.html")
    ) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }
  });
}

async function loadFooter() {
  try {
    const response = await fetch("components/footer.html");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const footerHTML = await response.text();

    const footerContainer = document.getElementById("footer-container");
    if (footerContainer) {
      footerContainer.innerHTML = footerHTML;

      // Make sure switchLanguage is globally available
      window.switchLanguage = switchLanguage;
      window.setUserLanguage = setUserLanguage;

      // Initialize language after footer is loaded
      switchLanguage(getPreferredLanguage());
    } else {
      console.log("Footer container not found - page may have static footer");
      // Still make switchLanguage available and initialize language for pages with static footers
      window.switchLanguage = switchLanguage;
      window.setUserLanguage = setUserLanguage;
      switchLanguage(getPreferredLanguage());
    }
  } catch (error) {
    console.error("Error loading footer:", error);
  }
}

/* ================================
   GLOBAL NAVIGATION & LANGUAGE
   ================================ */

// Theme Toggle Function
function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute("data-theme") || "dark";
  const newTheme = currentTheme === "dark" ? "light" : "dark";

  html.setAttribute("data-theme", newTheme);
  localStorage.setItem("CLS_Theme", newTheme);

  // Re-render feather icons after theme change
  if (typeof feather !== "undefined") {
    feather.replace();
  }

  // Dispatch event for other components to react
  window.dispatchEvent(
    new CustomEvent("themeChanged", { detail: { theme: newTheme } }),
  );
}

// Initialize theme on page load (dashboard only)
function initTheme() {
  // Only initialize theme on dashboard page
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  if (currentPage !== "employeeDashboard.html") {
    return; // Skip theme initialization for non-dashboard pages
  }

  // Check if user has a saved preference, otherwise use system preference
  let theme = localStorage.getItem("CLS_Theme");

  if (!theme) {
    // Detect system preference
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    theme = prefersDark ? "dark" : "light";
  }

  document.documentElement.setAttribute("data-theme", theme);

  // Listen for system theme changes (if user hasn't set a preference)
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      // Only auto-update if user hasn't manually set a preference
      if (!localStorage.getItem("CLS_Theme")) {
        const newTheme = e.matches ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", newTheme);
        if (typeof feather !== "undefined") {
          feather.replace();
        }
      }
    });
}

function getBrowserLanguagePreference() {
  const browserLang = navigator.language || navigator.userLanguage || "en";
  if (browserLang.startsWith("es")) {
    return "es";
  }
  if (browserLang.startsWith("pt")) {
    return "pt";
  }
  return "en";
}

function getPreferredLanguage() {
  const storedLang = localStorage.getItem("CLS_Lang");
  const hasManualPreference =
    localStorage.getItem("CLS_Lang_Manual") === "true";

  if (hasManualPreference && storedLang) {
    return storedLang;
  }

  return getBrowserLanguagePreference();
}

function setUserLanguage(lang) {
  localStorage.setItem("CLS_Lang_Manual", "true");
  switchLanguage(lang);
}

function switchLanguage(lang) {
  localStorage.setItem("CLS_Lang", lang);

  // Update all text elements, but skip form elements that might have complex structure
  document.querySelectorAll("[data-en]").forEach((el) => {
    // Skip elements inside form steps to prevent breaking the form wizard
    if (el.closest(".form-step") || el.closest("#applicationForm")) {
      return;
    }

    const text = el.getAttribute(`data-${lang}`) || el.getAttribute("data-en");
    if (text) el.innerHTML = text;
  });

  // Update language dropdown selection
  const languageSelect = document.getElementById("languageSelect");
  if (languageSelect) {
    languageSelect.value = lang;
  }

  // Highlight active button (for legacy buttons if any)
  document.querySelectorAll(".language-toggle button").forEach((btn) => {
    const btnLang =
      btn.getAttribute("data-lang") ||
      btn.getAttribute("onclick")?.match(/switchLanguage\('(\w+)'\)/)?.[1];
    btn.classList.toggle("active", btnLang === lang);
  });

  // Update placeholders for current page
  const currentPage = document.body.dataset.page;
  if (currentPage === "apply") {
    applyPlaceholders(lang);
  } else if (currentPage === "login") {
    loginPlaceholders(lang);
  } else if (currentPage === "contact") {
    contactPlaceholders(lang);
  }

  // Update floating install button if present
  const floatingBtn = document.querySelector(".floating-install-btn");
  if (floatingBtn && floatingBtn.dataset.lang !== lang) {
    floatingBtn.dataset.lang = lang;
    floatingBtn.innerHTML = `📲 <strong>${getText("pwa.installButton", lang)}</strong>`;
  }

  // Update PWA banner when language changes
  const bannerTextEl = document.querySelector("#pwaInstallBanner [data-en]");
  if (bannerTextEl) {
    bannerTextEl.textContent = getText("pwa.installPrompt", lang);
  }

  // Update PWA button texts
  const installBtn = document.getElementById("installPwaBtn");
  const dismissBtn = document.getElementById("dismissPwaBtn");
  if (installBtn) installBtn.textContent = getText("pwa.installButton", lang);
  if (dismissBtn) dismissBtn.textContent = getText("pwa.laterButton", lang);

  // Update PWA status if present (for dashboard page)
  if (typeof updatePWAStatus === "function") {
    updatePWAStatus();
  }

  // Dispatch event for form to handle its own language updates
  window.dispatchEvent(
    new CustomEvent("languageChanged", {
      detail: { language: lang },
    }),
  );
}

function initLanguageSystem() {
  switchLanguage(getPreferredLanguage());
}

/* Run on page load */
// Use a function that works whether DOMContentLoaded has fired or not
function initializeApp() {
  initTheme(); // Initialize theme before loading components
  loadNavbar(); // Load shared navbar component
  loadFooter(); // Load shared footer component
  initLanguageSystem();
  initPwaInstallPrompt(); // Initialize unified PWA install system

  // Determine current page for page-specific logic
  const page = document.body.dataset.page;
  initPage(page);
}

// Handle both cases: if DOM is already ready or if we need to wait
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  // DOM is already ready, run immediately
  initializeApp();
}

/* ================================
   SESSION MANAGEMENT
   ================================ */

// Logout function for dashboard
function logout() {
  // Clear all session data
  localStorage.removeItem("CLS_WorkerID");
  localStorage.removeItem("CLS_DisplayName");
  localStorage.removeItem("CLS_Email");
  localStorage.removeItem("CLS_RememberUser");
  localStorage.removeItem("CLS_SessionExpiry");

  // Redirect to login page
  window.location.href = "employeelogin.html";
}

function checkValidSession() {
  const workerId = localStorage.getItem("CLS_WorkerID");
  const rememberUser = localStorage.getItem("CLS_RememberUser");
  const sessionExpiry = localStorage.getItem("CLS_SessionExpiry");

  if (!workerId) return false;

  // If user chose "stay logged in", session never expires
  if (rememberUser === "true") {
    return true;
  }

  // For 8-hour sessions, check expiry
  if (!sessionExpiry) return false;

  const now = Date.now();
  const expiry = parseInt(sessionExpiry);

  if (now > expiry) {
    // Session expired, clear data
    clearUserSession();
    return false;
  }

  return true;
}

function clearUserSession() {
  localStorage.removeItem("CLS_WorkerID");
  localStorage.removeItem("CLS_WorkerName");
  localStorage.removeItem("CLS_Email");
  localStorage.removeItem("CLS_RememberUser");
  localStorage.removeItem("CLS_SessionExpiry");
}

function getUserDisplayName() {
  return localStorage.getItem("CLS_WorkerName") || "Employee";
}

/* ================================
   PAGE ROUTER
   ================================ */
function initPage(page) {
  switch (page) {
    case "apply":
      initApplyForm();
      break;

    case "signup":
      initSignupForm();
      break;

    case "login":
      initLoginForm();
      break;

    case "contact":
      initContactForm();
      break;

    default:
      // Page loaded without specific initialization
      break;
  }
}

/* ================================
   FORM MODULES
   ================================ */

// Apply Form Module

// Global placeholder function for Apply form (accessible from language switcher)
function applyPlaceholders(lang) {
  document.querySelectorAll("[data-ph-en]").forEach((el) => {
    const val =
      lang === "es"
        ? el.getAttribute("data-ph-es")
        : lang === "pt"
          ? el.getAttribute("data-ph-pt")
          : el.getAttribute("data-ph-en");
    if (val) el.setAttribute("placeholder", val);
  });
}

// Global placeholder function for Login form (accessible from language switcher)
function loginPlaceholders(lang) {
  const placeholders = {
    email: {
      en: "Work Email",
      es: "Correo de Trabajo",
      pt: "Email de Trabalho",
    },
    password: { en: "Password", es: "Contraseña", pt: "Senha" },
  };

  Object.keys(placeholders).forEach((id) => {
    const el = document.getElementById(id);
    if (el && placeholders[id][lang]) {
      el.setAttribute("placeholder", placeholders[id][lang]);
    }
  });
}

// Global placeholder function for Contact form (accessible from language switcher)
function contactPlaceholders(lang) {
  document.querySelectorAll("[data-ph-en]").forEach((el) => {
    const val =
      el.getAttribute(`data-ph-${lang}`) || el.getAttribute("data-ph-en");
    if (val) el.setAttribute("placeholder", val);
  });
}

function initApplyForm() {
  // Check if we have the new multi-step application form or the old form
  const newForm = document.getElementById("applicationForm");
  const oldForm = document.getElementById("cls-apply");

  if (newForm) {
    // New multi-step form is already initialized by its own script in apply.html
    // Don't interfere with form elements, just apply language to non-form elements
    const lang = localStorage.getItem("CLS_Lang") || "en";
    document.querySelectorAll("[data-en]").forEach((el) => {
      // Skip form elements to prevent breaking the wizard
      if (el.closest(".form-step") || el.closest("#applicationForm")) {
        return;
      }

      const text =
        el.getAttribute(`data-${lang}`) || el.getAttribute("data-en");
      if (text) el.innerHTML = text;
    });

    // Apply language to placeholders if needed
    applyPlaceholders(lang);
    return;
  }

  if (!oldForm) return;

  const statusEl = document.getElementById("status");
  const MESSAGES = {
    en: {
      sending: "Sending...",
      success: "Thanks. We received your application.",
      error: "Error. Please try again.",
    },
    es: {
      sending: "Enviando...",
      success: "Gracias. Recibimos su solicitud.",
      error: "Error. Intente de nuevo.",
    },
    pt: {
      sending: "Enviando...",
      success: "Obrigado. Recebemos sua candidatura.",
      error: "Erro. Tente novamente.",
    },
  };

  function setDobMax() {
    // Limit date selection to 18+ only
    const today = new Date();
    const minAgeDate = new Date(
      today.getFullYear() - 18,
      today.getMonth(),
      today.getDate(),
    );
    const dobInput = document.getElementById("dob");
    if (dobInput) dobInput.max = minAgeDate.toISOString().split("T")[0];
  }

  function validateAge() {
    const dobInput = document.getElementById("dob");
    const errorEl = document.getElementById("dobError");
    if (!dobInput || !oldForm) return;

    const currentLang =
      oldForm.querySelector('input[name="ui_lang"]').value || "en";
    const messages = {
      en: "Applicant must be at least 18 years old.",
      es: "El solicitante debe tener al menos 18 años.",
      pt: "O candidato deve ter pelo menos 18 anos.",
    };

    const dobValue = dobInput.value;
    if (!dobValue) {
      if (errorEl) errorEl.style.display = "none";
      dobInput.setCustomValidity("");
      return;
    }

    const dob = new Date(dobValue);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    const hasBirthdayPassed =
      today.getMonth() > dob.getMonth() ||
      (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
    const actualAge = hasBirthdayPassed ? age : age - 1;

    if (actualAge < 18) {
      if (errorEl) {
        errorEl.style.display = "block";
        errorEl.textContent = messages[currentLang];
      }
      dobInput.setCustomValidity(messages[currentLang]);
    } else {
      if (errorEl) errorEl.style.display = "none";
      dobInput.setCustomValidity("");
    }
  }

  function updateDocNote() {
    const select = document.getElementById("work_authorization");
    const val = select?.value || "";
    const descNote = document.getElementById("authDescription");
    const docNote = document.getElementById("docNote");
    const lang = oldForm?.querySelector('input[name="ui_lang"]')?.value || "en";

    // Reset notes if no value selected
    if (!val) {
      if (descNote) descNote.textContent = "";
      if (docNote) docNote.textContent = "";
      return;
    }

    const info = {
      Citizen: {
        desc: {
          en: "You are a U.S. citizen by birth or naturalization.",
          es: "Usted es ciudadano estadounidense por nacimiento o naturalización.",
          pt: "Você é cidadão americano por nascimento ou naturalização.",
        },
        docs: {
          en: "Driver's license and Social Security card, or U.S. passport.",
          es: "Licencia de conducir y tarjeta del Seguro Social, o pasaporte estadounidense.",
          pt: "Carteira de motorista e cartão do Seguro Social, ou passaporte dos EUA.",
        },
      },
      "Permanent Resident": {
        desc: {
          en: "You have lawful permanent residence in the United States.",
          es: "Usted tiene residencia permanente legal en los Estados Unidos.",
          pt: "Você tem residência permanente legal nos Estados Unidos.",
        },
        docs: {
          en: "Permanent Resident Card (Green Card).",
          es: "Tarjeta de Residente Permanente (Green Card).",
          pt: "Cartão de Residente Permanente (Green Card).",
        },
      },
      "Work Permit (EAD)": {
        desc: {
          en: "You have employment authorization from USCIS.",
          es: "Usted tiene autorización de empleo de USCIS.",
          pt: "Você tem autorização de emprego do USCIS.",
        },
        docs: {
          en: "Employment Authorization Document (EAD) card issued by USCIS.",
          es: "Documento de Autorización de Empleo (EAD) emitido por USCIS.",
          pt: "Documento de Autorização de Emprego (EAD) emitido pelo USCIS.",
        },
      },
      "Visa (H-2B)": {
        desc: {
          en: "You have a temporary worker visa for seasonal employment.",
          es: "Usted tiene una visa de trabajador temporal para empleo estacional.",
          pt: "Você tem um visto de trabalhador temporário para emprego sazonal.",
        },
        docs: {
          en: "Copy of H-2B visa and passport photo page.",
          es: "Copia de la visa H-2B y página del pasaporte con foto.",
          pt: "Cópia do visto H-2B e da página do passaporte com foto.",
        },
      },
      "Visa (Other)": {
        desc: {
          en: "You have another type of work-authorized visa.",
          es: "Usted tiene otro tipo de visa autorizada para trabajar.",
          pt: "Você tem outro tipo de visto autorizado para trabalhar.",
        },
        docs: {
          en: "Copy of visa and work authorization letter.",
          es: "Copia de la visa y carta de autorización de trabajo.",
          pt: "Cópia do visto e carta de autorização de trabalho.",
        },
      },
      "Not Authorized": {
        desc: {
          en: "You do not currently have work authorization.",
          es: "Actualmente no tiene autorización de trabajo.",
          pt: "Você atualmente não tem autorização de trabalho.",
        },
        docs: {
          en: "⚠️ You are not authorized to work in the United States.",
          es: "⚠️ No está autorizado para trabajar en los Estados Unidos.",
          pt: "⚠️ Você não está autorizado a trabalhar nos Estados Unidos.",
        },
      },
    };

    if (info[val]) {
      if (descNote) descNote.textContent = info[val].desc[lang];
      if (docNote) docNote.textContent = "📄 " + info[val].docs[lang];
    } else {
      if (descNote) descNote.textContent = "";
      if (docNote) docNote.textContent = "";
    }
  }

  // Initialize form
  setDobMax();
  oldForm.querySelector('input[name="startedAt"]').value = String(Date.now());

  // Set up event listeners
  const dobInput = document.getElementById("dob");
  if (dobInput) {
    dobInput.addEventListener("focus", setDobMax);
    dobInput.addEventListener("input", validateAge);
    dobInput.addEventListener("change", validateAge);
  }

  const authSelect = document.getElementById("work_authorization");
  if (authSelect) authSelect.addEventListener("change", updateDocNote);

  // Apply current language placeholders on form init
  const currentLang =
    oldForm.querySelector('input[name="ui_lang"]').value || "en";
  applyPlaceholders(currentLang);

  // Form submission handler
  oldForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentLang =
      oldForm.querySelector('input[name="ui_lang"]').value || "en";
    if (statusEl) statusEl.textContent = MESSAGES[currentLang].sending;

    try {
      const body = new URLSearchParams(new FormData(oldForm));
      const res = await fetch(oldForm.action, { method: "POST", body });
      let msg = MESSAGES[currentLang][res.ok ? "success" : "error"];
      try {
        const j = await res.json();
        if (j?.message) msg = j.message;
      } catch {}
      if (statusEl) statusEl.textContent = msg;
      if (res.ok) {
        oldForm.reset();
        oldForm.querySelector('input[name="ui_lang"]').value = currentLang;
        applyPlaceholders(currentLang);
      }
    } catch {
      if (statusEl) statusEl.textContent = MESSAGES[currentLang].error;
    }
  });
}

// ======================================================
// BIOMETRIC AUTHENTICATION MODULE REMOVED (2025-11-04)
// ======================================================
// All biometric functions (WebAuthn, Face ID, Touch ID, Windows Hello, Fingerprint)
// have been removed as part of authentication simplification.
// The application now uses standard email/password authentication only.

// Employee Login Module
function initLoginForm() {
  console.log("🔧 initLoginForm() called");
  const form = document.getElementById("loginForm");
  if (!form) {
    console.error("❌ Login form not found!");
    return;
  }

  if (form.hasAttribute("data-initialized")) {
    console.log("ℹ️ Login form already initialized, skipping");
    return;
  }

  console.log("✅ Login form found, setting up event handlers");

  const statusEl = document.getElementById("status");
  let isSubmitting = false;

  form.addEventListener("submit", async (e) => {
    console.log("🔥 Login form submitted!");
    e.preventDefault();

    if (isSubmitting) {
      console.warn("⚠️ Login already in progress, ignoring duplicate submission");
      return;
    }

    isSubmitting = true;

    const currentLang = localStorage.getItem("CLS_Lang") || "en";
    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value.trim();
    const loginBtn = document.getElementById("loginBtn");

    if (!email || !password) {
      if (statusEl) statusEl.textContent = getText("login.missing", currentLang);
      isSubmitting = false;
      return;
    }

    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.dataset.originalText = loginBtn.textContent;
      loginBtn.textContent = "⏳ Logging in...";
    }

    const loadingOverlay = document.getElementById("loadingOverlay");
    const loadingText = document.getElementById("loadingText");
    if (loadingOverlay) {
      loadingOverlay.classList.add("active");
      if (loadingText) loadingText.textContent = "⏳ Logging in...";
    }

    if (statusEl) statusEl.textContent = getText("login.sending", currentLang);

    try {
      const deviceType = getDeviceType();
      const browserType = getBrowserType();
      const deviceInfo = `${deviceType} - ${browserType}`;

      const res = await fetch(
        `${API_BASE}?action=login&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&device=${encodeURIComponent(deviceInfo)}`,
      );

      const data = await res.json();

      if (data.success) {
        localStorage.setItem("CLS_WorkerID", data.workerId);
        localStorage.setItem("CLS_WorkerName", data.displayName);
        localStorage.setItem("CLS_Email", data.email);
        localStorage.setItem("CLS_W9Status", data.w9Status || "none");
        localStorage.setItem("CLS_Role", data.role || "Worker");
        localStorage.setItem("CLS_AuthToken", data.authToken || "");
        localStorage.setItem("CLS_AuthTokenExp", String(data.authTokenExp || ""));
        localStorage.setItem("CLS_RememberUser", "true");
        localStorage.removeItem("CLS_SessionExpiry");

        if (statusEl) statusEl.textContent = getText("login.success", currentLang);

        if ("serviceWorker" in navigator) {
          try {
            await navigator.serviceWorker.register("service-worker-employee.js", { scope: "./" });
            console.log("✅ Service Worker preloaded before redirect");
          } catch (err) {
            console.warn("⚠️ SW pre-registration failed:", err);
          }
        }

        if (loadingText) loadingText.textContent = "✅ Login successful!";

        setTimeout(() => {
          window.location.href = "employeeDashboard.html";
        }, 1500);
      } else {
        if (loadingOverlay) loadingOverlay.classList.remove("active");
        if (statusEl) statusEl.textContent = data.message || getText("login.invalid", currentLang);

        isSubmitting = false;
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.textContent = loginBtn.dataset.originalText || "Login";
        }
      }
    } catch (err) {
      console.error(err);
      if (loadingOverlay) loadingOverlay.classList.remove("active");
      if (statusEl) statusEl.textContent = getText("login.error", currentLang);

      isSubmitting = false;
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = loginBtn.dataset.originalText || "Login";
      }
    }
  });

  const currentLang = localStorage.getItem("CLS_Lang") || "en";
  loginPlaceholders(currentLang);

  form.setAttribute("data-initialized", "true");
  console.log("✅ Login form initialization complete and marked");

  initPasswordToggles();
}

/* ================================
   PASSWORD VALIDATION MODULE
   ================================ */

/**
 * Calculate password strength: 'weak', 'medium', or 'strong'
 * Requires: 10+ chars, uppercase, lowercase, and number
 */
function getPasswordStrength(password) {
  if (!password) return 'weak';
  
  const hasMinLength = password.length >= 10;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  const criteria = [hasMinLength, hasUppercase, hasLowercase, hasNumber].filter(Boolean).length;
  
  if (criteria >= 4) return 'strong';
  if (criteria >= 3) return 'medium';
  return 'weak';
}

/**
 * Multilingual messages for password validation
 */
const PASSWORD_MESSAGES = {
  en: {
    weak: 'Weak',
    medium: 'Medium',
    strong: 'Strong',
    passwordMismatch: 'Passwords do not match',
    hidePassword: 'Hide password',
    showPassword: 'Show password'
  },
  es: {
    weak: 'Débil',
    medium: 'Medio',
    strong: 'Fuerte',
    passwordMismatch: 'Las contraseñas no coinciden',
    hidePassword: 'Ocultar contraseña',
    showPassword: 'Mostrar contraseña'
  },
  pt: {
    weak: 'Fraco',
    medium: 'Médio',
    strong: 'Forte',
    passwordMismatch: 'As senhas não correspondem',
    hidePassword: 'Ocultar senha',
    showPassword: 'Mostrar senha'
  }
};

/**
 * Initialize password eye-toggle buttons on the page
 */
function initPasswordToggles() {
  document.querySelectorAll('.password-toggle').forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      
      const targetId = button.getAttribute('data-target');
      const inputField = document.getElementById(targetId);
      
      if (!inputField) return;
      
      // Toggle input type
      const isPassword = inputField.type === 'password';
      inputField.type = isPassword ? 'text' : 'password';
      
      // Update button label with language-aware text
      const currentLang = localStorage.getItem('CLS_Lang') || 'en';
      const newLabel = isPassword 
        ? PASSWORD_MESSAGES[currentLang].hidePassword
        : PASSWORD_MESSAGES[currentLang].showPassword;
      
      button.setAttribute('aria-label', newLabel);
      button.setAttribute('title', newLabel);
    });
  });

  // Update eye-toggle labels when language changes
  window.addEventListener('languageChanged', (event) => {
    const lang = event.detail.language;
    document.querySelectorAll('.password-toggle').forEach(button => {
      const targetId = button.getAttribute('data-target');
      const inputField = document.getElementById(targetId);
      if (!inputField) return;
      
      const isPassword = inputField.type === 'password';
      const newLabel = isPassword
        ? PASSWORD_MESSAGES[lang].hidePassword
        : PASSWORD_MESSAGES[lang].showPassword;
      
      button.setAttribute('aria-label', newLabel);
      button.setAttribute('title', newLabel);
    });
  });
}

/**
 * Initialize signup form with password validation
 */
function initSignupForm() {
  console.log('🔧 initSignupForm() called');
  
  const form = document.getElementById('signupForm');
  if (!form) {
    console.error('❌ Signup form not found!');
    return;
  }

  // Check if already initialized
  if (form.hasAttribute('data-initialized')) {
    console.log('ℹ️ Signup form already initialized, skipping');
    return;
  }

  console.log('✅ Signup form found, setting up event handlers');

  const emailField = document.getElementById('email');
  const passwordField = document.getElementById('password');
  const confirmPasswordField = document.getElementById('confirmPassword');
  const strengthBar = document.querySelector('.password-strength__fill');
  const strengthLabel = document.querySelector('.password-strength__label');
  const mismatchElement = document.getElementById('passwordMismatch');
  const submitBtn = form.querySelector('button[type="submit"]');
  const statusEl = document.getElementById('status');

  let isSubmitting = false;

  /**
   * Update password strength meter in real-time
   */
  function updatePasswordStrength() {
    if (!passwordField || !strengthBar || !strengthLabel) return;

    const password = passwordField.value;
    const strength = getPasswordStrength(password);
    const currentLang = localStorage.getItem('CLS_Lang') || 'en';

    // Update bar width and color
    const widthPercents = { weak: 33, medium: 66, strong: 100 };
    const colors = { weak: '#ff6b6b', medium: '#ffa500', strong: '#51cf66' };

    strengthBar.style.width = `${widthPercents[strength]}%`;
    strengthBar.style.backgroundColor = colors[strength];

    // Update label
    strengthLabel.textContent = PASSWORD_MESSAGES[currentLang][strength];
    strengthLabel.style.color = colors[strength];

    // Update submit button state
    updateSubmitButtonState();
  }

  /**
   * Check if passwords match
   */
  function checkPasswordMatch() {
    if (!confirmPasswordField || !mismatchElement) return;

    const password = passwordField?.value || '';
    const confirmPassword = confirmPasswordField.value || '';

    if (confirmPassword && password !== confirmPassword) {
      mismatchElement.classList.add('show');
      return false;
    } else {
      mismatchElement.classList.remove('show');
      return true;
    }
  }

  /**
   * Update submit button state (enabled/disabled)
   */
  function updateSubmitButtonState() {
    if (!submitBtn || !passwordField) return;

    const password = passwordField.value;
    const confirmPassword = confirmPasswordField?.value || '';
    const strength = getPasswordStrength(password);
    const passwordsMatch = password === confirmPassword;
    const isValid = strength !== 'weak' && passwordsMatch && confirmPassword;

    submitBtn.disabled = !isValid;
  }

  // Listen for password input - update strength meter
  if (passwordField) {
    passwordField.addEventListener('input', updatePasswordStrength);
  }

  // Listen for confirm password input - check match
  if (confirmPasswordField) {
    confirmPasswordField.addEventListener('input', () => {
      checkPasswordMatch();
      updateSubmitButtonState();
    });
  }

  // Handle form submission
  form.addEventListener('submit', async (e) => {
    console.log('🔥 Signup form submitted!');
    e.preventDefault();

    // Prevent double submission
    if (isSubmitting) {
      console.warn('⚠️ Signup already in progress, ignoring duplicate submission');
      return;
    }

    const currentLang = localStorage.getItem('CLS_Lang') || 'en';

    // Final validation
    const email = emailField?.value.trim();
    const password = passwordField?.value.trim();
    const confirmPassword = confirmPasswordField?.value.trim();

    if (!email || !password || !confirmPassword) {
      if (statusEl) statusEl.textContent = '❌ All fields are required';
      return;
    }

    if (password !== confirmPassword) {
      if (statusEl) statusEl.textContent = PASSWORD_MESSAGES[currentLang].passwordMismatch;
      return;
    }

    if (getPasswordStrength(password) === 'weak') {
      if (statusEl) {
        statusEl.textContent = '❌ Password does not meet requirements (10+ chars, uppercase, lowercase, number)';
        statusEl.style.color = '#ff6b6b';
      }
      return;
    }

    isSubmitting = true;

    // Show loading state
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.dataset.originalText = submitBtn.textContent;
      submitBtn.textContent = 'Creating account...';
    }

    try {
      // Submit form via standard POST to Apps Script
      const formData = new FormData(form);
      const deviceInfo = getDeviceInfo();
      formData.set('device', deviceInfo.displayString);

      const response = await fetch(form.action, {
        method: 'POST',
        body: formData
      });

      const result = await response.text();
      console.log('📤 Server response:', result);

      // Show success message
      if (statusEl) {
        statusEl.textContent = '✅ Account created successfully! Redirecting to login...';
        statusEl.style.color = '#51cf66';
      }

      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = 'employeelogin.html';
      }, 2000);

    } catch (error) {
      console.error('❌ Signup error:', error);
      if (statusEl) {
        statusEl.textContent = '❌ Error creating account. Please try again.';
        statusEl.style.color = '#ff6b6b';
      }

      // Reset button
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn.dataset.originalText || 'Create Account';
      }

      isSubmitting = false;
    }
  });

  // Listen for language changes
  window.addEventListener('languageChanged', (event) => {
    const lang = event.detail.language;
    if (mismatchElement) {
      mismatchElement.textContent = PASSWORD_MESSAGES[lang].passwordMismatch;
    }
    updatePasswordStrength();
  });

  // Initialize password toggles
  initPasswordToggles();

  // Mark form as initialized
  form.setAttribute('data-initialized', 'true');
  
  console.log('✅ Signup form initialization complete');
}

// Contact Form Module
function initContactForm() {
  // Check if we have the new quote form or the old contact form
  const quoteForm = document.getElementById("quoteForm");
  const contactForm = document.getElementById("contactForm");

  if (quoteForm) {
    // New quote form is already initialized by its own script in contact.html
    // Just ensure the current language is applied for any translatable elements
    const lang = localStorage.getItem("CLS_Lang") || "en";
    document.querySelectorAll("[data-en]").forEach((el) => {
      const text =
        el.getAttribute(`data-${lang}`) || el.getAttribute("data-en");
      if (text) el.innerHTML = text;
    });

    // Apply language to placeholders if needed
    contactPlaceholders(lang);
    return;
  }

  if (!contactForm) return;

  const statusEl = document.getElementById("status");
  const MESSAGES = {
    en: {
      sending: "⏳ Sending...",
      success: "✅ Message sent successfully!",
      error: "⚠️ Please fill in all fields.",
      serverError: "❌ Error sending message. Try again later.",
    },
    es: {
      sending: "⏳ Enviando...",
      success: "✅ Mensaje enviado con éxito!",
      error: "⚠️ Por favor complete todos los campos.",
      serverError: "❌ Error al enviar el mensaje. Intente nuevamente.",
    },
    pt: {
      sending: "⏳ Enviando...",
      success: "✅ Mensagem enviada com sucesso!",
      error: "⚠️ Por favor, preencha todos os campos.",
      serverError: "❌ Erro ao enviar mensagem. Tente novamente.",
    },
  };

  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentLang = localStorage.getItem("CLS_Lang") || "en";

    const name = document.getElementById("name")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const message = document.getElementById("message")?.value.trim();

    if (!name || !email || !message) {
      statusEl.textContent = MESSAGES[currentLang].error;
      return;
    }

    statusEl.textContent = MESSAGES[currentLang].sending;

    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        body: new URLSearchParams(new FormData(contactForm)),
      });

      if (res.ok) {
        contactForm.reset();
        statusEl.textContent = MESSAGES[currentLang].success;

        // Reapply placeholders after reset
        const lang = localStorage.getItem("CLS_Lang") || "en";
        document.querySelectorAll("[data-ph-en]").forEach((el) => {
          const val =
            el.getAttribute(`data-ph-${lang}`) || el.getAttribute("data-ph-en");
          el.placeholder = val;
        });
      } else {
        statusEl.textContent = MESSAGES[currentLang].serverError;
      }
    } catch (err) {
      statusEl.textContent = MESSAGES[currentLang].serverError;
    }
  });

  // Apply current language placeholders on init
  const lang = localStorage.getItem("CLS_Lang") || "en";
  document.querySelectorAll("[data-ph-en]").forEach((el) => {
    const val =
      el.getAttribute(`data-ph-${lang}`) || el.getAttribute("data-ph-en");
    el.placeholder = val;
  });
}
