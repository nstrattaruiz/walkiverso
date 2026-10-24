// Product Card y Product Grid: la tarjeta de una pieza y la grilla que las ordena.
import { esc, flecha, icono } from './util.js';
import { NOMBRE, precio } from '../datos/modelo.js';
import { corazon } from './favoritos.js';

/** A dónde lleva cada pieza. Los cursos tienen su lugar en la Academia. */
export const hrefPieza = (pz) => (pz.tipo === 'curso' ? '/cursos' : `/producto/${encodeURIComponent(pz.handle)}`);

// Un número estable por pieza (0–1): varía la luz de cada marco de espera sin depender del azar
const tono = (texto) => { let h = 0; for (const c of String(texto)) h = (h * 31 + c.charCodeAt(0)) % 997; return (h / 997).toFixed(3); };

/**
 * La imagen de una pieza. Si el panel todavía no tiene foto, se muestra un marco de espera con la luz de la marca,
 * para que la web se vea completa mientras se cargan las fotos reales.
 */
export function arte(pz, { ancho = 640, sizes = '(max-width: 700px) 50vw, (max-width: 1100px) 33vw, 25vw', img = pz.image, perezosa = true } = {}) {
  if (img) {
    const src = img.sizes?.[String(ancho)] ?? img.url;
    const srcset = img.sizes ? ` srcset="${Object.entries(img.sizes).map(([w, u]) => `${esc(u)} ${w}w`).join(', ')}" sizes="${sizes}"` : '';
    return `<img class="wk-arte" src="${esc(src)}"${srcset} alt="${esc(img.alt || `${pz.name}, ${pz.especieTexto || pz.type}`)}" width="${img.width ?? 800}" height="${img.height ?? 1000}"${perezosa ? ' loading="lazy" decoding="async"' : ' fetchpriority="high"'}>`;
  }
  return `<span class="wk-arte wk-arte--espera" data-tipo="${pz.tipo}" style="--t:${tono(pz.handle ?? pz.name)}" role="img" aria-label="${esc(pz.name)}: imagen pendiente"><span class="wk-arte__glifo"></span></span>`;
}

/** Insignia de la pieza: sale de los datos (isUnique / isWalkiverso), nunca del diseño. */
export function insignia(pz, { conWalkiverso = false } = {}) {
  if (pz.isUnique) return '<span class="wk-insignia">Pieza única</span>';
  if (conWalkiverso && pz.isWalkiverso) return '<span class="wk-insignia wk-insignia--wk">Pieza Walkiverso</span>';
  return '';
}

/** Primeras líneas de la descripción, en texto plano (para las tarjetas grandes). Salta el encabezado "Sobre …:". */
function resumen(pz, largo = 190) {
  const t = pz.description.replace(/<\/(p|li|h\d)>|<br>/gi, '\n').replace(/<[^>]+>/g, '').split('\n').map((x) => x.trim()).filter((x) => x && !/^sobre\b.{0,40}:$/i.test(x)).join(' ');
  return t.length > largo ? `${t.slice(0, t.lastIndexOf(' ', largo))}…` : t;
}

/**
 * Fila de tarjetas que se adapta a la cantidad: con 4 o más, la grilla de siempre; con 3, tres columnas más grandes;
 * con 1 o 2, tarjetas anchas (foto a un lado y texto al otro) que llenan el renglón.
 */
export const fila = (piezas, clase = 'wk-grilla--carril') => `<div class="wk-grilla ${clase}"${piezas.length < 4 ? ` data-n="${piezas.length}"` : ''}>${piezas.map(tarjeta).join('')}</div>`;

/**
 * Agregar al carrito sin entrar a la pieza. Solo cuando se puede comprar directo: disponible, con precio a la vista y
 * sin opciones para elegir (si tiene talles o versiones, se elige en la ficha).
 */
const alCarrito = (pz, solo) => {
  const variantes = pz.crudo?.variants ?? [];
  if (!pz.available || pz.priceHidden || !pz.variantId || variantes.filter((v) => v.available).length > 1) return '';
  return `<button type="button" class="wk-al-carrito" data-al-carrito="${esc(pz.variantId)}" data-cant="${pz.crudo?.multiple > 1 ? pz.crudo.multiple : 1}" aria-label="${esc(`Agregar ${pz.name} al carrito`)}">${icono('i-bag')}<b aria-hidden="true">+</b></button>`;
};

