/* ============================================
   CLS Multi-language System with Auto-detect
   Shared across all CLS pages
   ============================================ */

// Adjusts font size of navbar links when text width changes
function adjustNavbarFontSize() {
  const navLinks = document.querySelector('.nav-links');
  if (!navLinks) return;

  const links = navLinks.querySelectorAll('a');
  const maxWidth = navLinks.offsetWidth;
  let totalWidth = 0;

  for (const link of links) totalWidth += link.offsetWidth;

  if (totalWidth > maxWidth) {
    const scaleFactor = maxWidth / totalWidth;
    navLinks.style.fontSize = scaleFactor * 0.9 + 'em';
  } else {
    navLinks.style.fontSize = '0.9em';
  }
}

// Switches visible language text sitewide
function switchLanguage(lang) {
  localStorage.setItem("CLS_Lang", lang); // Persist user choice

  document.querySelectorAll("[data-en]").forEach(el => {
    const newText = el.getAttribute(`data-${lang}`) || el.getAttribute("data-en");
    if (newText) el.innerHTML = newText;
  });

  // Highlight active language button if present
  document.querySelectorAll(".language-toggle button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });

  adjustNavbarFontSize();
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  const storedLang = localStorage.getItem("CLS_Lang");
  const browserLang = navigator.language || navigator.userLanguage;
  const detectedLang =
    storedLang ||
    (browserLang.startsWith("es") ? "es" : browserLang.startsWith("pt") ? "pt" : "en");

  switchLanguage(detectedLang);
});
