const API_URL = "https://script.google.com/macros/s/AKfycbwHBLEQ5QHuhD-O4uI4hRN_5_yS9YsFgtn_dMAdoAO2C7zHLoi3qfHO82vas3Uv0wXXpg/exec";
document.addEventListener("DOMContentLoaded", () => {
  const content = document.getElementById("content");
  const buttons = document.querySelectorAll(".nav-btn");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      loadSection(btn.dataset.section);
    });
  });
  loadSection("workers");
  async function loadSection(section) {
    content.innerHTML = `<p class="loading">Loading ${section}...</p>`;
    try {
      const res = await fetch(`${API_URL}?action=${section}`);
      const data = await res.json();
      renderSection(section, data);
    } catch (err) {
      content.innerHTML = `<p style='color:red;'>❌ Error loading ${section}: ${err.message}</p>`;
    }
  }
  function renderSection(section, data) {
    if (!data || !data.length) {
      content.innerHTML = `<p>No ${section} data found.</p>`;
      return;
    }
    const table = document.createElement("table");
    table.innerHTML = `
      <tr>${Object.keys(data[0]).map(h=>`<th>${h}</th>`).join("")}</tr>
      ${data.map(r=>`<tr>${Object.values(r).map(v=>`<td>${v}</td>`).join("")}</tr>`).join("")}`;
    content.innerHTML = `<h2>${section.toUpperCase()}</h2>`;
    content.appendChild(table);
  }
});

// =========================================
// 📲 PWA INSTALL PROMPT HANDLER
// =========================================
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // Stop Chrome's default mini-infobar
  deferredPrompt = e;

  // Create a button element
  const installBtn = document.createElement('button');
  installBtn.textContent = "📲 Install CLS Admin App";
  installBtn.className = "install-btn";
  installBtn.style.position = "fixed";
  installBtn.style.bottom = "20px";
  installBtn.style.left = "50%";
  installBtn.style.transform = "translateX(-50%)";
  installBtn.style.background = "#ffcc00";
  installBtn.style.color = "#000";
  installBtn.style.padding = "12px 20px";
  installBtn.style.fontSize = "1rem";
  installBtn.style.border = "none";
  installBtn.style.borderRadius = "10px";
  installBtn.style.boxShadow = "0 0 10px rgba(255, 204, 0, 0.4)";
  installBtn.style.cursor = "pointer";
  installBtn.style.zIndex = "1000";
  installBtn.style.transition = "opacity 0.3s";

  // Add to page
  document.body.appendChild(installBtn);

  // Handle click
  installBtn.addEventListener('click', async () => {
    installBtn.disabled = true;
    installBtn.textContent = "Installing...";
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    deferredPrompt = null;
    installBtn.style.opacity = "0";
    setTimeout(() => installBtn.remove(), 500);
  });
});

// Hide the install button if already installed
window.addEventListener('appinstalled', () => {
  console.log('✅ CLS Admin App installed');
  deferredPrompt = null;
  const btn = document.querySelector('.install-btn');
  if (btn) btn.remove();
});
