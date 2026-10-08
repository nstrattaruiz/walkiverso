// Piezas de interfaz reutilizables: modal y preguntas frecuentes.
import { $, esc, icono, atraparFoco } from './util.js';

const modal = $('#modal');
let soltarFoco = null;
let volverA = null;

export function cerrarModal() {
  if (modal.hidden) return;
  modal.hidden = true;
  modal.innerHTML = '';
  soltarFoco?.();
  volverA?.focus?.({ preventScroll: true });
}

/** Abre un modal con el contenido dado. `tema`: wk-papel (claro) o wk-noche. */
export function abrirModal(html, { titulo = '', tema = 'wk-papel' } = {}) {
  volverA = document.activeElement;
  modal.setAttribute('aria-label', titulo);
  modal.innerHTML = `<div class="wk-modal__caja ${tema}"><button type="button" class="wk-cerrar" data-cerrar aria-label="Cerrar">${icono('i-x')}</button>${html}</div>`;
  modal.hidden = false;
  soltarFoco = atraparFoco(modal);
  modal.querySelector('[data-cerrar]').focus({ preventScroll: true });
}
modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('[data-cerrar]')) cerrarModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarModal(); });

/** Raíces de la marca en los dos bordes de una sección, en espejo. Crecen al entrar en pantalla (data-crece). La sección lleva la clase wk-con-raices. */
export const raices = () => '<span class="wk-ramas wk-raiz wk-raiz--izq" data-crece aria-hidden="true"></span><span class="wk-ramas wk-ramas--der wk-raiz wk-raiz--der" data-crece aria-hidden="true"></span>';

/**
 * Acordeón animado: se abre y se cierra deslizándose (alto de 0 a su tamaño), uno por vez.
 * `items`: [{ q, a }] donde `a` es HTML propio (contenido.js) o texto del panel ya escapado.
 * `marca(i)`: lo que va delante de cada pregunta (01, I, ✦…).
 */
export const acordeon = (items, { grupo = 'faq', abierto = -1, marca = (i) => String(i + 1).padStart(2, '0') } = {}) => `<div class="wk-acordeon" data-acordeon>${items.map((f, i) => `
  <div class="wk-acordeon__item${i === abierto ? ' is-abierto' : ''}">
    <h3><button type="button" id="${grupo}-b${i}" aria-expanded="${i === abierto}" aria-controls="${grupo}-p${i}"><span class="wk-acordeon__n">${marca(i)}</span><span>${esc(f.q)}</span><i aria-hidden="true"></i></button></h3>
    <div class="wk-acordeon__panel" id="${grupo}-p${i}" role="region" aria-labelledby="${grupo}-b${i}"${i === abierto ? '' : ' inert'}><div><div class="wk-acordeon__r">${f.a}</div></div></div>
  </div>`).join('')}</div>`;

export const faq = (items, grupo = 'faq') => acordeon(items, { grupo });

document.addEventListener('click', (e) => {
  const boton = e.target.closest('[data-acordeon] button[aria-expanded]');
  if (!boton) return;
  const item = boton.closest('.wk-acordeon__item');
  const abrir = !item.classList.contains('is-abierto');
  [...item.parentElement.children].forEach((otro) => {
    const si = otro === item && abrir;
    otro.classList.toggle('is-abierto', si);
    otro.querySelector('button[aria-expanded]').setAttribute('aria-expanded', String(si));
    otro.querySelector('.wk-acordeon__panel').inert = !si;
  });
});
