/* ================================
   API CONFIGURATION
   ================================ */
const API_BASE = "https://script.google.com/macros/s/AKfycbwHBLEQ5QHuhD-O4uI4hRN_5_yS9YsFgtn_dMAdoAO2C7zHLoi3qfHO82vas3Uv0wXXpg/exec";

/* ================================
   CENTRALIZED MULTILINGUAL TEXT
   ================================ */
const CLS_TEXT = {
  pwa: {
    installPrompt: {
      en: "📲 Install CLS Employee App for faster access and offline features!",
      es: "📲 ¡Instala la App de Empleado CLS para un acceso más rápido y funciones sin conexión!",
      pt: "📲 Instale o App do Funcionário CLS para acesso mais rápido e recursos offline!"
    },
    installButton: {
      en: "Install CLS Employee App",
      es: "Instalar App de Empleado CLS",
      pt: "Instalar App do Funcionário CLS"
    },
    installing: {
      en: "Installing...",
      es: "Instalando...",
      pt: "Instalando..."
    },
    installed: {
      en: "App installed successfully!",
      es: "¡Aplicación instalada con éxito!",
      pt: "Aplicativo instalado com sucesso!"
    },
    dismissed: {
      en: "Installation skipped.",
      es: "Instalación omitida.",
      pt: "Instalação ignorada."
    },
    laterButton: {
      en: "Later",
      es: "Más tarde",
      pt: "Depois"
    }
  },
  login: {
    sending: {
      en: "⏳ Logging in...",
      es: "⏳ Iniciando sesión...",
      pt: "⏳ Entrando..."
    },
    success: {
      en: "✅ Login successful! Redirecting...",
      es: "✅ ¡Inicio de sesión exitoso! Redirigiendo...",
      pt: "✅ Login realizado com sucesso! Redirecionando..."
    },
    invalid: {
      en: "❌ Invalid email or password.",
      es: "❌ Correo o contraseña inválidos.",
      pt: "❌ E-mail ou senha inválidos."
    },
    error: {
      en: "⚠️ Error connecting to server.",
      es: "⚠️ Error al conectar con el servidor.",
      pt: "⚠️ Erro ao conectar ao servidor."
    },
    offline: {
      en: "You're offline — please connect to the internet.",
      es: "Estás sin conexión — conéctate a Internet.",
      pt: "Você está offline — conecte-se à Internet."
    },
    missing: {
      en: "⚠️ Please enter both email and password.",
      es: "⚠️ Por favor ingrese correo y contraseña.",
      pt: "⚠️ Por favor, insira email e senha."
    },
    serverError: {
      en: "⚠️ Server error. Try again later.",
      es: "⚠️ Error del servidor. Intente nuevamente.",
      pt: "⚠️ Erro no servidor. Tente novamente."
    }
  },
  pwaStatus: {
    offlineMode: {
      en: "📱 Offline Mode Active",
      es: "📱 Modo Sin Conexión Activo",
      pt: "📱 Modo Offline Ativo"
    },
    installedPwa: {
      en: "📱 App Mode: Installed PWA",
      es: "📱 Modo App: PWA Instalada",
      pt: "📱 Modo App: PWA Instalado"
    },
    serviceWorkerActive: {
      en: "🔄 App Mode: Online",
      es: "🔄 Modo App: En Línea",
      pt: "🔄 Modo App: Online"
    },
    defaultActive: {
      en: "📱 App Mode Active",
      es: "📱 Modo App Activo",
      pt: "📱 Modo App Ativo"
    }
  },
  biometric: {
    prompt: {
      en: "🔒 Enable {0} for faster login on this device?",
      es: "🔒 ¿Habilitar {0} para un inicio de sesión más rápido en este dispositivo?",
      pt: "🔒 Ativar {0} para login mais rápido neste dispositivo?"
    },
    enabled: {
      en: "✅ {0} login enabled successfully!",
      es: "✅ ¡{0} habilitado correctamente!",
      pt: "✅ {0} habilitado com sucesso!"
    },
    available: {
      en: "🔐 {0} login available — tap to sign in.",
      es: "🔐 {0} disponible — toca para iniciar sesión.",
      pt: "� {0} disponível — toque para entrar."
    },
    failed: {
      en: "❌ {0} authentication failed.",
      es: "❌ Falló la autenticación de {0}.",
      pt: "❌ Falha na autenticação de {0}."
    },
    unavailable: {
      en: "⚠️ Biometric authentication not supported on this device.",
      es: "⚠️ Autenticación biométrica no compatible en este dispositivo.",
      pt: "⚠️ Autenticação biométrica não suportada neste dispositivo."
    },
    setting: {
      en: "🔑 Setting up biometric login...",
      es: "🔑 Configurando inicio de sesión biométrico...",
      pt: "🔑 Configurando login biométrico..."
    },
    verifying: {
      en: "🔑 Verifying biometric...",
      es: "🔑 Verificando biométrico...",
      pt: "🔑 Verificando biométrico..."
    },
    noCredentials: {
      en: "⚠️ No biometric credentials found. Please register biometrics first.",
      es: "⚠️ No se encontraron credenciales biométricas. Registre biométricos primero.",
      pt: "⚠️ Nenhuma credencial biométrica encontrada. Registre biométricos primeiro."
    },
    invalidCredentials: {
      en: "⚠️ Invalid biometric credentials. Please re-register.",
      es: "⚠️ Credenciales biométricas inválidas. Vuelva a registrarse.",
      pt: "⚠️ Credenciais biométricas inválidas. Registre novamente."
    },
    verified: {
      en: "✅ Biometric verified — logging in…",
      es: "✅ Biométrico verificado — iniciando sesión…",
      pt: "✅ Biométrico verificado — fazendo login…"
    },
    cancelled: {
      en: "⚠️ Biometric setup cancelled or not allowed.",
      es: "⚠️ Configuración biométrica cancelada o no permitida.",
      pt: "⚠️ Configuração biométrica cancelada ou não permitida."
    },
    setupFailed: {
      en: "⚠️ Biometric setup failed. Try again later.",
      es: "⚠️ Falló la configuración biométrica. Intente más tarde.",
      pt: "⚠️ Falha na configuração biométrica. Tente mais tarde."
    },
    loginFailed: {
      en: "⚠️ Biometric login failed. Please try again.",
      es: "⚠️ Falló el inicio de sesión biométrico. Intente nuevamente.",
      pt: "⚠️ Falha no login biométrico. Tente novamente."
    }
  },
  dashboard: {
    greeting: {
      en: "Welcome",
      es: "¡Bienvenido",
      pt: "Bem-vindo"
    },
    sessionExpired: {
      en: "Session expired. Please log in again.",
      es: "Sesión expirada. Por favor, inicie sesión nuevamente.",
      pt: "Sessão expirada. Por favor, faça login novamente."
    },
    workerIdLabel: {
      en: "Worker ID",
      es: "ID de Empleado",
      pt: "ID do Funcionário"
    }
  }
};

