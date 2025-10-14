const API_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
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
