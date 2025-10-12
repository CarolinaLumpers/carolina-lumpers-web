/* ============================================
   Multi-language system with auto-detect
   Used across all CLS pages
   ============================================ */

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

// Switch visible language text
function switchLanguage(lang) {
  localStorage.setItem("lang", lang); // persist choice
  const elements = document.querySelectorAll("[data-en], [data-es], [data-pt]");
  elements.forEach(el => {
    const text =
      lang === "es" ? el.getAttribute("data-es") :
      lang === "pt" ? el.getAttribute("data-pt") :
      el.getAttribute("data-en");
    if (text) el.innerHTML = text;
  });
  adjustNavbarFontSize();
}

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  const storedLang = localStorage.getItem("lang");
  const userLang = navigator.language || navigator.userLanguage;
  const detectedLang = storedLang || (userLang.startsWith("es") ? "es" : userLang.startsWith("pt") ? "pt" : "en");
  switchLanguage(detectedLang);
  adjustNavbarFontSize();

  // Highlight selected language button if present
  const activeBtn = document.querySelector(`.language-toggle button[data-lang='${detectedLang}']`);
  if (activeBtn) activeBtn.classList.add("active");
});
