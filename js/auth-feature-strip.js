/**
 * Shared Feature Strip for Auth Pages (Login & Signup)
 * Renders a 3-card feature grid with multilingual support
 */

window.renderAuthFeatureStrip = function (selector) {
  const container = document.querySelector(selector);
  if (!container) return;

  const cards = [
    {
      titleEn: 'GPS Clock-In',
      titleEs: 'Registro GPS',
      titlePt: 'Check-in GPS',
      descEn: 'Track your work hours with automatic location verification',
      descEs: 'Registra tus horas de trabajo con verificación de ubicación automática',
      descPt: 'Acompanhe suas horas de trabalho com verificação automática de localização'
    },
    {
      titleEn: 'Your Schedule',
      titleEs: 'Tu Horario',
      titlePt: 'Seu Horário',
      descEn: 'View upcoming shifts and manage your availability',
      descEs: 'Ver próximos turnos y administrar tu disponibilidad',
      descPt: 'Visualize próximos turnos e gerencie sua disponibilidade'
    },
    {
      titleEn: 'Payments & Documents',
      titleEs: 'Pagos y Documentos',
      titlePt: 'Pagamentos e Documentos',
      descEn: 'Access your pay stubs and manage your W-9 status',
      descEs: 'Accede a tus recibos de nómina y gestiona tu estado W-9',
      descPt: 'Acesse seus contracheques e gerencie seu status W-9'
    }
  ];

  const html = `
    <section class="login-feature-strip" aria-label="Feature highlights">
      ${cards.map(card => `
        <article>
          <h2
            data-en="${card.titleEn}"
            data-es="${card.titleEs}"
            data-pt="${card.titlePt}"
          >${card.titleEn}</h2>
          <p
            data-en="${card.descEn}"
            data-es="${card.descEs}"
            data-pt="${card.descPt}"
          >${card.descEn}</p>
        </article>
      `).join('')}
    </section>
  `;

  container.innerHTML = html;
};

// Auto-render if container exists
document.addEventListener('DOMContentLoaded', function () {
  window.renderAuthFeatureStrip('#feature-strip-container');
});
