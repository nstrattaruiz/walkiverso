// Sección "Magia en movimiento": carrusel de reels del taller. Los videos y portadas se cargan en contenido.js (REELS).
import { $, $$, esc, estado, flecha, icono, reducido } from '../ui/util.js';
import { REELS } from '../contenido.js';
import { raices } from '../ui/piezas.js';

const reel = (r, i) => {
  const listo = r.video || r.enlace;
  return `
  <li class="wk-reel${listo ? '' : ' wk-reel--pronto'}" data-ver style="--d:${i % 4}">
    <button type="button" data-reel="${i}"${listo ? '' : ' disabled'} aria-label="${esc(listo ? `Ver el reel: ${r.titulo}` : `${r.titulo}: muy pronto`)}">
      <span class="wk-reel__medio">${r.poster
        ? `<img src="${esc(r.poster)}" alt="" loading="lazy">`
        : '<span class="wk-reel__espera"><i></i></span>'}</span>
      ${listo ? '<span class="wk-reel__play" aria-hidden="true">▶</span>' : ''}
      <span class="wk-reel__texto"><small>${esc(listo ? r.etiqueta || 'Ver reel' : 'Muy pronto')}</small><strong>${esc(r.titulo)}</strong></span>
    </button>
  </li>`;
};

export const reels = () => {
  if (!REELS.items.length) return '';
  const ig = estado.info.contact?.instagram;
  return `
  <section class="wk-seccion wk-noche wk-isla wk-reels wk-con-raices" id="reels">
    ${raices()}
    <div class="wk-cont">
      <header class="wk-cab wk-cab--centro" data-ver>
        <span class="wk-sobre">${esc(REELS.sobre)}</span>
        <h2 class="wk-titulo">${esc(REELS.titulo)}</h2>
        <p class="wk-bajada">${esc(REELS.texto)}</p>
      </header>
    </div>
    <ul class="wk-reels__pista" id="reels-pista">${REELS.items.map(reel).join('')}</ul>
    <div class="wk-reels__pie" data-ver>
      <button type="button" class="wk-flecha-btn" data-mover="-1" aria-label="Reels anteriores">←</button>
      ${ig ? `<a class="wk-btn wk-btn--linea" href="${esc(ig)}" target="_blank" rel="noopener">${icono('i-ig')}Seguinos en Instagram</a>` : ''}
      <button type="button" class="wk-flecha-btn" data-mover="1" aria-label="Reels siguientes">→</button>
    </div>
  </section>`;
};

export function activarReels() {
  const pista = $('#reels-pista');
  if (!pista) return;
  $$('.wk-reels [data-mover]').forEach((b) => b.addEventListener('click', () => {
    const ancho = pista.querySelector('.wk-reel').offsetWidth + 20;
    pista.scrollBy({ left: Number(b.dataset.mover) * ancho * 2, behavior: reducido() ? 'auto' : 'smooth' });
  }));
  pista.addEventListener('click', (e) => {
    const b = e.target.closest('[data-reel]');
    if (!b) return;
    const r = REELS.items[Number(b.dataset.reel)];
    if (!r.video) { window.open(r.enlace, '_blank', 'noopener'); return; }
    // El video arranca sin sonido (la web no suena sola); los controles permiten activarlo
    b.outerHTML = `<video class="wk-reel__video" src="${esc(r.video)}"${r.poster ? ` poster="${esc(r.poster)}"` : ''} controls autoplay muted playsinline loop aria-label="${esc(r.titulo)}"></video>`;
  });
}
