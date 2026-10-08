// Cart · "Tu colección": carrito deslizable con fondo desenfocado (firma NS 4). Se abre solo al sumar una pieza.
// Los totales y los topes de cantidad vienen siempre de la plataforma.
import { $, esc, ir, flecha, icono, atraparFoco } from './util.js';
import { tienda } from '../datos/tienda.js';

const panel = $('#carrito');
const velo = $('#carrito-velo');
let soltarFoco = null;
let volverA = null;

export function abrirCarrito() {
  if (panel.classList.contains('is-open')) return;
  volverA = document.activeElement;
  velo.hidden = false;
  panel.inert = false;
  panel.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => panel.classList.add('is-open'));
  soltarFoco = atraparFoco(panel);
  $('#cerrar-carrito').focus({ preventScroll: true });
}
export function cerrarCarrito() {
  if (!panel.classList.contains('is-open')) return;
  panel.classList.remove('is-open');
  panel.inert = true;
  panel.setAttribute('aria-hidden', 'true');
  velo.hidden = true;
  soltarFoco?.();
  volverA?.focus?.({ preventScroll: true });
}

function linea(l, moneda) {
  // Pieza única (o la última que queda): no se elige cantidad
  const unica = l.maxQuantity === 1;
  return `
    <div class="wk-linea">
      <a class="wk-linea__arte" href="/producto/${esc(l.handle)}" data-link tabindex="-1" aria-hidden="true">
        ${l.image ? `<img src="${esc(l.image.sizes?.['320'] ?? l.image.url)}" alt="" loading="lazy">` : '<span class="wk-arte wk-arte--espera"><span class="wk-arte__glifo"></span></span>'}
      </a>
      <div class="wk-linea__datos">
        <a href="/producto/${esc(l.handle)}" data-link><strong>${esc(l.title)}</strong></a>
        ${l.variantTitle ? `<small>${esc(l.variantTitle)}</small>` : ''}
        ${unica ? '<span class="wk-linea__unica">1 disponible</span>' : `
        <span class="wk-cantidad">
          <button type="button" data-linea="${l.line}" data-cant="${l.quantity - 1}" aria-label="Quitar una unidad de ${esc(l.title)}">−</button>
          <b aria-live="polite">${l.quantity}</b>
          <button type="button" data-linea="${l.line}" data-cant="${l.quantity + 1}" aria-label="Sumar una unidad de ${esc(l.title)}"${l.maxQuantity !== null && l.quantity >= l.maxQuantity ? ' disabled' : ''}>+</button>
        </span>`}
      </div>
      <div class="wk-linea__fin">
        <strong>${tienda.formatear(l.total, moneda)}</strong>
        <button type="button" class="wk-linea__quitar" data-linea="${l.line}" data-cant="0">Quitar<span class="wk-sr"> ${esc(l.title)}</span></button>
      </div>
    </div>`;
}

function pintar(c) {
  const contador = $('#contador');
  if (contador.textContent !== String(c.itemCount)) {
    contador.textContent = c.itemCount;
    contador.toggleAttribute('data-vacio', !c.itemCount);
    contador.classList.remove('is-nuevo');
    void contador.offsetWidth;
    contador.classList.add('is-nuevo');
  }
  $('#carrito-lineas').innerHTML = c.lines.length
    ? c.lines.map((l) => linea(l, c.currency)).join('')
    : `<div class="wk-carrito__vacio"><span class="wk-carrito__ojo">${icono('i-ojo')}</span><p>Tu colección todavía está vacía.</p><a class="wk-enlace" href="/tienda" data-link>Explorar tienda ${flecha}</a></div>`;
  $('#carrito-pie').innerHTML = c.lines.length ? `
    <p class="wk-error" id="carrito-error" role="alert"></p>
    <div class="wk-carrito__total"><span>Subtotal</span><strong>${tienda.formatear(c.subtotal ?? c.total, c.currency)}</strong></div>
    <p class="wk-nota">El envío se calcula en el siguiente paso.</p>
    <button type="button" class="wk-btn wk-btn--ancho" id="continuar">Continuar compra ${flecha}</button>` : '';
}

export async function iniciarCarrito() {
  $('#abrir-carrito').addEventListener('click', abrirCarrito);
  $('#cerrar-carrito').addEventListener('click', cerrarCarrito);
  velo.addEventListener('click', cerrarCarrito);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarCarrito(); });
  panel.addEventListener('click', async (e) => {
    if (e.target.closest('a[data-link]')) { cerrarCarrito(); return; }
    if (e.target.closest('#continuar')) { cerrarCarrito(); ir('/checkout'); return; }
    const b = e.target.closest('[data-linea]');
    if (!b) return;
    try { await tienda.carrito.cambiar(Number(b.dataset.linea), Number(b.dataset.cant)); }
    catch (err) { const aviso = $('#carrito-error'); if (aviso) aviso.textContent = err.message; }
  });
  tienda.carrito.alCambiar(pintar);
  pintar(await tienda.carrito.ver());
}
