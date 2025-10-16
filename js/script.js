/* ================================
   API CONFIGURATION
   ================================ */
const API_BASE = "https://script.google.com/macros/s/AKfycbwHBLEQ5QHuhD-O4uI4hRN_5_yS9YsFgtn_dMAdoAO2C7zHLoi3qfHO82vas3Uv0wXXpg/exec";

/* ================================
   PWA CONFIGURATION
   ================================ */
const PWA_TEXT = {
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
  bannerText: {
    en: "📲 Install CLS Employee App for faster access and offline features!",
    es: "📲 ¡Instala la App de Empleado CLS para un acceso más rápido y funciones sin conexión!",
    pt: "📲 Instale o App de Funcionário CLS para acesso mais rápido e recursos offline!"
  },
  laterButton: {
    en: "Later",
    es: "Más tarde",
    pt: "Depois"
  }
};

// Make PWA_TEXT globally accessible
window.PWA_TEXT = PWA_TEXT;

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
    floatingBtn.innerHTML = `📲 <strong>${PWA_TEXT.installButton[lang] || PWA_TEXT.installButton.en}</strong>`;
  }

  // Update PWA banner when language changes
  const bannerTextEl = document.querySelector('#pwaInstallBanner [data-en]');
  if (bannerTextEl) {
    bannerTextEl.textContent = PWA_TEXT.bannerText[lang] || PWA_TEXT.bannerText.en;
  }
  
  // Update PWA button texts
  const installBtn = document.getElementById('installPwaBtn');
  const dismissBtn = document.getElementById('dismissPwaBtn');
  if (installBtn) installBtn.textContent = PWA_TEXT.installButton[lang] || PWA_TEXT.installButton.en;
  if (dismissBtn) dismissBtn.textContent = PWA_TEXT.laterButton[lang] || PWA_TEXT.laterButton.en;

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
document.addEventListener("DOMContentLoaded", () => {
  loadNavbar(); // Load shared navbar component
  loadFooter(); // Load shared footer component
  initLanguageSystem();
  initPwaInstallPrompt(); // Initialize unified PWA install system

  // Determine current page for page-specific logic
  const page = document.body.dataset.page;
  initPage(page);
});



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
function checkBiometricSupport() {
  const isSupported = window.PublicKeyCredential && 
                     navigator.credentials && 
                     navigator.credentials.create;
  
  if (isSupported) {
    const biometricBtn = document.getElementById('biometricLoginBtn');
    if (biometricBtn) {
      biometricBtn.style.display = 'block';
      
      // Check if already registered
      const isRegistered = localStorage.getItem('CLS_BioRegistered') === 'true';
      const workerId = localStorage.getItem('CLS_WorkerID');
      
      if (isRegistered && workerId) {
        updateBiometricButtonText();
      } else {
        // Hide until first successful login
        biometricBtn.style.display = 'none';
      }
    }
  }
  
  return isSupported;
}

/**
 * Update biometric button text based on device capability
 */
