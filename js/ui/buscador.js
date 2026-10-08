// Buscador global: encuentra por nombre, especie, tipo o categoría ("mandrágora", "troll", "artefacto").
import { $, esc, ir, flecha, icono, atraparFoco } from './util.js';
import { catalogo, buscar, precio, porDisponibilidad } from '../datos/modelo.js';
import { arte, hrefPieza } from './tarjeta.js';

const caja = $('#buscador');
const SUGERENCIAS = ['Mandrágora', 'Troll', 'Duende', 'Artefacto', 'Pieza única'];
let soltarFoco = null;
let volverA = null;

function resultados(lista, texto) {
  if (!texto.trim()) {
    return `<p class="wk-buscador__ayuda">Probá con</p><div class="wk-chips">${SUGERENCIAS.map((s) => `<button type="button" class="wk-chip" data-sugerencia="${esc(s)}">${esc(s)}</button>`).join('')}</div>`;
  }
  const hallados = buscar(lista, texto).sort(porDisponibilidad);
  if (!hallados.length) return `<p class="wk-buscador__ayuda">No encontramos nada con “${esc(texto)}”. Probá con una especie o mirá <a href="/tienda" data-link>toda la tienda</a>.</p>`;
  return `
    <ul class="wk-buscador__lista">${hallados.slice(0, 6).map((pz) => `
      <li><a href="${hrefPieza(pz)}" data-link>
        <span class="wk-buscador__arte">${arte(pz, { ancho: 320, sizes: '64px' })}</span>
        <span><strong>${esc(pz.name)}</strong><small>${esc([pz.type, pz.species, pz.isUnique ? 'Pieza única' : ''].filter(Boolean).join(' · '))}</small></span>
        <em>${pz.available ? precio(pz) : 'Ya encontró hogar'}</em>
      </a></li>`).join('')}</ul>
    ${hallados.length > 6 ? `<a class="wk-enlace" href="/tienda?q=${encodeURIComponent(texto)}" data-link>Ver los ${hallados.length} resultados ${flecha}</a>` : ''}`;
}

export function cerrarBuscador() {
  if (caja.hidden) return;
  caja.hidden = true;
  document.documentElement.classList.remove('wk-buscando');
  soltarFoco?.();
  volverA?.focus?.({ preventScroll: true });
}

export async function abrirBuscador() {
  volverA = document.activeElement;
  caja.innerHTML = `
    <div class="wk-buscador__panel wk-noche">
      <form class="wk-buscador__form" role="search">
        ${icono('i-lupa')}
        <label class="wk-sr" for="buscar">Buscar en Walkiverso</label>
        <input id="buscar" name="q" type="search" placeholder="¿Qué criatura estás buscando?" autocomplete="off" enterkeyhint="search">
        <button type="button" class="wk-cerrar" data-cerrar aria-label="Cerrar buscador">${icono('i-x')}</button>
      </form>
      <div class="wk-buscador__resultados" id="buscar-resultados" aria-live="polite"></div>
    </div>`;
  caja.hidden = false;
  document.documentElement.classList.add('wk-buscando');
  soltarFoco = atraparFoco(caja);
  const campo = $('#buscar');
  const salida = $('#buscar-resultados');
  campo.focus();
  salida.innerHTML = resultados([], '');
  const lista = await catalogo().catch(() => []);
  const pintar = () => { salida.innerHTML = resultados(lista, campo.value); };
  campo.addEventListener('input', pintar);
  caja.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!campo.value.trim()) return;
    cerrarBuscador();
    ir(`/tienda?q=${encodeURIComponent(campo.value.trim())}`);
  });
  salida.addEventListener('click', (e) => {
    const s = e.target.closest('[data-sugerencia]');
    if (s) { campo.value = s.dataset.sugerencia; campo.focus(); pintar(); }
  });
}

export function iniciarBuscador() {
  $('#abrir-buscador').addEventListener('click', abrirBuscador);
  caja.addEventListener('click', (e) => {
    // Se cierra tocando fuera del panel, en la X o al elegir un resultado
    if (e.target === caja || e.target.closest('[data-cerrar]') || e.target.closest('a[data-link]')) cerrarBuscador();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarBuscador();
    // Atajo: "/" abre el buscador si no se está escribiendo en otro lado
    if (e.key === '/' && caja.hidden && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? '')) { e.preventDefault(); abrirBuscador(); }
  });
}