// Helper function to get text with placeholder replacement
function getText(path, lang, placeholders = []) {
  const keys = path.split('.');
  let text = CLS_TEXT;
  
  // Navigate through the object structure
  for (const key of keys) {
    text = text[key];
    if (!text) break;
  }
  
  // Get the text for the language, fallback to English
  let result = text?.[lang] || text?.en || '';
  
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
  console.log('🔧 Initializing PWA install prompt system');
  
  // Listen for the beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('📲 PWA install prompt available');
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
  window.addEventListener('appinstalled', (e) => {
    console.log('✅ PWA was installed successfully');
    hideInstallElements();
    deferredPrompt = null;
  });
  
  // Setup install button click handlers
  setupInstallButtons();
}

function showInstallBanner() {
  const banner = document.getElementById('pwaInstallBanner');
  if (banner) {
    banner.style.display = 'block';
    console.log('📱 PWA install banner shown');
  }
}

function showFloatingInstallButton() {
  const floatingBtn = document.querySelector('.floating-install-btn');
  if (floatingBtn) {
    floatingBtn.style.display = 'flex';
    console.log('🎈 PWA floating install button shown');
  }
}

function hideInstallElements() {
  const banner = document.getElementById('pwaInstallBanner');
  const floatingBtn = document.querySelector('.floating-install-btn');
  
  if (banner) banner.style.display = 'none';
  if (floatingBtn) floatingBtn.style.display = 'none';
  
  console.log('👻 PWA install elements hidden');
}

function setupInstallButtons() {
  // Setup main install button
  const installBtn = document.getElementById('installPwaBtn');
  if (installBtn) {
    installBtn.addEventListener('click', handleInstallClick);
  }
  
  // Setup floating install button
  const floatingBtn = document.querySelector('.floating-install-btn');
  if (floatingBtn) {
    floatingBtn.addEventListener('click', handleInstallClick);
  }
  
  // Setup banner dismiss button
  const dismissBtn = document.getElementById('dismissPwaBtn');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      const banner = document.getElementById('pwaInstallBanner');
      if (banner) banner.style.display = 'none';
    });
  }
}