function updateBiometricButtonText() {
  const biometricBtn = document.getElementById('biometricLoginBtn');
  if (!biometricBtn) return;
  
  const currentLang = localStorage.getItem("CLS_Lang") || "en";
  const deviceType = getDeviceType();
  
  const buttonTexts = {
    en: {
      'iPhone': '🔒 Sign in with Face ID',
      'iPad': '🔒 Sign in with Face ID / Touch ID',
      'Android': '🔒 Sign in with Fingerprint',
      'Windows': '🔒 Sign in with Windows Hello',
      'macOS': '🔒 Sign in with Touch ID',
      'default': '🔒 Sign in with Biometrics'
    },
    es: {
      'iPhone': '🔒 Iniciar con Face ID',
      'iPad': '🔒 Iniciar con Face ID / Touch ID',
      'Android': '🔒 Iniciar con Huella',
      'Windows': '🔒 Iniciar con Windows Hello',
      'macOS': '🔒 Iniciar con Touch ID',
      'default': '🔒 Iniciar con Biometría'
    },
    pt: {
      'iPhone': '🔒 Entrar com Face ID',
      'iPad': '🔒 Entrar com Face ID / Touch ID',
      'Android': '🔒 Entrar com Impressão Digital',
      'Windows': '🔒 Entrar com Windows Hello',
      'macOS': '🔒 Entrar com Touch ID',
      'default': '🔒 Entrar com Biometria'
    }
  };
  
  const textForDevice = buttonTexts[currentLang][deviceType] || buttonTexts[currentLang]['default'];
  const spanElement = biometricBtn.querySelector('span');
  if (spanElement) {
    spanElement.textContent = textForDevice;
  } else {
    biometricBtn.innerHTML = textForDevice;
  }
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
    if (statusEl) statusEl.textContent = '🔑 Setting up biometric login...';
    
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
      // Store registration info
      localStorage.setItem('CLS_BioRegistered', 'true');
      localStorage.setItem('CLS_BioCredentialId', credential.id);
      localStorage.setItem('CLS_BioRegisteredFor', workerId);
      
      if (statusEl) statusEl.textContent = '✅ Biometric login enabled!';
      
      // Show and update the biometric login button
      const biometricBtn = document.getElementById('biometricLoginBtn');
      if (biometricBtn) {
        biometricBtn.style.display = 'block';
        updateBiometricButtonText();
      }
      
      console.log('✅ Biometric registration successful');
      return true;
    }
  } catch (err) {
    console.warn('⚠️ Biometric setup failed:', err);
    const statusEl = document.getElementById('bioStatus');
    if (statusEl) {
      if (err.name === 'NotAllowedError') {
        statusEl.textContent = '⚠️ Biometric setup cancelled or not allowed.';
      } else if (err.name === 'NotSupportedError') {
        statusEl.textContent = '⚠️ Biometric authentication not supported on this device.';
      } else {
        statusEl.textContent = '⚠️ Biometric setup failed. Try again later.';
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
    if (statusEl) statusEl.textContent = '🔑 Verifying biometric...';
    
    const workerId = localStorage.getItem('CLS_WorkerID');
    const registeredFor = localStorage.getItem('CLS_BioRegisteredFor');
    const credentialId = localStorage.getItem('CLS_BioCredentialId');
    
    if (!workerId || !registeredFor || !credentialId) {
      if (statusEl) statusEl.textContent = '⚠️ No biometric credentials found. Please log in normally first.';
      return false;
    }
    
    if (workerId !== registeredFor) {
      if (statusEl) statusEl.textContent = '⚠️ Biometric credentials are for a different user.';
      return false;
    }
    
    // Generate a cryptographically random challenge
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: challenge,
        allowCredentials: [{
          type: 'public-key',
          id: Uint8Array.from(atob(credentialId), c => c.charCodeAt(0))
        }],
        userVerification: 'preferred',
        timeout: 60000
      }
    });

    if (credential) {
      // Verify session validity for offline mode
      const sessionExpiry = localStorage.getItem('CLS_SessionExpiry');
      const rememberUser = localStorage.getItem('CLS_RememberUser') === 'true';
      
      if (!rememberUser && sessionExpiry && new Date(sessionExpiry) < new Date()) {
        if (statusEl) statusEl.textContent = '⚠️ Session expired. Please log in normally.';
        return false;
      }
      
      if (statusEl) statusEl.textContent = '✅ Verified — logging in…';
      
      // Successful biometric authentication
      console.log('✅ Biometric authentication successful');
      
      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = 'employeeDashboard.html';
      }, 1000);
      
      return true;
    }
  } catch (err) {
    console.error('⚠️ Biometric authentication failed:', err);
    const statusEl = document.getElementById('bioStatus');
    if (statusEl) {
      if (err.name === 'NotAllowedError') {
        statusEl.textContent = '⚠️ Biometric verification cancelled.';
      } else if (err.name === 'InvalidStateError') {
        statusEl.textContent = '⚠️ Biometric credentials not found. Please log in normally.';
      } else {
        statusEl.textContent = '⚠️ Biometric verification failed.';
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
  const form = document.getElementById("loginForm");
  if (!form) return;

  const statusEl = document.getElementById("status");
  const MESSAGES = {
    en: {
      sending: "⏳ Logging in...",
      success: "✅ Login successful! Redirecting...",
      error: "❌ Invalid email or password.",
      missing: "⚠️ Please enter both email and password.",
      serverError: "⚠️ Server error. Try again later."
    },
    es: {
      sending: "⏳ Iniciando sesión...",
      success: "✅ Inicio de sesión exitoso. Redirigiendo...",
      error: "❌ Correo o contraseña inválidos.",
      missing: "⚠️ Por favor ingrese correo y contraseña.",
      serverError: "⚠️ Error del servidor. Intente nuevamente."
    },
    pt: {
      sending: "⏳ Entrando...",
      success: "✅ Login bem-sucedido! Redirecionando...",
      error: "❌ Email ou senha inválidos.",
      missing: "⚠️ Por favor, insira email e senha.",
      serverError: "⚠️ Erro no servidor. Tente novamente."
    }
  };

  // Initialize biometric support
  checkBiometricSupport();
  
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
          bioStatus.textContent = '⚠️ Biometric login failed. Please try again.';
        }
      }
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const currentLang = localStorage.getItem("CLS_Lang") || "en";
    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value.trim();

    if (!email || !password) {
      if (statusEl) statusEl.textContent = MESSAGES[currentLang].missing;
      return;
    }

    if (statusEl) statusEl.textContent = MESSAGES[currentLang].sending;

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
        // Check if user wants to stay logged in
        const stayLoggedIn = document.getElementById('stayLoggedIn')?.checked;
        
        // Save user info to localStorage for later use (dashboard, etc.)
        localStorage.setItem("CLS_WorkerID", data.workerId);
        localStorage.setItem("CLS_WorkerName", data.displayName);
        localStorage.setItem("CLS_Email", data.email);
        
        // Save login preference for session management
        if (stayLoggedIn) {
          localStorage.setItem('CLS_RememberUser', 'true');
          localStorage.removeItem('CLS_SessionExpiry'); // No expiry = infinite
        } else {
          localStorage.setItem('CLS_RememberUser', 'false');
          localStorage.setItem('CLS_SessionExpiry', String(Date.now() + (8 * 60 * 60 * 1000))); // 8 hours
        }

        statusEl.textContent = MESSAGES[currentLang].success;

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
          
          const shouldSetupBiometric = confirm(
            `🔒 Enable ${biometricName} for faster login on this device?\n\n` +
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
        statusEl.textContent = data.message || MESSAGES[currentLang].error;
      }
    } catch (err) {
      console.error(err);
      if (statusEl) statusEl.textContent = MESSAGES[currentLang].serverError;
    }
  });

  // Apply current language placeholders on form init
  const currentLang = localStorage.getItem("CLS_Lang") || "en";
  loginPlaceholders(currentLang);
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
