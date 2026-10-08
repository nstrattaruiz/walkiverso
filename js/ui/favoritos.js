// Favoritos: las piezas que el visitante guarda con el corazón. Es una comodidad de cada navegador
// (se guarda en este dispositivo, sin cuenta): la plataforma no tiene lista de deseos.
import { $, $$, app, esc, flecha, icono, titular, rutaWeb } from './util.js';
import { catalogo, porDisponibilidad } from '../datos/modelo.js';
import { grilla } from './tarjeta.js';
import { aparecer } from '../anim/efectos.js';
import { raices } from './piezas.js';

const CLAVE = 'wk-favoritos';
const leer = () => { try { return JSON.parse(localStorage.getItem(CLAVE)) ?? []; } catch { return []; } };
let lista = leer();

export const esFavorito = (handle) => lista.includes(handle);

/** Botón de corazón de una pieza. Va fuera del enlace de la tarjeta: es un control aparte. */
export const corazon = (pz, clase = '') => `<button type="button" class="wk-fav ${clase}" data-fav="${esc(pz.handle)}" aria-pressed="${esFavorito(pz.handle)}" aria-label="${esc(`Guardar ${pz.name} en favoritos`)}">${icono('i-heart')}</button>`;

function pintar() {
  const n = lista.length;
  const cuenta = $('#favoritos-cuenta');
  cuenta.textContent = n;
  cuenta.toggleAttribute('data-vacio', !n);
  $$('[data-fav]').forEach((b) => b.setAttribute('aria-pressed', String(esFavorito(b.dataset.fav))));
}

export function iniciarFavoritos() {
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-fav]');
    if (!b) return;
    e.preventDefault();
    const h = b.dataset.fav;
    lista = esFavorito(h) ? lista.filter((x) => x !== h) : [...lista, h];
    try { localStorage.setItem(CLAVE, JSON.stringify(lista)); } catch { /* sin almacenamiento: dura lo que dure la visita */ }
    pintar();
    if (esFavorito(h)) { b.classList.remove('is-latido'); void b.offsetWidth; b.classList.add('is-latido'); }
    // En la página de favoritos, al quitar una pieza se saca de la lista
    if (rutaWeb() === '/favoritos' && !esFavorito(h)) favoritos();
  });
  // Otra pestaña cambió los favoritos
  window.addEventListener('storage', (e) => { if (e.key === CLAVE) { lista = leer(); pintar(); } });
  pintar();
}

export async function favoritos() {
  titular('Favoritos');
  const todo = await catalogo();
  const piezas = todo.filter((x) => esFavorito(x.handle)).sort(porDisponibilidad);
  app.innerHTML = `
    <section class="wk-blanco wk-pagina wk-seccion wk-con-raices">
      ${raices()}
      <div class="wk-cont">
        <header class="wk-cab wk-cab--centro"><span class="wk-sobre">Tu selección</span><h1 class="wk-titulo">Favoritos</h1>
          <p class="wk-bajada">${piezas.length ? 'Las piezas que guardaste. Se recuerdan en este dispositivo.' : 'Todavía no guardaste ninguna pieza. Tocá el corazón de las que te gusten para encontrarlas acá.'}</p></header>
        ${piezas.length ? grilla(piezas) : `<p class="wk-seccion__mas"><a class="wk-btn wk-btn--tinta" href="/tienda" data-link>Explorar tienda ${flecha}</a></p>`}
      </div>
    </section>`;
  aparecer(app);
  pintar();
}