async function handleInstallClick() {
  if (!deferredPrompt) {
    console.log('❌ No install prompt available');
    return;
  }
  
  console.log('🚀 Triggering PWA install prompt');
  
  // Show the install prompt
  deferredPrompt.prompt();
  
  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.userChoice;
  
  if (outcome === 'accepted') {
    console.log('✅ User accepted the install prompt');
  } else {
    console.log('❌ User dismissed the install prompt');
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
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  const navOverlay = document.getElementById('navOverlay');
  const navbar = document.getElementById('navbar');
  
  // Hamburger menu toggle
  if (hamburger && navLinks && navOverlay) {
    hamburger.addEventListener('click', function() {
      navLinks.classList.toggle('active');
      navOverlay.classList.toggle('active');
      hamburger.classList.toggle('active');
      
      // Update aria-expanded for accessibility
      const isExpanded = hamburger.classList.contains('active');
      hamburger.setAttribute('aria-expanded', isExpanded);
      
      // Prevent body scroll when menu is open
      document.body.style.overflow = isExpanded ? 'hidden' : '';
    });
  }
  
  // Close menu when overlay is clicked
  if (navOverlay) {
    navOverlay.addEventListener('click', function() {
      navLinks.classList.remove('active');
      navOverlay.classList.remove('active');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  }
  
  // Close menu when nav link is clicked
  if (navLinks) {
    navLinks.addEventListener('click', function(e) {
      if (e.target.tagName === 'A') {
        navLinks.classList.remove('active');
        navOverlay.classList.remove('active');
        hamburger.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }
  
  // Navbar scroll behavior for mobile
  if (navbar) {
    let lastScrollTop = 0;
    window.addEventListener('scroll', function() {
      if (window.innerWidth <= 768) { // Only on mobile
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > 50) {
          navbar.classList.add('scrolled');
        } else {
          navbar.classList.remove('scrolled');
        }
        
        lastScrollTop = scrollTop;
      }
    });
  }
  
  // Remove scrolled class on resize if not mobile and close menu
  window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
      if (navbar) navbar.classList.remove('scrolled');
      if (navLinks) navLinks.classList.remove('active');
      if (navOverlay) navOverlay.classList.remove('active');
      if (hamburger) {
        hamburger.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
      }
      document.body.style.overflow = '';
    }
  });
}

// Load Navbar Component
async function loadNavbar() {
  try {
    console.log('Loading navbar...');
    const response = await fetch('components/navbar.html');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const navbarHTML = await response.text();
    
    const navbarContainer = document.getElementById('navbar-container');
    if (navbarContainer) {
      navbarContainer.innerHTML = navbarHTML;
      
      // Check if we're on the dashboard page and customize navigation
      const currentPage = window.location.pathname.split('/').pop() || 'index.html';
      if (currentPage === 'employeeDashboard.html') {
        const navLinks = document.querySelector('.nav-links');
        const hamburger = document.querySelector('.hamburger');
        const navOverlay = document.querySelector('.nav-overlay');
        
        // Hide all navigation elements for dashboard
        if (navLinks) navLinks.style.display = 'none';
        if (hamburger) hamburger.style.display = 'none';
        if (navOverlay) navOverlay.style.display = 'none';
        
        console.log('Dashboard detected - all navigation elements hidden');
        
        // Still initialize language and basic functionality for dashboard
        window.switchLanguage = switchLanguage;
        const storedLang = localStorage.getItem("CLS_Lang") || "en";
        switchLanguage(storedLang);
      } else {
        // Initialize navbar functionality for other pages
        initializeNavbar();
        
        // Set active page highlighting
        setActiveNavLink();
      }
      
      console.log('Navbar loaded successfully');
    } else {
      console.warn('Navbar container not found');
    }
  } catch (error) {
    console.error('Error loading navbar:', error);
  }
}

// Set Active Navigation Link
function setActiveNavLink() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-links a');
  
  // Remove any existing active classes
  navLinks.forEach(link => {
    link.classList.remove('active');
  });
  
  // Find and highlight the current page link
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || 
        (currentPage === '' && href === 'index.html') ||
        (currentPage === '/' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

async function loadFooter() {
  try {
    console.log('Loading footer...');
    const response = await fetch('components/footer.html');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const footerHTML = await response.text();
    console.log('Footer HTML loaded:', footerHTML.substring(0, 100) + '...');
    
    const footerContainer = document.getElementById('footer-container');
    if (footerContainer) {
      footerContainer.innerHTML = footerHTML;
      console.log('Footer injected into container');
      
      // Make sure switchLanguage is globally available
      window.switchLanguage = switchLanguage;
      
      // Initialize language after footer is loaded
      const storedLang = localStorage.getItem("CLS_Lang") || "en";
      switchLanguage(storedLang);
    } else {
      console.log('Footer container not found - page may have static footer');
      // Still make switchLanguage available and initialize language for pages with static footers
      window.switchLanguage = switchLanguage;
      const storedLang = localStorage.getItem("CLS_Lang") || "en";
      switchLanguage(storedLang);
    }
  } catch (error) {
    console.error('Error loading footer:', error);
  }
}

/* ================================
   GLOBAL NAVIGATION & LANGUAGE
   ================================ */


function switchLanguage(lang) {
  localStorage.setItem("CLS_Lang", lang);

  // Update all text elements, but skip form elements that might have complex structure
  document.querySelectorAll("[data-en]").forEach(el => {
    // Skip elements inside form steps to prevent breaking the form wizard
    if (el.closest('.form-step') || el.closest('#applicationForm')) {
      return;
    }
    
    const text = el.getAttribute(`data-${lang}`) || el.getAttribute("data-en");
    if (text) el.innerHTML = text;
  });

  // Highlight active button
  document.querySelectorAll(".language-toggle button").forEach(btn => {
    const btnLang = btn.getAttribute("data-lang") || btn.getAttribute("onclick")?.match(/switchLanguage\('(\w+)'\)/)?.[1];
    btn.classList.toggle("active", btnLang === lang);
  });

  // Update placeholders for current page
  const currentPage = document.body.dataset.page;
  if (currentPage === 'apply') {
    applyPlaceholders(lang);
  } else if (currentPage === 'login') {
    loginPlaceholders(lang);
  } else if (currentPage === 'contact') {
    contactPlaceholders(lang);
  }

  // Update floating install button if present
  const floatingBtn = document.querySelector('.floating-install-btn');
  if (floatingBtn && floatingBtn.dataset.lang !== lang) {
    floatingBtn.dataset.lang = lang;
    floatingBtn.innerHTML = `📲 <strong>${getText('pwa.installButton', lang)}</strong>`;
  }

  // Update PWA banner when language changes
  const bannerTextEl = document.querySelector('#pwaInstallBanner [data-en]');
  if (bannerTextEl) {
    bannerTextEl.textContent = getText('pwa.installPrompt', lang);
  }
  
  // Update PWA button texts
  const installBtn = document.getElementById('installPwaBtn');
  const dismissBtn = document.getElementById('dismissPwaBtn');
  if (installBtn) installBtn.textContent = getText('pwa.installButton', lang);
  if (dismissBtn) dismissBtn.textContent = getText('pwa.laterButton', lang);
  
  // Update biometric button texts if present
  const biometricBtn = document.getElementById('biometricLoginBtn');
  if (biometricBtn) {
    const deviceType = getDeviceType();
    let biometricName = 'biometric authentication';
    
    if (deviceType === 'iOS') {
      biometricName = 'Face ID / Touch ID';
    } else if (deviceType === 'Android') {
      biometricName = 'fingerprint authentication';
    } else if (deviceType === 'Windows Desktop') {
      biometricName = 'Windows Hello';
    } else if (deviceType === 'Mac Desktop') {
      biometricName = 'Touch ID';
    }
    
    // Update button text based on current state
    const isRegistered = localStorage.getItem('CLS_BioRegistered') === 'true';
    if (isRegistered) {
      const btnText = getText('biometric.available', lang, [biometricName]);
      biometricBtn.innerHTML = btnText.replace('🔐', '🔐').replace(' — ', '<br><small>').replace('.', '</small>');
    }
  }
  
  // Update PWA status if present (for dashboard page)
  if (typeof updatePWAStatus === 'function') {
    updatePWAStatus();
  }

  // Dispatch event for form to handle its own language updates
  window.dispatchEvent(new CustomEvent('languageChanged', {
    detail: { language: lang }
  }));


}

function initLanguageSystem() {
  const storedLang = localStorage.getItem("CLS_Lang");
  const browserLang = navigator.language || navigator.userLanguage;
  const lang = storedLang || (browserLang.startsWith("es") ? "es" : browserLang.startsWith("pt") ? "pt" : "en");
  switchLanguage(lang);
}

/* Run on page load */
// Use a function that works whether DOMContentLoaded has fired or not
function initializeApp() {
  loadNavbar(); // Load shared navbar component
  loadFooter(); // Load shared footer component
  initLanguageSystem();
  initPwaInstallPrompt(); // Initialize unified PWA install system

  // Determine current page for page-specific logic
  const page = document.body.dataset.page;
  console.log('🔧 Initializing page:', page);
  initPage(page);
}

// Handle both cases: if DOM is already ready or if we need to wait
if (document.readyState === 'loading') {
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
  if (rememberUser === 'true') {
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
  document.querySelectorAll('[data-ph-en]').forEach(el => {
    const val =
      lang === 'es' ? el.getAttribute('data-ph-es') :
        lang === 'pt' ? el.getAttribute('data-ph-pt') :
          el.getAttribute('data-ph-en');
    if (val) el.setAttribute('placeholder', val);
  });
}

// Global placeholder function for Login form (accessible from language switcher)
function loginPlaceholders(lang) {
  const placeholders = {
    email: { en: 'Work Email', es: 'Correo de Trabajo', pt: 'Email de Trabalho' },
    password: { en: 'Password', es: 'Contraseña', pt: 'Senha' }
  };
  
  Object.keys(placeholders).forEach(id => {
    const el = document.getElementById(id);
    if (el && placeholders[id][lang]) {
      el.setAttribute('placeholder', placeholders[id][lang]);
    }
  });
  
  // Update biometric button text if present
  if (window.updateBiometricButtonText) {
    updateBiometricButtonText();
  }
}

// Global placeholder function for Contact form (accessible from language switcher)
function contactPlaceholders(lang) {
  document.querySelectorAll('[data-ph-en]').forEach(el => {
    const val = el.getAttribute(`data-ph-${lang}`) || el.getAttribute('data-ph-en');
    if (val) el.setAttribute('placeholder', val);
  });
}

function initApplyForm() {
  // Check if we have the new multi-step application form or the old form
  const newForm = document.getElementById('applicationForm');
  const oldForm = document.getElementById('cls-apply');
  
  if (newForm) {
    // New multi-step form is already initialized by its own script in apply.html
    // Don't interfere with form elements, just apply language to non-form elements
    const lang = localStorage.getItem("CLS_Lang") || "en";
    document.querySelectorAll("[data-en]").forEach(el => {
      // Skip form elements to prevent breaking the wizard
      if (el.closest('.form-step') || el.closest('#applicationForm')) {
        return;
      }
      
      const text = el.getAttribute(`data-${lang}`) || el.getAttribute("data-en");
      if (text) el.innerHTML = text;
    });
    
    // Apply language to placeholders if needed
    applyPlaceholders(lang);
    return;
  }
  
  if (!oldForm) return;

  const statusEl = document.getElementById('status');
  const MESSAGES = {
    en: { sending: "Sending...", success: "Thanks. We received your application.", error: "Error. Please try again." },
    es: { sending: "Enviando...", success: "Gracias. Recibimos su solicitud.", error: "Error. Intente de nuevo." },
    pt: { sending: "Enviando...", success: "Obrigado. Recebemos sua candidatura.", error: "Erro. Tente novamente." }
  };

  function setDobMax() {
    // Limit date selection to 18+ only
    const today = new Date();
    const minAgeDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    const dobInput = document.getElementById('dob');
    if (dobInput) dobInput.max = minAgeDate.toISOString().split('T')[0];
  }

  function validateAge() {
    const dobInput = document.getElementById('dob');
    const errorEl = document.getElementById('dobError');
    if (!dobInput || !oldForm) return;

    const currentLang = oldForm.querySelector('input[name="ui_lang"]').value || 'en';
    const messages = {
      en: 'Applicant must be at least 18 years old.',
      es: 'El solicitante debe tener al menos 18 años.',
      pt: 'O candidato deve ter pelo menos 18 anos.'
    };

    const dobValue = dobInput.value;
    if (!dobValue) {
      if (errorEl) errorEl.style.display = 'none';
      dobInput.setCustomValidity('');
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
        errorEl.style.display = 'block';
        errorEl.textContent = messages[currentLang];
      }
      dobInput.setCustomValidity(messages[currentLang]);
    } else {
      if (errorEl) errorEl.style.display = 'none';
      dobInput.setCustomValidity('');
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
          pt: "Você é cidadão americano por nascimento ou naturalização."
        },
        docs: {
          en: "Driver's license and Social Security card, or U.S. passport.",
          es: "Licencia de conducir y tarjeta del Seguro Social, o pasaporte estadounidense.",
          pt: "Carteira de motorista e cartão do Seguro Social, ou passaporte dos EUA."
        }
      },
      "Permanent Resident": {
        desc: {
          en: "You have lawful permanent residence in the United States.",
          es: "Usted tiene residencia permanente legal en los Estados Unidos.",
          pt: "Você tem residência permanente legal nos Estados Unidos."
        },
        docs: {
          en: "Permanent Resident Card (Green Card).",
          es: "Tarjeta de Residente Permanente (Green Card).",
          pt: "Cartão de Residente Permanente (Green Card)."
        }
      },
      "Work Permit (EAD)": {
        desc: {
          en: "You have employment authorization from USCIS.",
          es: "Usted tiene autorización de empleo de USCIS.",
          pt: "Você tem autorização de emprego do USCIS."
        },
        docs: {
          en: "Employment Authorization Document (EAD) card issued by USCIS.",
          es: "Documento de Autorización de Empleo (EAD) emitido por USCIS.",
          pt: "Documento de Autorização de Emprego (EAD) emitido pelo USCIS."
        }
      },
      "Visa (H-2B)": {
        desc: {
          en: "You have a temporary worker visa for seasonal employment.",
          es: "Usted tiene una visa de trabajador temporal para empleo estacional.",
          pt: "Você tem um visto de trabalhador temporário para emprego sazonal."
        },
        docs: {
          en: "Copy of H-2B visa and passport photo page.",
          es: "Copia de la visa H-2B y página del pasaporte con foto.",
          pt: "Cópia do visto H-2B e da página do passaporte com foto."
        }
      },
      "Visa (Other)": {
        desc: {
          en: "You have another type of work-authorized visa.",
          es: "Usted tiene otro tipo de visa autorizada para trabajar.",
          pt: "Você tem outro tipo de visto autorizado para trabalhar."
        },
        docs: {
          en: "Copy of visa and work authorization letter.",
          es: "Copia de la visa y carta de autorización de trabajo.",
          pt: "Cópia do visto e carta de autorização de trabalho."
        }
      },
      "Not Authorized": {
        desc: {
          en: "You do not currently have work authorization.",
          es: "Actualmente no tiene autorización de trabajo.",
          pt: "Você atualmente não tem autorização de trabalho."
        },
        docs: {
          en: "⚠️ You are not authorized to work in the United States.",
          es: "⚠️ No está autorizado para trabajar en los Estados Unidos.",
          pt: "⚠️ Você não está autorizado a trabalhar nos Estados Unidos."
        }
      }
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
  const dobInput = document.getElementById('dob');
  if (dobInput) {
    dobInput.addEventListener('focus', setDobMax);
    dobInput.addEventListener('input', validateAge);
    dobInput.addEventListener('change', validateAge);
  }

  const authSelect = document.getElementById('work_authorization');
  if (authSelect) authSelect.addEventListener('change', updateDocNote);

  // Apply current language placeholders on form init
  const currentLang = oldForm.querySelector('input[name="ui_lang"]').value || 'en';
  applyPlaceholders(currentLang);

  // Form submission handler
  oldForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentLang = oldForm.querySelector('input[name="ui_lang"]').value || 'en';
    if (statusEl) statusEl.textContent = MESSAGES[currentLang].sending;

    try {
      const body = new URLSearchParams(new FormData(oldForm));
      const res = await fetch(oldForm.action, { method: 'POST', body });
      let msg = MESSAGES[currentLang][res.ok ? 'success' : 'error'];
      try { const j = await res.json(); if (j?.message) msg = j.message; } catch { }
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

// Employee Signup Module
function initSignupForm() {
  const form = document.getElementById("signupForm");
  if (!form) return;

  const statusEl = document.getElementById("status");
  const MESSAGES = {
    en: { sending: "⏳ Creating account...", success: "✅ Account created! You can now log in.", error: "❌ Please fill in all fields.", mismatch: "❌ Passwords do not match.", serverError: "⚠️ Error during signup." },
    es: { sending: "⏳ Creando cuenta...", success: "✅ ¡Cuenta creada! Ya puedes iniciar sesión.", error: "❌ Por favor completa todos los campos.", mismatch: "❌ Las contraseñas no coinciden.", serverError: "⚠️ Error durante el registro." },
    pt: { sending: "⏳ Criando conta...", success: "✅ Conta criada! Agora você pode fazer login.", error: "❌ Por favor preencha todos os campos.", mismatch: "❌ As senhas não coincidem.", serverError: "⚠️ Erro durante o cadastro." }
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const currentLang = localStorage.getItem("CLS_Lang") || "en";
    
    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value.trim();
    const confirm = document.getElementById("confirmPassword")?.value.trim();

    if (!email || !password || !confirm) {
      if (statusEl) statusEl.textContent = MESSAGES[currentLang].error;
      return;
    }

    if (password !== confirm) {
      if (statusEl) statusEl.textContent = MESSAGES[currentLang].mismatch;
      return;
    }

    if (statusEl) statusEl.textContent = MESSAGES[currentLang].sending;

    try {
      const res = await fetch(`${API_BASE}?action=signup&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
      const text = await res.text();
      
      if (statusEl) {
        statusEl.textContent = text.includes("✅") 
          ? MESSAGES[currentLang].success
          : text || MESSAGES[currentLang].serverError;
      }
      
      // Reset form on success
      if (text.includes("✅")) {
        form.reset();
      }
    } catch (err) {
      console.error(err);
      if (statusEl) statusEl.textContent = MESSAGES[currentLang].serverError;
    }
  });
}

// ======================================================
// BIOMETRIC AUTHENTICATION MODULE (WebAuthn)
// ======================================================

/**
 * Check if biometric authentication is supported
 * @returns {boolean} True if WebAuthn is supported
 */
/**
 * Setup biometric button - separates WebAuthn detection from visibility logic
 */
function setupBiometricButton() {
  console.log('🔧 Setting up biometric button...');
  
  // Check WebAuthn support first
  const isSupported = window.PublicKeyCredential && 
                     navigator.credentials && 
                     navigator.credentials.create;
  
  console.log('🔐 WebAuthn supported:', isSupported);
  
  if (!isSupported) {
    console.log('❌ WebAuthn not supported - biometric login unavailable');
    return false;
  }
  
  // WebAuthn is supported, now check DOM readiness and handle visibility
  const biometricBtn = document.getElementById('biometricLoginBtn');
  if (!biometricBtn) {
    console.log('⏳ Biometric button not found yet, will check later');
    // Schedule a check for when DOM is more complete
    setTimeout(() => evaluateBiometricVisibility(), 200);
    return true;
  }
  
  // Button exists, evaluate visibility immediately
  evaluateBiometricVisibility();
  return true;
}

/**
 * Evaluate whether biometric button should be visible
 * This can be called multiple times safely
 */
function evaluateBiometricVisibility() {
  console.log('🔍 Evaluating biometric button visibility...');
  
  const biometricBtn = document.getElementById('biometricLoginBtn');
  if (!biometricBtn) {
    console.log('❌ Biometric button element still not found');
    return;
  }
  
  // Check if WebAuthn is supported
  const isWebAuthnSupported = window.PublicKeyCredential && 
                             navigator.credentials && 
                             navigator.credentials.create;
  
  if (!isWebAuthnSupported) {
    biometricBtn.style.display = 'none';
    console.log('👻 Biometric button hidden - WebAuthn not supported');
    return;
  }
  
  // Check registration status
  const isRegistered = localStorage.getItem('CLS_BioRegistered') === 'true';
  const registeredFor = localStorage.getItem('CLS_BioRegisteredFor');
  const credentialId = localStorage.getItem('CLS_BioCredentialId');
  
  console.log('📋 Biometric registration status:', { 
    isRegistered, 
    hasRegisteredFor: !!registeredFor,
    hasCredentialId: !!credentialId 
  });
  
  if (isRegistered && registeredFor && credentialId) {
    // User has completed biometric registration - show button
    biometricBtn.style.display = 'block';
    updateBiometricButtonText();
    console.log('👤 Biometric button shown for registered user:', registeredFor);
  } else {
    // User hasn't registered biometrics yet - hide button
    biometricBtn.style.display = 'none';
    console.log('👻 Biometric button hidden - user not registered for biometrics yet');
  }
}

function checkBiometricSupport() {
  console.log('🔧 checkBiometricSupport() called - delegating to evaluateBiometricVisibility()');
  // This function is kept for backward compatibility but now just calls the new logic
  evaluateBiometricVisibility();
  
  return window.PublicKeyCredential && 
         navigator.credentials && 
         navigator.credentials.create;
}

/**
 * Update biometric button text based on device capability
 */
function updateBiometricButtonText() {
  console.log('🔧 Updating biometric button text and icon...');
  
  const biometricBtn = document.getElementById('biometricLoginBtn');
  const iconEl = document.getElementById('biometricIcon');
  
  if (!biometricBtn) {
    console.log('❌ Biometric button not found');
    return;
  }
  
  if (!iconEl) {
    console.log('❌ Biometric icon not found');
    return;
  }
  
  const currentLang = localStorage.getItem("CLS_Lang") || "en";
  const deviceType = getDeviceType();
  
  // Map device types to user-friendly text and icons
  const buttonTexts = {
    en: {
      'iOS': 'Sign in with Face ID / Touch ID',
      'Android': 'Sign in with Fingerprint',
      'Windows Desktop': 'Sign in with Windows Hello',
      'Mac Desktop': 'Sign in with Touch ID',
      'default': 'Sign in with Biometrics'
    },
    es: {
      'iOS': 'Iniciar con Face ID / Touch ID',
      'Android': 'Iniciar con Huella',
      'Windows Desktop': 'Iniciar con Windows Hello',
      'Mac Desktop': 'Iniciar con Touch ID',
      'default': 'Iniciar con Biometría'
    },
    pt: {
      'iOS': 'Entrar com Face ID / Touch ID',
      'Android': 'Entrar com Impressão Digital',
      'Windows Desktop': 'Entrar com Windows Hello',
      'Mac Desktop': 'Entrar com Touch ID',
      'default': 'Entrar com Biometria'
    }
  };
  
  const iconMap = {
    'iOS': 'assets/biometric/faceid.svg',
    'Android': 'assets/biometric/fingerprint.svg',
    'Windows Desktop': 'assets/biometric/windowshello.svg',
    'Mac Desktop': 'assets/biometric/touchid.svg',
    'default': 'assets/biometric/biometric-default.svg'
  };
  
  // Update button text
  const textForDevice = buttonTexts[currentLang][deviceType] || buttonTexts[currentLang]['default'];
  const spanElement = biometricBtn.querySelector('span');
  if (spanElement) {
    spanElement.textContent = textForDevice;
  } else {
    biometricBtn.innerHTML = `<img id="biometricIcon" class="biometric-icon" src="${iconMap[deviceType] || iconMap['default']}" alt="Biometric icon" /> ${textForDevice}`;
  }
  
  // Update icon
  iconEl.src = iconMap[deviceType] || iconMap['default'];
  iconEl.alt = `${deviceType} biometric authentication`;
  
  console.log('✅ Biometric button updated:', { 
    deviceType, 
    text: textForDevice, 
    icon: iconMap[deviceType] || iconMap['default'] 
  });
}

/**
 * Register biometric credentials for the current user
 * @param {string} workerId - The worker ID
 * @param {string} email - The user's email
 * @returns {Promise<boolean>} True if registration successful
 */
async function registerBiometric(workerId, email) {
  try {
    const statusEl = document.getElementById('bioStatus');
    const currentLang = localStorage.getItem("CLS_Lang") || "en";
    if (statusEl) statusEl.textContent = getText('biometric.setting', currentLang);
    
    // Generate a cryptographically random challenge
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: challenge,
        rp: { 
          name: 'Carolina Lumper Service',
          id: window.location.hostname 
        },
        user: {
          id: new TextEncoder().encode(workerId),
          name: email,
          displayName: email
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 } // RS256 fallback
        ],
        authenticatorSelection: { 
          userVerification: 'preferred',
          authenticatorAttachment: 'platform' // Prefer built-in authenticators
        },
        timeout: 60000,
        attestation: 'none'
      }
    });
    
    if (credential) {
      // Store registration info - encode credential ID as base64
      const credentialIdBase64 = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      
      localStorage.setItem('CLS_BioRegistered', 'true');
      localStorage.setItem('CLS_BioCredentialId', credentialIdBase64);
      localStorage.setItem('CLS_BioRegisteredFor', workerId);
      
      console.log('✅ Biometric registration successful, credential ID:', credentialIdBase64);
      
      const currentLang = localStorage.getItem("CLS_Lang") || "en";
      const deviceType = getDeviceType();
      let biometricName = 'Biometric authentication';
      
      if (deviceType === 'iOS') {
        biometricName = 'Face ID / Touch ID';
      } else if (deviceType === 'Android') {
        biometricName = 'Fingerprint authentication';
      } else if (deviceType === 'Windows Desktop') {
        biometricName = 'Windows Hello';
      } else if (deviceType === 'Mac Desktop') {
        biometricName = 'Touch ID';
      }
      
      if (statusEl) statusEl.textContent = getText('biometric.enabled', currentLang, [biometricName]);
      
      // Re-evaluate biometric button visibility now that registration is complete
      evaluateBiometricVisibility();
      
      console.log('✅ Biometric registration successful');
      return true;
    }
  } catch (err) {
    console.warn('⚠️ Biometric setup failed:', err);
    const statusEl = document.getElementById('bioStatus');
    if (statusEl) {
      if (err.name === 'NotAllowedError') {
        statusEl.textContent = getText('biometric.cancelled', currentLang);
      } else if (err.name === 'NotSupportedError') {
        statusEl.textContent = getText('biometric.unavailable', currentLang);
      } else {
        statusEl.textContent = getText('biometric.setupFailed', currentLang);
      }
    }
    return false;
  }
}

/**
 * Authenticate using biometric credentials
 * @returns {Promise<boolean>} True if authentication successful
 */
async function biometricLogin() {
  try {
    const statusEl = document.getElementById('bioStatus');
    const currentLang = localStorage.getItem("CLS_Lang") || "en";
    if (statusEl) statusEl.textContent = getText('biometric.verifying', currentLang);
    
    const registeredFor = localStorage.getItem('CLS_BioRegisteredFor');
    const credentialId = localStorage.getItem('CLS_BioCredentialId');
    
    if (!registeredFor || !credentialId) {
      if (statusEl) statusEl.textContent = getText('biometric.noCredentials', currentLang);
      return false;
    }
    
    console.log('🔐 Attempting biometric login for worker:', registeredFor);
    console.log('🔑 Using credential ID:', credentialId);
    
    // Generate a cryptographically random challenge
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    
    console.log('📋 WebAuthn get request:', {
      challenge: Array.from(challenge),
      credentialId: credentialId,
      credentialIdLength: credentialId.length
    });
    
    let credentialIdBytes;
    try {
      // Convert base64 credential ID to bytes
      credentialIdBytes = Uint8Array.from(atob(credentialId), c => c.charCodeAt(0));
      console.log('✅ Credential ID converted to bytes:', Array.from(credentialIdBytes));
    } catch (err) {
      console.error('❌ Failed to convert credential ID:', err);
      if (statusEl) statusEl.textContent = getText('biometric.invalidCredentials', currentLang);
      return false;
    }
    
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: challenge,
        allowCredentials: [{
          type: 'public-key',
          id: credentialIdBytes
        }],
        userVerification: 'preferred',
        timeout: 60000
      }
    });

    if (credential) {
      if (statusEl) statusEl.textContent = getText('biometric.verified', currentLang);
      
      // Successful biometric authentication - restore session data
      console.log('✅ Biometric authentication successful for worker:', registeredFor);
      
      // Get stored user data for this worker (if available)
      const storedUserName = localStorage.getItem('CLS_WorkerName');
      const storedEmail = localStorage.getItem('CLS_Email');
      
      // Restore session data
      localStorage.setItem("CLS_WorkerID", registeredFor);
      
      // Set user data - use stored data if available, otherwise set placeholders
      // The dashboard will need to fetch fresh data if placeholders are used
      if (storedUserName) {
        localStorage.setItem("CLS_WorkerName", storedUserName);
      } else {
        localStorage.setItem("CLS_WorkerName", `Worker ${registeredFor}`);
      }
      
      if (storedEmail) {
        localStorage.setItem("CLS_Email", storedEmail);
      } else {
        localStorage.setItem("CLS_Email", `${registeredFor}@placeholder.com`);
      }
      
      // Set session preferences - default to remember user for biometric logins
      localStorage.setItem('CLS_RememberUser', 'true');
      localStorage.removeItem('CLS_SessionExpiry'); // No expiry for biometric logins
      
      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = 'employeeDashboard.html';
      }, 1000);
      
      return true;
    }
  } catch (err) {
    console.error('⚠️ Biometric authentication failed:', err);
    console.error('Error details:', {
      name: err.name,
      message: err.message,
      code: err.code
    });
    
    const statusEl = document.getElementById('bioStatus');
    if (statusEl) {
      if (err.name === 'NotAllowedError') {
        statusEl.textContent = '⚠️ Biometric verification cancelled or not allowed.';
      } else if (err.name === 'InvalidStateError') {
        statusEl.textContent = '⚠️ Biometric device not available or credentials not found.';
      } else if (err.name === 'NotSupportedError') {
        statusEl.textContent = '⚠️ Biometric authentication not supported on this device.';
      } else if (err.name === 'SecurityError') {
        statusEl.textContent = '⚠️ Security error. Please try again or log in normally.';
      } else if (err.name === 'AbortError') {
        statusEl.textContent = '⚠️ Biometric verification timed out.';
      } else {
        statusEl.textContent = `⚠️ Biometric verification failed: ${err.message}`;
      }
    }
    return false;
  }
}

/**
 * Clear biometric registration data
 */
function clearBiometricData() {
  localStorage.removeItem('CLS_BioRegistered');
  localStorage.removeItem('CLS_BioCredentialId');
  localStorage.removeItem('CLS_BioRegisteredFor');
  
  const biometricBtn = document.getElementById('biometricLoginBtn');
  if (biometricBtn) {
    biometricBtn.style.display = 'none';
  }
  
  console.log('🧹 Biometric data cleared');
}

// Employee Login Module
function initLoginForm() {
  console.log('🔧 initLoginForm() called');
  const form = document.getElementById("loginForm");
  if (!form) {
    console.error('❌ Login form not found!');
    return;
  }
  
  // Check if already initialized
  if (form.hasAttribute('data-initialized')) {
    console.log('ℹ️ Login form already initialized, skipping');
    return;
  }
  
  console.log('✅ Login form found, setting up event handlers');

  const statusEl = document.getElementById("status");

  // Initialize biometric support - but defer actual visibility logic
  // This ensures WebAuthn support is checked and button handler is set up
  setupBiometricButton();
  
  // Biometric login button handler
  const biometricBtn = document.getElementById('biometricLoginBtn');
  if (biometricBtn) {
    biometricBtn.addEventListener('click', async () => {
      try {
        await biometricLogin();
      } catch (err) {
        console.error('⚠️ Biometric login error:', err);
        const bioStatus = document.getElementById('bioStatus');
        if (bioStatus) {
          const currentLang = localStorage.getItem("CLS_Lang") || "en";
          bioStatus.textContent = getText('biometric.loginFailed', currentLang);
        }
      }
    });
  }

  console.log('✅ Adding submit event listener to login form');
  form.addEventListener("submit", async (e) => {
    console.log('🔥 Login form submitted!');
    e.preventDefault();

    const currentLang = localStorage.getItem("CLS_Lang") || "en";
    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value.trim();

    if (!email || !password) {
      if (statusEl) statusEl.textContent = getText('login.missing', currentLang);
      return;
    }

    if (statusEl) statusEl.textContent = getText('login.sending', currentLang);

    try {
      // Get device and browser info for tracking
      const deviceType = getDeviceType();
      const browserType = getBrowserType();
      const deviceInfo = `${deviceType} - ${browserType}`;
      
      const res = await fetch(
        `${API_BASE}?action=login&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&device=${encodeURIComponent(deviceInfo)}`
      );

      const data = await res.json();

      if (data.success) {
        // Save user info to localStorage for later use (dashboard, etc.)
        localStorage.setItem("CLS_WorkerID", data.workerId);
        localStorage.setItem("CLS_WorkerName", data.displayName);
        localStorage.setItem("CLS_Email", data.email);
        
        // Always stay logged in by default - no session expiry
        localStorage.setItem('CLS_RememberUser', 'true');
        localStorage.removeItem('CLS_SessionExpiry'); // No expiry = infinite session

        statusEl.textContent = getText('login.success', currentLang);

        // PHASE 6: Preload SW Before Successful Login Redirect
        if ('serviceWorker' in navigator) {
          try {
            await navigator.serviceWorker.register('service-worker-employee.js', { scope: './' });
            console.log('✅ Service Worker preloaded before redirect');
          } catch (err) {
            console.warn('⚠️ SW pre-registration failed:', err);
          }
        }

        // BIOMETRIC REGISTRATION PROMPT
        // Offer biometric registration if supported and not already registered
        const isBiometricSupported = checkBiometricSupport();
        const isAlreadyRegistered = localStorage.getItem('CLS_BioRegistered') === 'true';
        
        if (isBiometricSupported && !isAlreadyRegistered) {
          const deviceType = getDeviceType();
          let biometricName = 'biometric authentication';
          
          // Customize prompt based on device
          if (deviceType === 'iPhone' || deviceType === 'iPad') {
            biometricName = 'Face ID / Touch ID';
          } else if (deviceType === 'Android') {
            biometricName = 'fingerprint authentication';
          } else if (deviceType === 'Windows') {
            biometricName = 'Windows Hello';
          } else if (deviceType === 'macOS') {
            biometricName = 'Touch ID';
          }
          
          const promptText = getText('biometric.prompt', currentLang, [biometricName]);
          const shouldSetupBiometric = confirm(
            `${promptText}\n\n` +
            `This will allow you to log in quickly using your device's built-in security features.`
          );
          
          if (shouldSetupBiometric) {
            try {
              await registerBiometric(data.workerId, data.email);
              // Give user time to see the success message
              setTimeout(() => {
                window.location.href = "employeeDashboard.html";
              }, 2500);
              return; // Exit early to show biometric setup status
            } catch (err) {
              console.warn('⚠️ Biometric registration failed during login:', err);
              // Continue with normal redirect
            }
          }
        }

        // Redirect after short delay
        setTimeout(() => {
          window.location.href = "employeeDashboard.html";
        }, 1500);
      } else {
        statusEl.textContent = data.message || getText('login.invalid', currentLang);
      }
    } catch (err) {
      console.error(err);
      if (statusEl) statusEl.textContent = getText('login.error', currentLang);
    }
  });

  // Apply current language placeholders on form init
  const currentLang = localStorage.getItem("CLS_Lang") || "en";
  loginPlaceholders(currentLang);
  
  // Mark form as initialized
  form.setAttribute('data-initialized', 'true');
  console.log('✅ Login form initialization complete and marked');
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
    document.querySelectorAll("[data-en]").forEach(el => {
      const text = el.getAttribute(`data-${lang}`) || el.getAttribute("data-en");
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
      serverError: "❌ Error sending message. Try again later."
    },
    es: {
      sending: "⏳ Enviando...",
      success: "✅ Mensaje enviado con éxito!",
      error: "⚠️ Por favor complete todos los campos.",
      serverError: "❌ Error al enviar el mensaje. Intente nuevamente."
    },
    pt: {
      sending: "⏳ Enviando...",
      success: "✅ Mensagem enviada com sucesso!",
      error: "⚠️ Por favor, preencha todos os campos.",
      serverError: "❌ Erro ao enviar mensagem. Tente novamente."
    }
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
        body: new URLSearchParams(new FormData(contactForm))
      });

      if (res.ok) {
        contactForm.reset();
        statusEl.textContent = MESSAGES[currentLang].success;
        
        // Reapply placeholders after reset
        const lang = localStorage.getItem("CLS_Lang") || "en";
        document.querySelectorAll("[data-ph-en]").forEach(el => {
          const val = el.getAttribute(`data-ph-${lang}`) || el.getAttribute("data-ph-en");
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
  document.querySelectorAll("[data-ph-en]").forEach(el => {
    const val = el.getAttribute(`data-ph-${lang}`) || el.getAttribute("data-ph-en");
    el.placeholder = val;
  });
}