/** Vista rápida (el ojito): la pieza en una ventana, sin salir de la página. Se conecta una vez (js/app.js). */
export function iniciarVistaRapida() {
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-vista]');
    if (!b) return;
    e.preventDefault();
    const [{ catalogo }, { abrirModal }] = await Promise.all([import('../datos/modelo.js'), import('./piezas.js')]);
    const pz = (await catalogo()).find((x) => x.handle === b.dataset.vista);
    if (!pz) return;
    const n = NOMBRE[pz.tipo];
    abrirModal(`<div class="wk-vista">
      <div class="wk-vista__arte">${arte(pz, { ancho: 640, sizes: '320px' })}</div>
      <div class="wk-vista__info">
        <h2 class="wk-titulo wk-titulo--s">${esc(pz.name)}</h2>
        ${pz.especieTexto || pz.type ? `<p class="wk-card__meta">${esc(pz.especieTexto || pz.type)}</p>` : ''}
        <p class="wk-vista__precio">${pz.available ? precio(pz) : 'Vendida'}</p>
        ${pz.description ? `<p class="wk-vista__texto">${esc(resumen(pz, 260))}</p>` : ''}
        <div class="wk-botones">
          ${alCarrito(pz) ? `<button type="button" class="wk-btn wk-btn--tinta" data-cerrar data-al-carrito="${esc(pz.variantId)}" data-cant="${pz.crudo?.multiple > 1 ? pz.crudo.multiple : 1}">Agregar al carrito</button>` : ''}
          <a class="wk-btn wk-btn--linea" href="${hrefPieza(pz)}" data-link data-cerrar>${n.ver} ${flecha}</a>
        </div>
      </div>
    </div>`, { titulo: pz.name });
  });
}

/** Vista rápida (el ojito): la pieza en una ventana, sin salir de la página. */
const ojito = (pz) => (pz.tipo === 'curso' ? '' : `<button type="button" class="wk-card__ver" data-vista="${esc(pz.handle)}" aria-label="${esc(`Vista rápida de ${pz.name}`)}">${icono('i-ojo-abierto')}</button>`);

export function tarjeta(pz, i = 0) {
  const n = NOMBRE[pz.tipo];
  const meta = [pz.especieTexto, pz.technique].filter(Boolean).map(esc).join('<i aria-hidden="true"> · </i>');
  return `
  <article class="wk-card${pz.available ? '' : ' wk-card--hogar'}" data-handle="${esc(pz.handle)}" data-ver style="--d:${i % 4}">
    <a class="wk-card__enlace" href="${hrefPieza(pz)}" data-link aria-label="${esc(`${n.ver}: ${pz.name}`)}">
      <div class="wk-card__marco">
        ${arte(pz)}
        <span class="wk-card__brillo" aria-hidden="true"></span>
        <div class="wk-card__insignias">${insignia(pz)}${pz.available && pz.promos?.length ? `<span class="wk-insignia wk-insignia--promo" title="${esc(pz.promos[0].name)}">${esc(pz.promos[0].badge)}</span>` : ''}${pz.available ? '' : '<span class="wk-insignia wk-insignia--hogar">Vendida</span>'}</div>
      </div>
      <div class="wk-card__info">
        <h3 class="wk-card__nombre">${esc(pz.name)}</h3>
        ${meta ? `<p class="wk-card__meta">${meta}</p>` : ''}
        ${pz.description ? `<p class="wk-card__resumen">${esc(resumen(pz))}</p>` : ''}
        <div class="wk-card__pie">
          <span class="wk-card__precio">${pz.available ? precio(pz) : '—'}</span>
          <span class="wk-card__cta">${n.ver} ${flecha}</span>
        </div>
      </div>
    </a>
    <div class="wk-card__acciones">${pz.tipo === 'criatura' || pz.tipo === 'artefacto' ? corazon(pz) : ''}${alCarrito(pz)}${ojito(pz)}</div>
  </article>`;
}

export const grilla = (piezas, clase = '') => `<div class="wk-grilla ${clase}">${piezas.map(tarjeta).join('')}</div>`;
