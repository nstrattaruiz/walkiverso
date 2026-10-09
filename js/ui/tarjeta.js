// Product Card y Product Grid: la tarjeta de una pieza y la grilla que las ordena.
import { esc, flecha } from './util.js';
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

export function tarjeta(pz, i = 0) {
  const n = NOMBRE[pz.tipo];
  const meta = [pz.especieTexto, pz.technique].filter(Boolean).map(esc).join('<i aria-hidden="true"> · </i>');
  return `
  <article class="wk-card${pz.available ? '' : ' wk-card--hogar'}" data-handle="${esc(pz.handle)}" data-ver style="--d:${i % 4}">
    <a class="wk-card__enlace" href="${hrefPieza(pz)}" data-link aria-label="${esc(`${n.ver}: ${pz.name}`)}">
      <div class="wk-card__marco">
        ${arte(pz)}
        <span class="wk-card__brillo" aria-hidden="true"></span>
        <div class="wk-card__insignias">${insignia(pz)}${pz.available ? '' : '<span class="wk-insignia wk-insignia--hogar">Ya encontró hogar</span>'}</div>
      </div>
      <div class="wk-card__info">
        <h3 class="wk-card__nombre">${esc(pz.name)}</h3>
        ${meta ? `<p class="wk-card__meta">${meta}</p>` : ''}
        <div class="wk-card__pie">
          <span class="wk-card__precio">${pz.available ? precio(pz) : '—'}</span>
          <span class="wk-card__cta">${n.ver} ${flecha}</span>
        </div>
      </div>
    </a>
    ${pz.tipo === 'criatura' || pz.tipo === 'artefacto' ? corazon(pz) : ''}
  </article>`;
}

export const grilla = (piezas, clase = '') => `<div class="wk-grilla ${clase}">${piezas.map(tarjeta).join('')}</div>`;
