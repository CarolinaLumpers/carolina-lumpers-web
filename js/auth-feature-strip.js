(function () {
  function renderAuthFeatureStrip(mountId) {
    const mount = document.getElementById(mountId || "authFeatureStripMount");
    if (!mount) return;

    mount.innerHTML = `
      <section class="login-feature-strip" aria-label="Portal features">
        <article>
          <h2 data-en="GPS Clock-In" data-es="Registro de Entrada GPS" data-pt="Registro GPS">GPS Clock-In</h2>
          <p data-en="Clock in from any job site with location verification."
             data-es="Registrate desde cualquier sitio de trabajo con verificacion de ubicacion."
             data-pt="Registre entrada em qualquer canteiro com verificacao de localizacao.">
            Clock in from any job site with location verification.
          </p>
        </article>
        <article>
          <h2 data-en="Your Schedule" data-es="Tu Horario" data-pt="Seu Horario">Your Schedule</h2>
          <p data-en="View your upcoming shifts, hours, and assignments."
             data-es="Consulta tus turnos, horas y asignaciones."
             data-pt="Veja seus turnos, horas e atribuicoes.">
            View your upcoming shifts, hours, and assignments.
          </p>
        </article>
        <article>
          <h2 data-en="Payroll Access" data-es="Acceso a Nomina" data-pt="Acesso a Folha">Payroll Access</h2>
          <p data-en="Track your earnings and download pay summaries."
             data-es="Consulta tus ganancias y descarga resumenes de pago."
             data-pt="Acompanhe seus ganhos e baixe resumos de pagamento.">
            Track your earnings and download pay summaries.
          </p>
        </article>
      </section>
    `;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      renderAuthFeatureStrip("authFeatureStripMount");
    });
  } else {
    renderAuthFeatureStrip("authFeatureStripMount");
  }
})();
